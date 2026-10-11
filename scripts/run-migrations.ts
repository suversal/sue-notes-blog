// 生产环境的 migrate 容器用这个脚本执行迁移。
// 直接调用 `payload migrate` 在生产镜像里会不输出任何内容、以 0 退出却什么都没执行（2026-10-12 部署时发现），
// 所以这里改为调用同一个迁移方法，并在结束后核对每个迁移都已记录，缺一个就以非 0 退出，让 web 不启动。
import { getPayload, readMigrationFiles } from 'payload';

process.env.PAYLOAD_MIGRATING = 'true';
const { default: config } = await import('../src/payload.config.js');
const payload = await getPayload({ config, disableOnInit: true });

try {
  await payload.db.migrate();
  const files = await readMigrationFiles({ payload });
  const recorded = await payload.find({ collection: 'payload-migrations', limit: 0 });
  const done = new Set(recorded.docs.map((migration) => migration.name));
  const missing = files.map((file) => file.name).filter((name) => !done.has(name));
  if (missing.length > 0) throw new Error(`以下迁移没有执行：${missing.join('、')}`);
  console.log(`迁移完成，共 ${files.length} 个，均已记录。`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await payload.destroy();
  process.exit(process.exitCode ?? 0);
}
