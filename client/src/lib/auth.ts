const API_BASE = import.meta.env.VITE_API_BASE || "";

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Session {
  user: User;
  session: {
    id: string;
    userId: string;
  };
}

export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<{ user: User }> {
  const res = await fetch(`${API_BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, name: name || email.split("@")[0] }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || "Sign up failed");
  }

  return res.json();
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User }> {
  const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || "Sign in failed");
  }

  return res.json();
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: "POST",
    credentials: "include",
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/get-session`, {
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data || null;
  } catch {
    return null;
  }
}
