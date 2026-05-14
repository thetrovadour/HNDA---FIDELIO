import { PrismaClient, User, Wallet } from '@prisma/client';

export class UserService {
  constructor(private db: PrismaClient) {}

  async createUser(data: { username: string; full_name: string; email: string; phone?: string }): Promise<User> {
    return this.db.user.create({ data });
  }

  async getUser(id: string): Promise<(User & { wallet: Wallet | null }) | null> {
    return this.db.user.findUnique({ where: { id }, include: { wallet: true } });
  }

  async updateUser(id: string, data: { full_name?: string; email?: string; phone?: string }): Promise<User> {
    return this.db.user.update({ where: { id }, data });
  }

  async createWallet(user_id: string, address: string, private_key_encrypted?: string): Promise<Wallet> {
    return this.db.wallet.create({ data: { user_id, address, private_key_encrypted } });
  }
}
