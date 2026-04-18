"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Minter = void 0;
const ethers_1 = require("ethers");
const MINT_ABI = ['function mint(address to, uint256 amount)'];
class Minter {
    constructor(contract) {
        this.contract = contract;
    }
    static createFromEnv() {
        const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
        const privateKey = process.env.PRIVATE_KEY;
        const contractAddress = process.env.CONTRACT_ADDRESS;
        if (!rpcUrl || !privateKey || !contractAddress) {
            return null;
        }
        const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
        const contract = new ethers_1.ethers.Contract(contractAddress, MINT_ABI, wallet);
        return new Minter(contract);
    }
    async mint(event) {
        try {
            const amountCATR = ethers_1.ethers.parseUnits(event.amount_lempiras.toString(), 18);
            const tx = await this.contract.mint(event.client_wallet, amountCATR);
            const receipt = await tx.wait();
            const tx_hash = tx.hash ?? receipt?.hash ?? '';
            return { success: true, tx_hash };
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            return { success: false, reason };
        }
    }
}
exports.Minter = Minter;
