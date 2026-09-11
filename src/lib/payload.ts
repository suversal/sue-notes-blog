import { getPayload } from 'payload';

export async function getPayloadConfig() {
  const { default: config } = await import('../payload.config');
  return config;
}

/** 延迟加载配置，避免 Next 构建阶段连接数据库。 */
export async function getPayloadClient() {
  const config = await getPayloadConfig();
  return getPayload({ config });
}
