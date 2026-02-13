import Database, { type Database as DatabaseType } from "better-sqlite3";

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

export class SqliteStorage {
  private db: DatabaseType;

  constructor(dbPath: string = "./sqlite.db") {
    this.db = new Database(dbPath);
    this.db.pragma("foreign_keys = ON");
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS message (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (conversationId) REFERENCES conversation(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        userId TEXT PRIMARY KEY,
        ouraToken TEXT,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS message_conversationId_idx ON message(conversationId);
      CREATE INDEX IF NOT EXISTS conversation_userId_idx ON conversation(userId);
    `);
  }

  createConversation(input: CreateConversationInput): Conversation {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const title = input.title ?? null;

    this.db
      .prepare(
        "INSERT INTO conversation (id, userId, title, createdAt) VALUES (?, ?, ?, ?)"
      )
      .run(id, input.userId, title, createdAt);

    return {
      id,
      userId: input.userId,
      createdAt,
      title: title ?? undefined,
      messages: [],
    };
  }

  getConversation(conversationId: string): Conversation | null {
    const row = this.db
      .prepare(
        "SELECT id, userId, title, createdAt FROM conversation WHERE id = ?"
      )
      .get(conversationId) as
      | { id: string; userId: string; title: string | null; createdAt: string }
      | undefined;

    if (!row) return null;

    const messages = this.db
      .prepare(
        "SELECT id, role, content, createdAt FROM message WHERE conversationId = ? ORDER BY createdAt ASC"
      )
      .all(conversationId) as Message[];

    return {
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      title: row.title ?? undefined,
      messages,
    };
  }

  getConversations(userId: string): Conversation[] {
    const rows = this.db
      .prepare(
        "SELECT id, userId, title, createdAt FROM conversation WHERE userId = ? ORDER BY createdAt DESC"
      )
      .all(userId) as {
      id: string;
      userId: string;
      title: string | null;
      createdAt: string;
    }[];

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      title: row.title ?? undefined,
      messages: [],
    }));
  }

  addMessage(conversationId: string, message: CreateMessageInput): Message {
    const convo = this.db
      .prepare("SELECT id FROM conversation WHERE id = ?")
      .get(conversationId);

    if (!convo) {
      throw new NotFoundError(`Conversation not found: ${conversationId}`);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        "INSERT INTO message (id, conversationId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)"
      )
      .run(id, conversationId, message.role, message.content, createdAt);

    return { id, role: message.role, content: message.content, createdAt };
  }

  deleteConversation(conversationId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM conversation WHERE id = ?")
      .run(conversationId);
    return result.changes > 0;
  }

  updateConversationTitle(conversationId: string, title: string): boolean {
    const result = this.db
      .prepare("UPDATE conversation SET title = ? WHERE id = ?")
      .run(title, conversationId);
    return result.changes > 0;
  }

  setOuraToken(userId: string, ouraToken: string): void {
    const updatedAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO user_settings (userId, ouraToken, updatedAt)
         VALUES (?, ?, ?)
         ON CONFLICT(userId) DO UPDATE SET ouraToken = ?, updatedAt = ?`
      )
      .run(userId, ouraToken, updatedAt, ouraToken, updatedAt);
  }

  getOuraToken(userId: string): string | null {
    const row = this.db
      .prepare("SELECT ouraToken FROM user_settings WHERE userId = ?")
      .get(userId) as { ouraToken: string | null } | undefined;
    return row?.ouraToken ?? null;
  }
}

// Singleton instance
let storageInstance: SqliteStorage | null = null;

export function getStorage(): SqliteStorage {
  if (!storageInstance) {
    storageInstance = new SqliteStorage();
  }
  return storageInstance;
}
