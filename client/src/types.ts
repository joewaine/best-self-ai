// Shared types used across the client

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  createdAt: string;
  title?: string;
  messages: Message[];
}
