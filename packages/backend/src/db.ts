import { PrismaClient } from '@prisma/client';

// Single PrismaClient instance for the entire process.
// Prisma recommends one instance per process to avoid connection pool exhaustion.
const db = new PrismaClient();

export default db;
