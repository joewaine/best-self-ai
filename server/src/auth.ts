import { betterAuth, BetterAuthOptions } from "better-auth";
import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_PATH || "./sqlite.db";

const authOptions: BetterAuthOptions = {
  baseURL: process.env.AUTH_BASE_URL || "http://localhost:3000",
  trustedOrigins: ["http://localhost:5173", "http://localhost:5174"],
  database: new Database(dbPath),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
};

export const auth = betterAuth(authOptions);

export type Auth = typeof auth;
