import 'dotenv/config';
import { createApp } from './app';
import db from './db';
import { ReconciliationJob } from './jobs/reconciliation';

const PORT = process.env.PORT ?? 3001;
const BRIDGE_URL = process.env.BRIDGE_URL ?? 'http://localhost:3002';

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`FIDELIO backend running on port ${PORT}`);
});

// Daily reconciliation job (08:00 UTC = 02:00 CST Honduras)
const reconciliation = new ReconciliationJob(db, BRIDGE_URL);
reconciliation.schedule();

// Graceful shutdown
process.on('SIGINT', async () => {
  server.close();
  await db.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  server.close();
  await db.$disconnect();
  process.exit(0);
});
