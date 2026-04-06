import { PrismaClient, User, Wallet } from '@prisma/client';

export class UserService {
  constructor(private db: PrismaClient) {}

  async createUser(data: { full_name: string; email: string; phone?: string }): Promise<User> {
    return this.db.user.create({ data });
  }

  async getUser(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async createWallet(user_id: string, address: string): Promise<Wallet> {
    return this.db.wallet.create({ data: { user_id, address } });
  }
}
