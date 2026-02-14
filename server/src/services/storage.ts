// Database layer - stores conversations, messages, and user settings in Supabase

import { supabase } from "../lib/supabase";

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
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

export interface CreateConversationInput {
  userId: string;
  title?: string;
}

export interface CreateMessageInput {
  role: Role;
  content: string;
}

export class NotFoundError extends Error {
  readonly name = "NotFoundError";
  constructor(message: string) {
    super(message);
  }
}

export class SupabaseStorage {
  // Create a new conversation for a user
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const { data, error } = await supabase
      .from("conversation")
      .insert({
        userId: input.userId,
        title: input.title || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      userId: data.userId,
      createdAt: data.createdAt,
      title: data.title ?? undefined,
      messages: [],
    };
  }

  // Get a conversation with all its messages
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const { data: convo, error } = await supabase
      .from("conversation")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (error || !convo) return null;

    const { data: messages } = await supabase
      .from("message")
      .select("*")
      .eq("conversationId", conversationId)
      .order("createdAt", { ascending: true });

    return {
      id: convo.id,
      userId: convo.userId,
      createdAt: convo.createdAt,
      title: convo.title ?? undefined,
      messages: (messages || []).map((m) => ({
        id: m.id,
        role: m.role as Role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  // List all conversations for a user (without messages)
  async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from("conversation")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      title: row.title ?? undefined,
      messages: [],
    }));
  }

  // Add a message to a conversation
  async addMessage(conversationId: string, message: CreateMessageInput): Promise<Message> {
    // Make sure the conversation exists first
    const { data: convo } = await supabase
      .from("conversation")
      .select("id")
      .eq("id", conversationId)
      .single();

    if (!convo) {
      throw new NotFoundError(`Conversation not found: ${conversationId}`);
    }

    const { data, error } = await supabase
      .from("message")
      .insert({
        conversationId,
        role: message.role,
        content: message.content,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      role: data.role as Role,
      content: data.content,
      createdAt: data.createdAt,
    };
  }

  // Delete a conversation and all its messages
  async deleteConversation(conversationId: string): Promise<boolean> {
    const { error } = await supabase
      .from("conversation")
      .delete()
      .eq("id", conversationId);

    return !error;
  }

  // Update the title of a conversation
  async updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    const { error } = await supabase
      .from("conversation")
      .update({ title })
      .eq("id", conversationId);

    return !error;
  }

  // Store a user's Oura personal access token
  async setOuraToken(userId: string, ouraToken: string): Promise<void> {
    const { error } = await supabase
      .from("user_settings")
      .upsert({
        userId,
        ouraToken,
        updatedAt: new Date().toISOString(),
      });

    if (error) throw new Error(error.message);
  }

  // Retrieve a user's Oura token (returns null if not set)
  async getOuraToken(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from("user_settings")
      .select("ouraToken")
      .eq("userId", userId)
      .single();

    return data?.ouraToken ?? null;
  }
}

// Single shared instance
let storageInstance: SupabaseStorage | null = null;

// Get the storage instance (creates one if needed)
export function getStorage(): SupabaseStorage {
  if (!storageInstance) {
    storageInstance = new SupabaseStorage();
  }
  return storageInstance;
}
