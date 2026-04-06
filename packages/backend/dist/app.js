"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const error_handler_1 = require("./middleware/error_handler");
const mint_service_1 = require("./services/mint_service");
const redemption_service_1 = require("./services/redemption_service");
const transaction_service_1 = require("./services/transaction_service");
const user_service_1 = require("./services/user_service");
const reward_service_1 = require("./services/reward_service");
const bridge_events_1 = require("./routes/bridge_events");
const health_1 = require("./routes/health");
const redemptions_1 = require("./routes/redemptions");
const users_1 = require("./routes/users");
const wallets_1 = require("./routes/wallets");
const merchants_1 = require("./routes/merchants");
const transactions_1 = require("./routes/transactions");
const rewards_1 = require("./routes/rewards");
function createApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Services
    const rewardService = new reward_service_1.RewardService(db_1.default);
    const mintService = new mint_service_1.MintService(db_1.default, rewardService);
    const transactionService = new transaction_service_1.TransactionService(db_1.default, rewardService);
    const redemptionService = new redemption_service_1.RedemptionService(db_1.default);
    const userService = new user_service_1.UserService(db_1.default);
    // Routes
    app.use('/health', (0, health_1.healthRouter)());
    app.use('/internal/bridge', auth_1.bridgeAuth, (0, bridge_events_1.bridgeEventsRouter)(mintService));
    app.use('/api/users', (0, users_1.usersRouter)(userService, transactionService));
    app.use('/api/wallets', (0, wallets_1.walletsRouter)(userService));
    app.use('/api/merchants', (0, merchants_1.merchantsRouter)());
    app.use('/api/transactions', (0, transactions_1.transactionsRouter)(transactionService));
    app.use('/api/redemptions', (0, redemptions_1.redemptionsRouter)(redemptionService));
    app.use('/api/rewards', (0, rewards_1.rewardsRouter)());
    // Error handler (last middleware)
    app.use(error_handler_1.errorHandler);
    return app;
}
