import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "";

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

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

export default function Settings() {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Oura token state
  const [ouraToken, setOuraToken] = useState("");
  const [showOuraToken, setShowOuraToken] = useState(false);
  const [hasOuraToken, setHasOuraToken] = useState(false);
  const [ouraError, setOuraError] = useState("");
  const [ouraSuccess, setOuraSuccess] = useState("");
  const [ouraLoading, setOuraLoading] = useState(false);

  // Check if user has Oura token on mount
  useEffect(() => {
    async function checkOuraToken() {
      try {
        const res = await fetch(`${API_BASE}/api/settings/oura-token`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setHasOuraToken(data.hasToken);
        }
      } catch (err) {
        console.error("Failed to check Oura token:", err);
      }
    }
    checkOuraToken();
  }, []);

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to change password");
      }

      setPasswordSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleOuraTokenSave(e: FormEvent) {
    e.preventDefault();
    setOuraError("");
    setOuraSuccess("");

    if (!ouraToken.trim()) {
      setOuraError("Please enter your Oura token");
      return;
    }

    setOuraLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/settings/oura-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ouraToken: ouraToken.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to save Oura token");
      }

      setOuraSuccess("Oura token saved successfully");
      setHasOuraToken(true);
      setOuraToken("");
    } catch (err) {
      setOuraError(err instanceof Error ? err.message : "Failed to save Oura token");
    } finally {
      setOuraLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Header with back link */}
        <div className="mb-6 sm:mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-light">Account Settings</h1>
        </div>

        {/* Password Change Section */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-light mb-3 sm:mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-light mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-light mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-light mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="text-sm text-green-500 bg-green-500/10 p-2 rounded">
                {passwordSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="py-2 px-4 bg-primary text-primary-foreground rounded-lg font-light hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {passwordLoading ? "Saving..." : "Change Password"}
            </button>
          </form>
        </div>

        {/* Oura Token Section */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-light mb-1.5 sm:mb-2">Oura Personal Access Token</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
            {hasOuraToken
              ? "You have an Oura token saved. Enter a new token below to update it."
              : "Connect your Oura Ring to see your health data."}
          </p>
          <form onSubmit={handleOuraTokenSave} className="space-y-4">
            <div>
              <label className="block text-sm font-light mb-1">
                {hasOuraToken ? "New Oura Token" : "Oura Token"}
              </label>
              <div className="relative">
                <input
                  type={showOuraToken ? "text" : "password"}
                  value={ouraToken}
                  onChange={(e) => setOuraToken(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="paste your token here"
                />
                <button
                  type="button"
                  onClick={() => setShowOuraToken(!showOuraToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showOuraToken ? "Hide token" : "Show token"}
                >
                  {showOuraToken ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
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

            {ouraError && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {ouraError}
              </div>
            )}

            {ouraSuccess && (
              <div className="text-sm text-green-500 bg-green-500/10 p-2 rounded">
                {ouraSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={ouraLoading}
              className="py-2 px-4 bg-primary text-primary-foreground rounded-lg font-light hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {ouraLoading ? "Saving..." : hasOuraToken ? "Update Token" : "Save Token"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
