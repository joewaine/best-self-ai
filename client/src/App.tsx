import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import HoldToTalk from "./components/HoldToTalk";
import AuthForms from "./components/AuthForms";
import ConversationSidebar from "./components/ConversationSidebar";
import Settings from "./components/Settings";
import type {
  Conversation,
  Message,
  ConversationSidebarHandle,
} from "./components/ConversationSidebar";
import { getSession, signOut } from "./lib/auth";
import type { User } from "./lib/auth";

// Simple settings gear icon
function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Main app component - handles auth state and routes between login/main views
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>(
    []
  );
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<ConversationSidebarHandle>(null);

  // On mount, check if user already has a valid session (e.g. from cookies)
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

  // Grab user's biological sex from Oura to pick the right color theme
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

  // Called after successful login/signup
  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser);
  };

  // Clear everything and return to login screen
  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setSelectedConversation(null);
    setConversationMessages([]);
  };

  // When user clicks a conversation in the sidebar
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setConversationMessages(conversation.messages);
    setSidebarOpen(false); // close sidebar on mobile
  };

  // Create a fresh conversation via the API
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
      setSidebarOpen(false);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  // Append a new user/assistant message pair to the current conversation
  const handleNewMessage = useCallback(
    (userMsg: Message, assistantMsg: Message) => {
      setConversationMessages((prev) => [...prev, userMsg, assistantMsg]);
    },
    []
  );

  // Called when HoldToTalk creates a new conversation on the fly
  const handleConversationCreated = useCallback(
    (conversationId: string, title: string) => {
      setSelectedConversation({
        id: conversationId,
        userId: user?.id || "",
        title,
        createdAt: new Date().toISOString(),
        messages: [],
      });
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

  const mainContent = (
    <div className={`min-h-screen bg-background ${themeClass}`}>
      {/* Sidebar - hidden on mobile, visible on lg+ */}
      <ConversationSidebar
        ref={sidebarRef}
        selectedId={selectedConversation?.id || null}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content - no margin on mobile, offset on lg+ */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-light truncate">Best Self AI</h1>
              <p className="text-xs lg:text-sm text-muted-foreground truncate">
                {selectedConversation
                  ? selectedConversation.title || "Untitled conversation"
                  : "Hold Space to start talking"}
              </p>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-32">
                {user.email}
              </span>
              <Link
                to="/settings"
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                title="Settings"
              >
                <CogIcon className="w-4 h-4" />
              </Link>
              <button
                onClick={handleLogout}
                className="hidden sm:block text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard */}
        <Dashboard userName={user.name} />

        {/* Voice overlay */}
        <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50">
          <HoldToTalk
            conversationId={selectedConversation?.id || null}
            conversationTitle={selectedConversation?.title}
            conversationMessages={conversationMessages}
            onNewMessage={handleNewMessage}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={mainContent} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
