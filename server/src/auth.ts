import { betterAuth, BetterAuthOptions } from "better-auth";
import { Pool } from "pg";

// Create a connection pool to Supabase Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const trustedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const authOptions: BetterAuthOptions = {
  baseURL: process.env.AUTH_BASE_URL || "http://localhost:3000",
  trustedOrigins,
  database: pool,
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
