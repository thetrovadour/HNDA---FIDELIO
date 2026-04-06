"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Single PrismaClient instance for the entire process.
// Prisma recommends one instance per process to avoid connection pool exhaustion.
const db = new client_1.PrismaClient();
exports.default = db;
