import type { Access } from 'payload';

/** 私有数据只能由所属用户读取或修改。Agent 路由另行完成凭证鉴权后使用本地 API。 */
export const ownerOnly: Access = ({ req }) => {
  if (!req.user) return false;
  return { owner: { equals: req.user.id } };
};

export const signedInOnly: Access = ({ req }) => Boolean(req.user);
