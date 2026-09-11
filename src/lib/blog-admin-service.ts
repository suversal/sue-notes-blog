import { getPayloadClient } from './payload';
import { defaultSiteProfile, relationId, type SiteProfile } from './blog-data';

export const fallbackTopicName = '未分类';

export function normalizeTopicName(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function validateTopicName(value: string) {
  const name = normalizeTopicName(value);
  if (!name || name.length > 20) throw new Error('主题名称需要 1–20 个字。');
  if (name === fallbackTopicName) throw new Error('“未分类”是系统保留主题。');
  return name;
}

export async function ensureFallbackTopic(owner: string) {
  const payload = await getPayloadClient();
  const found = await payload.find({ collection: 'topics', overrideAccess: true, depth: 0, limit: 1, where: { and: [{ owner: { equals: owner } }, { normalizedName: { equals: fallbackTopicName } }] } } as any);
  return found.docs[0] ?? payload.create({ collection: 'topics', overrideAccess: true, data: { owner, name: fallbackTopicName, normalizedName: fallbackTopicName, isSystem: true } } as any);
}

export async function listTopics(owner: string) {
  const payload = await getPayloadClient();
  await ensureFallbackTopic(owner);
  return payload.find({ collection: 'topics', overrideAccess: true, depth: 0, limit: 100, sort: 'createdAt', where: { owner: { equals: owner } } } as any);
}

export async function createTopic(owner: string, input: string) {
  const name = validateTopicName(input); const payload = await getPayloadClient();
  return payload.create({ collection: 'topics', overrideAccess: true, data: { owner, name, normalizedName: name.toLocaleLowerCase('zh-CN'), isSystem: false } } as any);
}

export async function renameTopic(owner: string, topicId: string, input: string) {
  const name = validateTopicName(input); const payload = await getPayloadClient();
  const topic = await payload.findByID({ collection: 'topics', id: topicId, overrideAccess: true, depth: 0 }) as any;
  if (relationId(topic.owner) !== owner || topic.isSystem) throw new Error('系统主题不能改名。');
  return payload.update({ collection: 'topics', id: topicId, overrideAccess: true, data: { name, normalizedName: name.toLocaleLowerCase('zh-CN') } } as any);
}

export async function deleteTopic(owner: string, topicId: string, targetId: string) {
  const payload = await getPayloadClient();
  const [topic, target] = await Promise.all([
    payload.findByID({ collection: 'topics', id: topicId, overrideAccess: true, depth: 0 }) as Promise<any>,
    payload.findByID({ collection: 'topics', id: targetId, overrideAccess: true, depth: 0 }) as Promise<any>,
  ]);
  if (relationId(topic.owner) !== owner || topic.isSystem || relationId(target.owner) !== owner || topicId === targetId) throw new Error('主题迁移目标无效。');
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) throw new Error('无法开始主题迁移事务。');
  const req = { transactionID } as any;
  try {
    await payload.update({ collection: 'articles', overrideAccess: true, where: { and: [{ owner: { equals: owner } }, { topic: { equals: topicId } }] }, data: { topic: targetId }, req } as any);
    await payload.update({ collection: 'article-revisions', overrideAccess: true, where: { and: [{ owner: { equals: owner } }, { topic: { equals: topicId } }] }, data: { topic: targetId }, req } as any);
    await payload.delete({ collection: 'topics', id: topicId, overrideAccess: true, req } as any);
    await payload.db.commitTransaction(transactionID);
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }
}

export async function saveSiteProfile(owner: string, input: SiteProfile) {
  const values = {
    siteName: input.siteName.trim().slice(0, 16), authorName: input.authorName.trim().slice(0, 24),
    tagline: input.tagline.trim().slice(0, 60), authorBio: input.authorBio.trim().slice(0, 250),
  };
  if (Object.values(values).some((value) => !value)) throw new Error('站点设置不能留空。');
  const payload = await getPayloadClient();
  const found = await payload.find({ collection: 'site-settings', overrideAccess: true, depth: 0, limit: 1, where: { owner: { equals: owner } } } as any);
  return found.docs[0]
    ? payload.update({ collection: 'site-settings', id: found.docs[0].id, overrideAccess: true, data: values } as any)
    : payload.create({ collection: 'site-settings', overrideAccess: true, data: { owner, ...defaultSiteProfile, ...values } } as any);
}
