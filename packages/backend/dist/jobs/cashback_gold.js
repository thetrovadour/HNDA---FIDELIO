"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoldCashbackJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
class GoldCashbackJob {
    constructor(rewardService) {
        this.rewardService = rewardService;
    }
    async run() {
        return this.rewardService.processGoldCashbackBatch();
    }
    schedule() {
        node_cron_1.default.schedule('0 * * * *', async () => {
            console.log('[GoldCashbackJob] Processing GOLD cashback batch...');
            try {
                const result = await this.run();
                if (result.processed > 0)
                    console.log('[GoldCashbackJob] Result:', result);
            }
            catch (err) {
                console.error('[GoldCashbackJob] Error:', err);
            }
        });
    }
}
exports.GoldCashbackJob = GoldCashbackJob;
