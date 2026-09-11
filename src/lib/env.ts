import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PAYLOAD_SECRET: z.string().min(32),
  PAYLOAD_SERVER_URL: z.string().url().default('http://127.0.0.1:3100'),
  IMGBED_API_URL: z.string().url().default('https://img.suversal.com/'),
  IMGBED_PUBLIC_BASE_URL: z.string().url().default('https://img.suversal.com/'),
  IMGBED_API_TOKEN: z.string().min(1).optional(),
  IMGBED_UPLOAD_FOLDER: z.string().min(1).default('sue-notes-blog'),
  IMGBED_CHANNEL_NAME: z.string().min(1).default('Tel_Channel'),
});

export function getServerEnv(env: Record<string, string | undefined> = process.env) {
  return serverEnvSchema.parse(env);
}
