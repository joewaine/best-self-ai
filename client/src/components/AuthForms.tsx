import { useState } from "react";
import type { FormEvent } from "react";
import { signIn, signUp } from "../lib/auth";
import type { User } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Blue lotus flower - the app's logo
function LotusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Center petal */}
      <path d="M32 8C32 8 28 20 28 28C28 32 30 36 32 38C34 36 36 32 36 28C36 20 32 8 32 8Z" fill="url(#lotus-grad1)"/>
      {/* Left inner petals */}
      <path d="M24 12C24 12 18 22 17 30C16 35 18 40 22 42C25 39 27 34 27 30C27 22 24 12 24 12Z" fill="url(#lotus-grad2)" opacity="0.9"/>
      <path d="M16 18C16 18 8 28 7 36C6 42 9 48 14 50C18 46 21 40 21 35C21 27 16 18 16 18Z" fill="url(#lotus-grad3)" opacity="0.8"/>
      {/* Right inner petals */}
      <path d="M40 12C40 12 46 22 47 30C48 35 46 40 42 42C39 39 37 34 37 30C37 22 40 12 40 12Z" fill="url(#lotus-grad2)" opacity="0.9"/>
      <path d="M48 18C48 18 56 28 57 36C58 42 55 48 50 50C46 46 43 40 43 35C43 27 48 18 48 18Z" fill="url(#lotus-grad3)" opacity="0.8"/>
      {/* Outer left petal */}
      <path d="M10 26C10 26 2 36 2 44C2 50 6 55 12 56C16 51 18 44 17 39C16 32 10 26 10 26Z" fill="url(#lotus-grad4)" opacity="0.7"/>
      {/* Outer right petal */}
      <path d="M54 26C54 26 62 36 62 44C62 50 58 55 52 56C48 51 46 44 47 39C48 32 54 26 54 26Z" fill="url(#lotus-grad4)" opacity="0.7"/>
      {/* Center dot */}
      <circle cx="32" cy="40" r="3" fill="#0d9488"/>
      {/* Gradients */}
      <defs>
        <linearGradient id="lotus-grad1" x1="32" y1="8" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5eead4"/>
          <stop offset="100%" stopColor="#14b8a6"/>
        </linearGradient>
        <linearGradient id="lotus-grad2" x1="22" y1="12" x2="22" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5eead4"/>
          <stop offset="100%" stopColor="#0d9488"/>
        </linearGradient>
        <linearGradient id="lotus-grad3" x1="16" y1="18" x2="16" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf"/>
          <stop offset="100%" stopColor="#0f766e"/>
        </linearGradient>
        <linearGradient id="lotus-grad4" x1="10" y1="26" x2="10" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#99f6e4"/>
          <stop offset="100%" stopColor="#14b8a6"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// Eye icons for password visibility toggle
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

interface AuthFormsProps {
  onSuccess: (user: User) => void;
}

// Login/signup form - toggles between the two modes
export default function AuthForms({ onSuccess }: AuthFormsProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [ouraToken, setOuraToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle form submit for both login and signup
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { user } = await signUp(email, password, name);

        // If they provided an Oura token during signup, save it right away
        if (ouraToken.trim()) {
          await fetch(`${API_BASE}/api/settings/oura-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ouraToken: ouraToken.trim() }),
          });
        }

        onSuccess(user);
      } else {
        const { user } = await signIn(email, password);
        onSuccess(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col items-center mb-4 sm:mb-6">
            <LotusIcon className="w-16 h-16 sm:w-20 sm:h-20 mb-3" />
            <h1 className="text-xl sm:text-2xl font-light text-center">
              {mode === "signin" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Best Self</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-sm font-light mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-light mb-1">
                    Oura Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={ouraToken}
                    onChange={(e) => setOuraToken(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    placeholder="paste your token here"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get yours at{" "}
                    <a
                      href="https://cloud.ouraring.com/personal-access-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      cloud.ouraring.com
                    </a>
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-light mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-light mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-light hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? "Loading..."
                : mode === "signin"
                ? "Sign In"
                : "Sign Up"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "signin" ? (
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
