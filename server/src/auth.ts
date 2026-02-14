import { betterAuth, BetterAuthOptions } from "better-auth";
import { Pool } from "pg";

// Create a connection pool to Supabase Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Prevent server crash on connection errors
pool.on("error", (err) => {
  console.error("Database pool error:", err.message);
});

const trustedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const isProduction = process.env.NODE_ENV === "production";

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
  advanced: {
    cookiePrefix: "best-self",
    useSecureCookies: isProduction,
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: isProduction ? ".onrender.com" : undefined,
    },
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      httpOnly: true,
      path: "/",
    },
  },
};

export const auth = betterAuth(authOptions);
export type Auth = typeof auth;
