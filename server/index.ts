import { createApp } from "./app";

const app = createApp({ dataDir: process.env.DATA_DIR, logger: true });
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";

if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error(`${port}为无效端口号`);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
