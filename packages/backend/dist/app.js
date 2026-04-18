"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const error_handler_1 = require("./middleware/error_handler");
const mint_service_1 = require("./services/mint_service");
const redemption_service_1 = require("./services/redemption_service");
const transaction_service_1 = require("./services/transaction_service");
const user_service_1 = require("./services/user_service");
const reward_service_1 = require("./services/reward_service");
const cashback_1 = require("./jobs/cashback");
const cashback_gold_1 = require("./jobs/cashback_gold");
const bridge_events_1 = require("./routes/bridge_events");
const health_1 = require("./routes/health");
const redemptions_1 = require("./routes/redemptions");
const users_1 = require("./routes/users");
const wallets_1 = require("./routes/wallets");
const merchants_1 = require("./routes/merchants");
const transactions_1 = require("./routes/transactions");
const rewards_1 = require("./routes/rewards");
const auth_2 = require("./routes/auth");
const admin_1 = require("./routes/admin");
const gca_1 = require("./routes/gca");
const gca_service_1 = require("./services/gca_service");
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
const sensitiveLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});
function createApp() {
    const app = (0, express_1.default)();
    const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());
    app.use((0, cors_1.default)({ origin: (origin, cb) => {
            if (!origin || allowedOrigins.some(o => origin.startsWith(o)))
                return cb(null, true);
            cb(new Error('Not allowed by CORS'));
        } }));
    app.use(express_1.default.json({ limit: '100kb' }));
    app.use(globalLimiter);
    // Services
    const rewardService = new reward_service_1.RewardService(db_1.default);
    const mintService = new mint_service_1.MintService(db_1.default, rewardService);
    const transactionService = new transaction_service_1.TransactionService(db_1.default, rewardService, gca_service_1.evaluateGcaVesting);
    const redemptionService = new redemption_service_1.RedemptionService(db_1.default);
    const userService = new user_service_1.UserService(db_1.default);
    // Jobs
    new cashback_1.CashbackJob(rewardService).schedule();
    new cashback_gold_1.GoldCashbackJob(rewardService).schedule();
    // Routes
    app.use('/health', (0, health_1.healthRouter)());
    app.use('/api/auth', sensitiveLimiter, (0, auth_2.authRouter)());
    app.use('/internal/bridge', sensitiveLimiter, auth_1.bridgeAuth, (0, bridge_events_1.bridgeEventsRouter)(mintService));
    app.use('/api/users', (0, users_1.usersRouter)(userService, transactionService));
    app.use('/api/wallets', (0, wallets_1.walletsRouter)(userService));
    app.use('/api/merchants', (0, merchants_1.merchantsRouter)());
    app.use('/api/transactions', (0, transactions_1.transactionsRouter)(transactionService));
    app.use('/api/redemptions', sensitiveLimiter, (0, redemptions_1.redemptionsRouter)(redemptionService));
    app.use('/api/rewards', sensitiveLimiter, (0, rewards_1.rewardsRouter)(db_1.default));
    app.use('/api/admin', sensitiveLimiter, (0, admin_1.adminRouter)(mintService));
    app.use('/api/gca', (0, gca_1.gcaRouter)(db_1.default));
    // Error handler (last middleware)
    app.use(error_handler_1.errorHandler);
    return app;
}
