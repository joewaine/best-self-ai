import { Message } from "./storage";

type CoachInput = {
  transcript: string;
  ouraContext?: any;
  conversationHistory?: Message[];
  username?: string;
};

/**
 * Generate a short, descriptive title for a conversation based on the first message exchange
 */
export async function generateConversationTitle(
  userMessage: string,
  assistantReply: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 30,
      system:
        "Generate a very short title (2-5 words) for this conversation. No quotes, no punctuation at the end. Just the title.",
      messages: [
        {
          role: "user",
          content: `User said: "${userMessage}"\n\nAssistant replied: "${assistantReply}"\n\nTitle:`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Failed to generate title, using default");
    return "New conversation";
  }

  const data: any = await res.json();
  const title =
    data?.content?.find((b: any) => b.type === "text")?.text?.trim() ||
    "New conversation";

  // Truncate if too long
  return title.length > 50 ? title.slice(0, 47) + "..." : title;
}

export async function callClaudeCoach({
  transcript,
  ouraContext,
  conversationHistory = [],
  username = "friend",
}: CoachInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

  const systemPrompt = `
You are ${username}'s voice coach. Speak in short, audio-friendly sentences.
Use the provided Oura context to give actionable guidance.
No medical advice. If data is missing, say what you assumed.

Oura context (JSON):
${JSON.stringify(ouraContext ?? {}, null, 2)}

If the user says "morning briefing", respond with:
- 1 headline
- sleep score and readiness score
- training recommendation (recover/easy/moderate/hard)
- 2 recovery actions
- 1 nutrition focus
Keep it under 20 seconds.
`.trim();

  // Build messages array with conversation history
  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Add conversation history (skip system messages)
  for (const msg of conversationHistory) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the current user message
  messages.push({ role: "user", content: transcript });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok)
    throw new Error(`Claude error ${res.status}: ${await res.text()}`);

  const data: any = await res.json();
  const text = data?.content?.find((b: any) => b.type === "text")?.text ?? "";
  return String(text).trim();
}
