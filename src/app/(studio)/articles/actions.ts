'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArticleSlugUnavailableError, archiveArticle, createDraft, updateDraft, previewDraft, publishDraft, makePrivate, parseArticlePinPriority, parseArticleSourceUrl, setArticlePinPriority, setArticleSourceUrl } from '../../../lib/article-service';
import { createTopic, deleteTopic, renameTopic, saveSiteProfile } from '../../../lib/blog-admin-service';
import { getPayloadClient } from '../../../lib/payload';
import { parseArticleContent } from '../../../lib/article-content-data';
import { createExploreItem, deleteExploreItem, moveExploreItem, parseExploreItemInput, setExploreItemVisible, updateExploreItem } from '../../../lib/explore-service';
import { createUsesCategory, createUsesItem, deleteUsesCategory, deleteUsesItem, moveUsesCategory, moveUsesItem, parseUsesCategoryInput, parseUsesItemInput, setUsesItemVisible, updateUsesCategory, updateUsesItem } from '../../../lib/uses-service';
import { createFriendLink, deleteFriendLink, moveFriendLink, parseFriendCardInput, parseFriendLinkInput, saveFriendCard, setFriendLinkVisible, updateFriendLink } from '../../../lib/friend-links-service';

async function currentUser() {
  const payload = await getPayloadClient();
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false });
  if (!auth.user) redirect('/login');
  return String(auth.user.id);
}

export async function createDraftFromWeb(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const bodyMarkdown = String(formData.get('bodyMarkdown') ?? '').trim();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  const publicReferenceLabel = String(formData.get('publicReferenceLabel') ?? '').trim();
  const publicReferenceUrl = String(formData.get('publicReferenceUrl') ?? '').trim();
  if (!title || !bodyMarkdown || (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) redirect('/articles?error=draft');

  const owner = await currentUser();
  try {
    await createDraft(owner, {
      title,
      slug,
      bodyMarkdown,
      ...(excerpt ? { excerpt } : {}),
      ...(publicReferenceLabel && /^https?:\/\//.test(publicReferenceUrl) ? { publicReferences: [{ label: publicReferenceLabel, url: publicReferenceUrl }] } : {}),
    });
  } catch {
    redirect('/articles?error=slug');
  }
  redirect('/articles?notice=drafted');
}

export type CreateDraftState = {
  field?: 'content' | 'form' | 'slug' | 'title';
  message: string;
};

function hasPayloadFieldError(error: unknown, field: string) {
  const errors = (error as { data?: { errors?: Array<{ path?: string }> } })?.data?.errors;
  return Array.isArray(errors) && errors.some((item) => item.path === field);
}

export async function createDraftAndEditFromWeb(_state: CreateDraftState, formData: FormData): Promise<CreateDraftState> {
  const title = String(formData.get('title') ?? '').trim(); const slug = String(formData.get('slug') ?? '').trim().toLowerCase(); const excerpt = String(formData.get('excerpt') ?? '').trim(); const topic = String(formData.get('topicId') ?? ''); const coverStyle = String(formData.get('coverStyle') ?? 'none') as 'none' | 'notes' | 'grid' | 'cache';
  if (!title) return { field: 'title', message: '请填写文章标题。' };
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { field: 'slug', message: '文章链接只能包含小写字母、数字和连字符。' };

  let content;
  try {
    content = parseArticleContent(formData.get('content'));
  } catch (error) {
    return { field: 'content', message: error instanceof Error ? error.message : '正文格式无效。' };
  }

  const owner = await currentUser();
  let article;
  try {
    article = await createDraft(owner, { title, slug, content, ...(excerpt ? { excerpt } : {}), ...(topic ? { topic } : {}), coverImage: String(formData.get('coverImage') ?? '').trim(), coverStyle });
  } catch (error) {
    if (error instanceof ArticleSlugUnavailableError || (error as { code?: string }).code === '23505') {
      return { field: 'slug', message: '文章链接已被使用或属于系统保留地址，请换一个。' };
    }
    if (hasPayloadFieldError(error, 'content')) {
      console.error('Create article draft content validation failed', (error as { data?: unknown }).data);
      return { field: 'content', message: '正文还未完成同步，请稍等一秒后重试。' };
    }
    console.error('Create article draft failed', error);
    return { field: 'form', message: '草稿创建失败，请稍后重试；你的输入仍保留在页面中。' };
  }
  redirect(`/articles/${article.id}?notice=created`);
}

export async function updateDraftFromWeb(formData: FormData) {
  const articleId = String(formData.get('articleId') ?? '');
  const result = await saveDraftFromWeb(formData);
  redirect(`/articles/${articleId}?${result.ok ? 'notice=saved' : 'error=edit'}`);
}


export async function saveDraftFromWeb(formData: FormData): Promise<{ ok: boolean; message: string; slug?: string }> {
  const articleId = String(formData.get('articleId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  const tags = String(formData.get('tags') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const topic = String(formData.get('topicId') ?? '').trim();
  const coverStyle = String(formData.get('coverStyle') ?? 'none') as 'none' | 'notes' | 'grid' | 'cache';
  const publicReferenceLabel = String(formData.get('publicReferenceLabel') ?? '').trim();
  const publicReferenceUrl = String(formData.get('publicReferenceUrl') ?? '').trim();
  if (!articleId || !title) return { ok: false, message: '请填写文章标题。' };
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: false, message: '文章链接只能包含小写字母、数字和连字符，也可以留空。' };
  try {
    const content = parseArticleContent(formData.get('content'));
    const saved = await updateDraft(await currentUser(), articleId, { title, slug, content, ...(excerpt ? { excerpt } : {}), ...(tags.length ? { tags } : {}), ...(topic ? { topic } : {}), coverImage: String(formData.get('coverImage') ?? '').trim(), coverStyle, ...(publicReferenceLabel && /^https?:\/\//.test(publicReferenceUrl) ? { publicReferences: [{ label: publicReferenceLabel, url: publicReferenceUrl }] } : {}) }) as { slug?: string };
    return { ok: true, message: '已保存为新版本。', slug: saved.slug };
  } catch { return { ok: false, message: '保存失败，请检查文章链接是否已被使用及正文内容。' }; }
}

export async function preparePublishFromWeb(formData: FormData) {
  const articleId = String(formData.get('articleId') ?? '');
  if (!articleId) redirect('/articles?error=preview');
  const owner = await currentUser();
  let preview: Awaited<ReturnType<typeof previewDraft>>;
  try {
    preview = await previewDraft(owner, articleId);
  } catch {
    redirect('/articles?error=preview');
  }
  redirect(`/articles/${encodeURIComponent(articleId)}/preview?approval=${encodeURIComponent(preview.approvalId)}`);
}

export async function preparePublishForEditor(articleId: string): Promise<{ ok: boolean; message: string; url?: string }> {
  const owner = await currentUser();
  try { const preview = await previewDraft(owner, articleId); return { ok: true, message: '预览已准备。', url: `/articles/${encodeURIComponent(articleId)}/preview?approval=${encodeURIComponent(preview.approvalId)}` }; }
  catch { return { ok: false, message: '无法创建预览，请先保存有效的标题、链接和正文。' }; }
}

export async function publishFromWeb(formData: FormData) {
  const articleId = String(formData.get('articleId') ?? '');
  const approvalId = String(formData.get('approvalId') ?? '');
  if (!articleId || !approvalId) redirect('/articles?error=publish');
  const owner = await currentUser();
  try {
    await publishDraft(owner, articleId, approvalId);
  } catch {
    redirect('/articles?error=publish');
  }
  redirect(`/articles/${encodeURIComponent(articleId)}/preview?notice=published`);
}


export async function createTopicFromWeb(_state: { ok: boolean; message: string }, formData: FormData) {
  const owner = await currentUser();
  try { await createTopic(owner, String(formData.get('name') ?? '')); revalidatePath('/articles', 'layout'); return { ok: true, message: '主题已创建。' }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : '主题创建失败。' }; }
}

export async function renameTopicFromWeb(_state: { ok: boolean; message: string }, formData: FormData) {
  const owner = await currentUser();
  try { await renameTopic(owner, String(formData.get('topicId') ?? ''), String(formData.get('name') ?? '')); revalidatePath('/articles', 'layout'); revalidatePath('/blog', 'layout'); return { ok: true, message: '主题名称已同步更新。' }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : '主题修改失败。' }; }
}

export async function deleteTopicFromWeb(_state: { ok: boolean; message: string }, formData: FormData) {
  const owner = await currentUser();
  try { await deleteTopic(owner, String(formData.get('topicId') ?? ''), String(formData.get('targetId') ?? '')); revalidatePath('/articles', 'layout'); revalidatePath('/blog', 'layout'); return { ok: true, message: '主题已删除，关联文章已迁移。' }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : '主题删除失败。' }; }
}

export async function saveSiteSettingsFromWeb(_state: { ok: boolean; message: string }, formData: FormData) {
  const owner = await currentUser();
  try { await saveSiteProfile(owner, { siteName: String(formData.get('siteName') ?? ''), authorName: String(formData.get('authorName') ?? ''), tagline: String(formData.get('tagline') ?? ''), authorBio: String(formData.get('authorBio') ?? '') }); revalidatePath('/articles', 'layout'); revalidatePath('/blog', 'layout'); return { ok: true, message: '站点设置已保存。' }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : '站点设置保存失败。' }; }
}

export type ExploreActionState = { ok: boolean; message: string };

async function runExploreAction(fallback: string, work: (owner: string) => Promise<unknown>): Promise<ExploreActionState> {
  const owner = await currentUser();
  try {
    await work(owner);
    revalidatePath('/blog/explore');
    return { ok: true, message: '' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : fallback };
  }
}

export async function saveExploreItemFromWeb(_state: ExploreActionState, formData: FormData): Promise<ExploreActionState> {
  const id = String(formData.get('itemId') ?? '');
  return runExploreAction('探索条目保存失败。', async (owner) => {
    const input = parseExploreItemInput({
      kind: formData.get('kind'),
      title: formData.get('title'),
      description: formData.get('description'),
      meta: formData.get('meta'),
      status: formData.get('status'),
      href: formData.get('href'),
      logoUrl: formData.get('logoUrl'),
      relatedLabels: formData.getAll('relatedLabel'),
      relatedHrefs: formData.getAll('relatedHref'),
      isFeatured: formData.get('isFeatured') === 'on',
      highlightStatus: formData.get('highlightStatus') === 'on',
      isVisible: formData.get('isVisible') === 'on',
    });
    if (id) await updateExploreItem(owner, id, input);
    else await createExploreItem(owner, input);
  });
}

export async function deleteExploreItemFromWeb(itemId: string) {
  return runExploreAction('探索条目删除失败。', (owner) => deleteExploreItem(owner, itemId));
}

export async function moveExploreItemFromWeb(itemId: string, direction: -1 | 1) {
  return runExploreAction('探索条目移动失败。', (owner) => moveExploreItem(owner, itemId, direction === -1 ? -1 : 1));
}

export async function setExploreItemVisibleFromWeb(itemId: string, isVisible: boolean) {
  return runExploreAction('探索条目更新失败。', (owner) => setExploreItemVisible(owner, itemId, Boolean(isVisible)));
}

export type UsesActionState = { ok: boolean; message: string };

// 「在用」直接在前台页面上编辑：导航是否显示也取决于条目，所以整个前台布局一起刷新。
function revalidateUses() {
  revalidatePath('/blog', 'layout');
}

async function runUsesAction(fallback: string, work: (owner: string) => Promise<unknown>): Promise<UsesActionState> {
  const owner = await currentUser();
  try {
    await work(owner);
    revalidateUses();
    return { ok: true, message: '' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : fallback };
  }
}

export async function saveUsesCategoryFromWeb(_state: UsesActionState, formData: FormData): Promise<UsesActionState> {
  const id = String(formData.get('categoryId') ?? '');
  return runUsesAction('分类保存失败。', async (owner) => {
    const input = parseUsesCategoryInput({ name: formData.get('name'), subtitle: formData.get('subtitle'), note: formData.get('note') });
    if (id) await updateUsesCategory(owner, id, input);
    else await createUsesCategory(owner, input);
  });
}

export async function saveUsesItemFromWeb(_state: UsesActionState, formData: FormData): Promise<UsesActionState> {
  const id = String(formData.get('itemId') ?? '');
  return runUsesAction('条目保存失败。', async (owner) => {
    const input = parseUsesItemInput({
      categoryId: formData.get('categoryId'),
      title: formData.get('title'),
      tagline: formData.get('tagline'),
      tags: formData.get('tags'),
      description: formData.get('description'),
      status: formData.get('status'),
      href: formData.get('href'),
      ctaLabel: formData.get('ctaLabel'),
      promoNote: formData.get('promoNote'),
      logoUrl: formData.get('logoUrl'),
      relatedLabels: formData.getAll('relatedLabel'),
      relatedHrefs: formData.getAll('relatedHref'),
      isAffiliate: formData.get('isAffiliate') === 'on',
      isVisible: formData.get('isVisible') === 'on',
    });
    if (id) await updateUsesItem(owner, id, input);
    else await createUsesItem(owner, input);
  });
}

export async function deleteUsesCategoryFromWeb(categoryId: string) {
  return runUsesAction('分类删除失败。', (owner) => deleteUsesCategory(owner, categoryId));
}

export async function moveUsesCategoryFromWeb(categoryId: string, direction: -1 | 1) {
  return runUsesAction('分类移动失败。', (owner) => moveUsesCategory(owner, categoryId, direction === -1 ? -1 : 1));
}

export async function deleteUsesItemFromWeb(itemId: string) {
  return runUsesAction('条目删除失败。', (owner) => deleteUsesItem(owner, itemId));
}

export async function moveUsesItemFromWeb(itemId: string, direction: -1 | 1) {
  return runUsesAction('条目移动失败。', (owner) => moveUsesItem(owner, itemId, direction === -1 ? -1 : 1));
}

export async function setUsesItemVisibleFromWeb(itemId: string, isVisible: boolean) {
  return runUsesAction('条目更新失败。', (owner) => setUsesItemVisible(owner, itemId, Boolean(isVisible)));
}

// 「友邻」和「在用」一样在前台页面上编辑，导航入口也取决于有没有公开条目，刷新方式相同。
export async function saveFriendLinkFromWeb(_state: UsesActionState, formData: FormData): Promise<UsesActionState> {
  const id = String(formData.get('friendId') ?? '');
  return runUsesAction('友邻保存失败。', async (owner) => {
    const input = parseFriendLinkInput({
      name: formData.get('name'),
      author: formData.get('author'),
      authorIsX: formData.get('authorIsX') === 'on',
      url: formData.get('url'),
      avatarUrl: formData.get('logoUrl'),
      motto: formData.get('motto'),
      note: formData.get('note'),
      metAt: formData.get('metAt'),
      isVisible: formData.get('isVisible') === 'on',
    });
    if (id) await updateFriendLink(owner, id, input);
    else await createFriendLink(owner, input);
  });
}

export async function saveFriendCardFromWeb(_state: UsesActionState, formData: FormData): Promise<UsesActionState> {
  return runUsesAction('信纸保存失败。', (owner) =>
    saveFriendCard(owner, parseFriendCardInput({ name: formData.get('name'), url: formData.get('url'), avatar: formData.get('avatar'), motto: formData.get('motto') })),
  );
}

export async function deleteFriendLinkFromWeb(friendId: string) {
  return runUsesAction('友邻删除失败。', (owner) => deleteFriendLink(owner, friendId));
}

export async function moveFriendLinkFromWeb(friendId: string, direction: -1 | 1) {
  return runUsesAction('友邻移动失败。', (owner) => moveFriendLink(owner, friendId, direction === -1 ? -1 : 1));
}

export async function setFriendLinkVisibleFromWeb(friendId: string, isVisible: boolean) {
  return runUsesAction('友邻更新失败。', (owner) => setFriendLinkVisible(owner, friendId, Boolean(isVisible)));
}

export async function makePrivateFromWeb(formData: FormData) {
  const articleId = String(formData.get('articleId') ?? '');
  if (!articleId) redirect('/articles?error=private');
  const owner = await currentUser();
  try {
    await makePrivate(owner, articleId);
  } catch {
    redirect('/articles?error=private');
  }
  redirect('/articles?notice=private');
}

export async function setArticlePinPriorityFromWeb(formData: FormData) {
  const articleId = String(formData.get('articleId') ?? '');
  if (!articleId) redirect('/articles?error=pin');
  try {
    const pinPriority = parseArticlePinPriority(formData.get('pinPriority'));
    await setArticlePinPriority(await currentUser(), articleId, pinPriority);
    revalidatePath('/articles');
    revalidatePath('/blog');
  } catch {
    redirect('/articles?error=pin');
  }
  redirect('/articles?notice=pin-updated');
}

export async function setArticleSourceUrlFromWeb(formData: FormData) {
  const articleId = String(formData.get('articleId') ?? '');
  if (!articleId) redirect('/articles?error=source');
  try {
    await setArticleSourceUrl(await currentUser(), articleId, parseArticleSourceUrl(formData.get('sourceUrl')));
    revalidatePath('/articles');
    revalidatePath('/blog', 'layout');
  } catch {
    redirect('/articles?error=source');
  }
  redirect('/articles?notice=source-updated');
}

export async function archiveFromWeb(formData: FormData) {
  const articleId = String(formData.get('articleId') ?? ''); if (!articleId) redirect('/articles?error=archive');
  try { await archiveArticle(await currentUser(), articleId); } catch { redirect('/articles?error=archive'); }
  redirect('/articles?notice=archived');
}
