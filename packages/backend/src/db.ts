import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Single PrismaClient instance for the entire process.
// Prisma recommends one instance per process to avoid connection pool exhaustion.
const db = new PrismaClient({ adapter });

export default db;
