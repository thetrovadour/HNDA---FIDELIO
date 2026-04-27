import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import db from './db';
import { bridgeAuth } from './middleware/auth';
import { errorHandler } from './middleware/error_handler';
import { MintService } from './services/mint_service';
import { RedemptionService } from './services/redemption_service';
import { TransactionService } from './services/transaction_service';
import { UserService } from './services/user_service';
import { RewardService } from './services/reward_service';
import { CashbackJob } from './jobs/cashback';
import { GoldCashbackJob } from './jobs/cashback_gold';
import { bridgeEventsRouter } from './routes/bridge_events';
import { healthRouter } from './routes/health';
import { redemptionsRouter } from './routes/redemptions';
import { usersRouter } from './routes/users';
import { walletsRouter } from './routes/wallets';
import { merchantsRouter } from './routes/merchants';
import { transactionsRouter } from './routes/transactions';
import { rewardsRouter } from './routes/rewards';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { gcaRouter } from './routes/gca';
import { evaluateGcaVesting } from './services/gca_service';

const isDev = process.env.NODE_ENV !== 'production';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp(): express.Application {
  const app = express();
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use(globalLimiter);

  // Services
  const rewardService = new RewardService(db);
  const mintService = new MintService(db, rewardService);
  const transactionService = new TransactionService(db, rewardService, evaluateGcaVesting);
  const redemptionService = new RedemptionService(db);
  const userService = new UserService(db);

  // Jobs
  new CashbackJob(rewardService).schedule();
  new GoldCashbackJob(rewardService).schedule();

  // Routes
  app.use('/health', healthRouter());
  app.use('/api/auth', sensitiveLimiter, authRouter());
  app.use('/internal/bridge', sensitiveLimiter, bridgeAuth, bridgeEventsRouter(mintService, redemptionService));
  app.use('/api/users', usersRouter(userService, transactionService));
  app.use('/api/wallets', walletsRouter(userService));
  app.use('/api/merchants', merchantsRouter(redemptionService));
  app.use('/api/transactions', transactionsRouter(transactionService));
  app.use('/api/redemptions', sensitiveLimiter, redemptionsRouter(redemptionService));
  app.use('/api/rewards', sensitiveLimiter, rewardsRouter(db));
  app.use('/api/admin', sensitiveLimiter, adminRouter(mintService));
  app.use('/api/gca', gcaRouter(db));

  // Error handler (last middleware)
  app.use(errorHandler);

  return app;
}
