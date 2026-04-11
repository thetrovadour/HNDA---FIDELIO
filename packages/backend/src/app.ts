import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import db from './db';
import { bridgeAuth } from './middleware/auth';
import { errorHandler } from './middleware/error_handler';
import { MintService } from './services/mint_service';
import { RedemptionService } from './services/redemption_service';
import { TransactionService } from './services/transaction_service';
import { UserService } from './services/user_service';
import { RewardService } from './services/reward_service';
import { bridgeEventsRouter } from './routes/bridge_events';
import { healthRouter } from './routes/health';
import { redemptionsRouter } from './routes/redemptions';
import { usersRouter } from './routes/users';
import { walletsRouter } from './routes/wallets';
import { merchantsRouter } from './routes/merchants';
import { transactionsRouter } from './routes/transactions';
import { rewardsRouter } from './routes/rewards';
import { authRouter } from './routes/auth';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp(): express.Application {
  const app = express();
  app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(globalLimiter);

  // Services
  const rewardService = new RewardService(db);
  const mintService = new MintService(db, rewardService);
  const transactionService = new TransactionService(db, rewardService);
  const redemptionService = new RedemptionService(db);
  const userService = new UserService(db);

  // Routes
  app.use('/health', healthRouter());
  app.use('/api/auth', sensitiveLimiter, authRouter());
  app.use('/internal/bridge', sensitiveLimiter, bridgeAuth, bridgeEventsRouter(mintService));
  app.use('/api/users', usersRouter(userService, transactionService));
  app.use('/api/wallets', walletsRouter(userService));
  app.use('/api/merchants', merchantsRouter());
  app.use('/api/transactions', transactionsRouter(transactionService));
  app.use('/api/redemptions', sensitiveLimiter, redemptionsRouter(redemptionService));
  app.use('/api/rewards', sensitiveLimiter, rewardsRouter());

  // Error handler (last middleware)
  app.use(errorHandler);

  return app;
}
