"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashbackJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
class CashbackJob {
    constructor(rewardService) {
        this.rewardService = rewardService;
    }
    async run() {
        return this.rewardService.processCashbackBatch();
    }
    schedule() {
        node_cron_1.default.schedule('0 */12 * * *', async () => {
            console.log('[CashbackJob] Processing cashback batch...');
            try {
                const result = await this.run();
                console.log('[CashbackJob] Result:', result);
            }
            catch (err) {
                console.error('[CashbackJob] Error:', err);
            }
        });
    }
}
exports.CashbackJob = CashbackJob;
