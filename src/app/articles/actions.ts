'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArticleSlugUnavailableError, archiveArticle, createDraft, updateDraft, previewDraft, publishDraft, makePrivate } from '../../lib/article-service';
import { createTopic, deleteTopic, renameTopic, saveSiteProfile } from '../../lib/blog-admin-service';
import { getPayloadClient } from '../../lib/payload';
import { parseArticleContent } from '../../lib/article-content-data';

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
  if (!title || !bodyMarkdown || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) redirect('/articles?error=draft');

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
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { field: 'slug', message: '文章链接只能包含小写字母、数字和连字符。' };

  let content;
  try {
    content = parseArticleContent(formData.get('content'));
  } catch (error) {
    return { field: 'content', message: error instanceof Error ? error.message : '正文格式无效。' };
  }

  const owner = await currentUser();
  let article;
  try {
    article = await createDraft(owner, { title, slug, content, ...(excerpt ? { excerpt } : {}), ...(topic ? { topic } : {}), coverStyle });
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


export async function saveDraftFromWeb(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const articleId = String(formData.get('articleId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  const tags = String(formData.get('tags') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const topic = String(formData.get('topicId') ?? '').trim();
  const coverStyle = String(formData.get('coverStyle') ?? 'none') as 'none' | 'notes' | 'grid' | 'cache';
  const publicReferenceLabel = String(formData.get('publicReferenceLabel') ?? '').trim();
  const publicReferenceUrl = String(formData.get('publicReferenceUrl') ?? '').trim();
  if (!articleId || !title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: false, message: '请填写标题、公开地址和正文。' };
  try {
    const content = parseArticleContent(formData.get('content'));
    await updateDraft(await currentUser(), articleId, { title, slug, content, ...(excerpt ? { excerpt } : {}), ...(tags.length ? { tags } : {}), ...(topic ? { topic } : {}), coverStyle, ...(publicReferenceLabel && /^https?:\/\//.test(publicReferenceUrl) ? { publicReferences: [{ label: publicReferenceLabel, url: publicReferenceUrl }] } : {}) });
  } catch { return { ok: false, message: '保存失败，请检查标题、公开地址和正文。' }; }
  return { ok: true, message: '已保存为新版本。' };
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

export async function archiveFromWeb(formData: FormData) {
  const articleId = String(formData.get('articleId') ?? ''); if (!articleId) redirect('/articles?error=archive');
  try { await archiveArticle(await currentUser(), articleId); } catch { redirect('/articles?error=archive'); }
  redirect('/articles?notice=archived');
}
