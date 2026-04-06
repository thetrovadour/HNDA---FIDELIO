"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
class UserService {
    constructor(db) {
        this.db = db;
    }
    async createUser(data) {
        return this.db.user.create({ data });
    }
    async getUser(id) {
        return this.db.user.findUnique({ where: { id } });
    }
    async createWallet(user_id, address) {
        return this.db.wallet.create({ data: { user_id, address } });
    }
}
exports.UserService = UserService;
