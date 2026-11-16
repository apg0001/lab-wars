import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp, defaultConfig } from './app.ts';
import { Store } from './db.ts';

const secret = process.env.MW_SECRET ?? '';
if (secret.length < 32) {
  console.error('MW_SECRET 환경 변수(32자 이상)가 필요합니다.');
  process.exit(1);
}
const dbPath = process.env.MW_DB ?? './data/lab-wars.db';
mkdirSync(dirname(dbPath), { recursive: true });
const store = new Store(dbPath);

const cfg = defaultConfig(secret);
if (process.env.MW_ORIGINS) cfg.allowedOrigins = process.env.MW_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
cfg.trustProxy = process.env.MW_TRUST_PROXY === '1';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';
const server = createServer(createApp(store, cfg));
server.listen(port, host, () => console.log(`lab-wars server on ${host}:${port}, origins=${cfg.allowedOrigins.join(',')}`));

// 만료된 갱신 토큰을 하루에 한 번 정리한다.
setInterval(() => store.pruneRefresh(Date.now()), 24 * 3600 * 1000).unref();

const stop = (): void => {
  server.close(() => {
    store.close();
    process.exit(0);
  });
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
