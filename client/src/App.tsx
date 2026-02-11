import { useState, useEffect, useRef, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import HoldToTalk from "./components/HoldToTalk";
import AuthForms from "./components/AuthForms";
import ConversationSidebar from "./components/ConversationSidebar";
import type {
  Conversation,
  Message,
  ConversationSidebarHandle,
} from "./components/ConversationSidebar";
import { getSession, signOut } from "./lib/auth";
import type { User } from "./lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>(
    []
  );
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female" | null>(null);
  const sidebarRef = useRef<ConversationSidebarHandle>(null);

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      const session = await getSession();
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    }
    checkSession();
  }, []);

  // Fetch biological sex for theme when user logs in
  useEffect(() => {
    if (!user) {
      setBiologicalSex(null);
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch(`${API_BASE}/api/settings/profile`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setBiologicalSex(data.biologicalSex);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    }
    fetchProfile();
  }, [user]);

  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setSelectedConversation(null);
    setConversationMessages([]);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setConversationMessages(conversation.messages);
  };

  const handleNewConversation = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "New conversation" }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      const newConvo = await res.json();
      setSelectedConversation(newConvo);
      setConversationMessages([]);
      sidebarRef.current?.refresh();
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const handleNewMessage = useCallback(
    (userMsg: Message, assistantMsg: Message) => {
      setConversationMessages((prev) => [...prev, userMsg, assistantMsg]);
    },
    []
  );

  const handleConversationCreated = useCallback(
    (conversationId: string, title: string) => {
      // Update selected conversation
      setSelectedConversation({
        id: conversationId,
        userId: user?.id || "",
        title,
        createdAt: new Date().toISOString(),
        messages: [],
      });
      // Refresh the sidebar to show the new conversation
      sidebarRef.current?.refresh();
    },
    [user?.id]
  );

  const themeClass = biologicalSex === "male" ? "theme-male" : biologicalSex === "female" ? "theme-female" : "";

  // Apply theme class to body so CSS variables cascade to all elements
  useEffect(() => {
    document.body.classList.remove("theme-male", "theme-female");
    if (themeClass) {
      document.body.classList.add(themeClass);
    }
  }, [themeClass]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-background ${themeClass}`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForms onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={`min-h-screen bg-background ${themeClass}`}>
      {/* Sidebar */}
      <ConversationSidebar
        ref={sidebarRef}
        selectedId={selectedConversation?.id || null}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
      />

      {/* Main content - offset for sidebar */}
      <div className="ml-64">
        {/* Header */}
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Best Self AI</h1>
            <p className="text-sm text-muted-foreground">
              {selectedConversation
                ? selectedConversation.title || "Untitled conversation"
                : "Hold Space to start talking"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Dashboard */}
        <Dashboard userName={user.name} />

        {/* Voice overlay */}
        <div className="fixed bottom-6 right-6">
          <HoldToTalk
            conversationId={selectedConversation?.id || null}
            conversationMessages={conversationMessages}
            onNewMessage={handleNewMessage}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </div>
  );
}
