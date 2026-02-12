import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { Message, Conversation } from "../types";

export type { Message, Conversation };

const API_BASE = import.meta.env.VITE_API_BASE || "";

interface ConversationSidebarProps {
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNew: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export interface ConversationSidebarHandle {
  refresh: () => Promise<void>;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ConversationSidebar = forwardRef<
  ConversationSidebarHandle,
  ConversationSidebarProps
>(function ConversationSidebar({ selectedId, onSelect, onNew, isOpen = false, onClose }, ref) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/conversations`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = await res.json();
      setConversations(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: fetchConversations,
  }));

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSelect = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load conversation");
      const conversation = await res.json();
      onSelect(conversation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) {
        onNew();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-light text-lg">Conversations</h2>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded hover:bg-muted transition-colors"
          aria-label="Close sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* New button */}
      <div className="p-3 border-b border-border">
        <button
          onClick={onNew}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-light hover:bg-primary/90 transition-colors"
        >
          + New Conversation
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10">
          {error}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-muted-foreground text-sm">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-muted-foreground text-sm">
            No conversations yet
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelect(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(c.id);
                  }
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors group cursor-pointer ${
                  selectedId === c.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-light truncate text-sm">
                    {c.title || "Untitled"}
                  </span>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {timeAgo(c.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - slide in on mobile, fixed on desktop */}
      <div
        className={`
          fixed top-0 left-0 h-full w-72 sm:w-80 lg:w-64 bg-card border-r border-border flex flex-col z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {sidebarContent}
      </div>
    </>
  );
});

export default ConversationSidebar;
