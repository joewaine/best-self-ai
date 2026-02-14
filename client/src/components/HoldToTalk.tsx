// Voice chat overlay - hold spacebar to record (desktop), tap to record (mobile)

import { useCallback, useRef, useState, useEffect } from "react";
import { useHoldToTalk } from "../hooks/useHoldToTalk";
import { useTapToTalk } from "../hooks/useTapToTalk";
import { cn } from "../lib/utils";
import type { Message } from "../types";

// Simple mobile detection - checks for touch capability and screen size
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const hasTouchScreen =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouchScreen && isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Which ElevenLabs voice to use for responses
// Options: rachel, drew, clyde, paul, domi, dave, fin, sarah, antoni, josh, arnold, adam, sam
const VOICE = "rachel";

interface HoldToTalkProps {
  conversationId: string | null;
  conversationMessages: Message[];
  onNewMessage: (userMsg: Message, assistantMsg: Message) => void;
  onConversationCreated?: (conversationId: string, title: string) => void;
}

export default function HoldToTalk({
  conversationId,
  conversationMessages,
  onNewMessage,
  onConversationCreated,
}: HoldToTalkProps) {
  const [status, setStatus] = useState<
    "idle" | "sending" | "speaking" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pop open the card when there's something to show
  useEffect(() => {
    if (conversationMessages.length > 0) {
      setExpanded(true);
    }
  }, [conversationMessages.length]);

  // Keep the chat scrolled to the newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  // Called when the user releases the spacebar - sends audio to backend
  const onAudioBlob = useCallback(
    async (blob: Blob) => {
      setStatus("sending");
      setErrorMsg(null);
      setExpanded(true);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      try {
        const form = new FormData();
        form.append("audio", blob, "speech.webm");
        // Only include conversationId if we have one
        if (conversationId) {
          form.append("conversationId", conversationId);
        }

        const res = await fetch(`${API_BASE}/api/voice/transcribe-and-reply`, {
          method: "POST",
          body: form,
          credentials: "include",
        });

        if (!res.ok) {
          setStatus("error");
          setErrorMsg(await res.text());
          return;
        }

        const data = (await res.json()) as {
          transcript: string;
          reply: string;
          conversationId: string;
          conversationTitle?: string;
          isNewConversation?: boolean;
        };

        // If a new conversation was created, notify the parent
        if (data.isNewConversation && onConversationCreated) {
          onConversationCreated(
            data.conversationId,
            data.conversationTitle || "New conversation"
          );
        }

        // Create message objects for the parent to update state
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: "user",
          content: data.transcript,
          createdAt: new Date().toISOString(),
        };
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          createdAt: new Date().toISOString(),
        };
        onNewMessage(userMsg, assistantMsg);

        // Get TTS audio from ElevenLabs
        setStatus("speaking");
        const ttsRes = await fetch(`${API_BASE}/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: data.reply, voice: VOICE }),
        });

        if (!ttsRes.ok) {
          // Fall back to browser TTS if ElevenLabs fails
          console.warn("ElevenLabs TTS failed, using browser fallback");
          speakFallback(data.reply);
          setStatus("idle");
          return;
        }

        const audioBlob = await ttsRes.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setStatus("idle");
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          console.warn("Audio playback failed, using browser fallback");
          speakFallback(data.reply);
          setStatus("idle");
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [conversationId, onNewMessage, onConversationCreated]
  );

  const isMobile = useIsMobile();

  // Desktop: hold spacebar to record
  const { isRecording: isRecordingDesktop } = useHoldToTalk({ onAudioBlob });

  // Mobile: tap to toggle recording
  const { isRecording: isRecordingMobile, toggleRecording } = useTapToTalk({
    onAudioBlob,
  });

  // Use the appropriate recording state based on device
  const isRecording = isMobile ? isRecordingMobile : isRecordingDesktop;
  const isActive = isRecording || status === "sending" || status === "speaking";

  // Filter to only show user and assistant messages
  const displayMessages = conversationMessages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );

  return (
    <div className="flex flex-col items-end gap-2 sm:gap-3">
      {/* Expanded Response Card */}
      {expanded && (
        <div className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-h-[50vh] sm:max-h-[60vh] rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="text-xs font-light text-muted-foreground uppercase tracking-wide">
              Voice Coach
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {errorMsg && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                {errorMsg}
              </div>
            )}

            {displayMessages.length === 0 && !errorMsg && (
              <div className="text-sm text-muted-foreground text-center py-4">
                {isMobile ? "Tap the mic to start talking" : "Hold Space to start talking"}
              </div>
            )}

            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "text-sm rounded-lg p-3",
                  msg.role === "user"
                    ? "bg-secondary/50 ml-8"
                    : "bg-primary/10 mr-8"
                )}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {msg.role === "user" ? "You" : "Coach"}
                </div>
                <div>{msg.content}</div>
              </div>
            ))}

            {status === "sending" && (
              <div className="text-sm text-muted-foreground animate-pulse">
                Processing...
              </div>
            )}

            {status === "speaking" && (
              <div className="text-sm text-muted-foreground">
                Speaking...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={isMobile ? toggleRecording : undefined}
        className={cn(
          "relative w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg transition-all duration-200",
          "flex items-center justify-center",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isRecording
            ? "bg-red-500 scale-110 shadow-red-500/30"
            : status === "sending"
            ? "bg-primary animate-pulse"
            : "bg-primary hover:bg-primary/90 hover:scale-105",
          isMobile && "active:scale-95"
        )}
        title={isMobile ? "Tap to talk" : "Hold Space to talk"}
        disabled={status === "sending" || status === "speaking"}
      >
        {/* Microphone Icon */}
        {!isActive && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-foreground"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}

        {/* Recording Animation */}
        {isRecording && (
          <div className="flex items-center gap-0.5">
            <span className="w-1 h-4 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-6 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-4 bg-white rounded-full animate-bounce" />
          </div>
        )}

        {/* Sending Spinner */}
        {(status === "sending" || status === "speaking") && (
          <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        )}

        {/* Recording Pulse Ring */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
        )}
      </button>

      {/* Interaction Hint */}
      {isMobile ? (
        <div className="text-xs text-muted-foreground text-center">
          {isRecording ? "Tap to stop" : "Tap to talk"}
        </div>
      ) : (
        <div className="hidden sm:block text-xs text-muted-foreground text-center">
          Hold{" "}
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">
            Space
          </kbd>{" "}
          to talk
        </div>
      )}
    </div>
  );
}

// If ElevenLabs TTS fails, use the browser's built-in speech synthesis
function speakFallback(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}
