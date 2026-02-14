// Hook for "tap spacebar to record" functionality
// Tap spacebar to start recording, tap again to stop and send

import { useEffect, useRef, useState, useCallback } from "react";

type UseHoldToTalkOpts = {
  onAudioBlob: (blob: Blob) => Promise<void> | void;
};

export function useHoldToTalk({ onAudioBlob }: UseHoldToTalkOpts) {
  const [isRecording, setIsRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onAudioBlobRef = useRef(onAudioBlob);

  // Keep the callback ref up to date
  useEffect(() => {
    onAudioBlobRef.current = onAudioBlob;
  }, [onAudioBlob]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];

        await onAudioBlobRef.current(blob);
      };

      recorderRef.current = recorder;
      setIsRecording(true);
      recorder.start();
    } catch (err) {
      console.error("Failed to start recording:", err);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.stop();
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;

      // Don't hijack space when user is typing in a form
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || (el as any)?.isContentEditable;
      if (isTyping) return;

      e.preventDefault();

      // Ignore key repeat events (holding down space)
      if (e.repeat) return;

      // Toggle recording
      if (recorderRef.current?.state === "recording") {
        stopRecording();
      } else {
        startRecording();
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [startRecording, stopRecording]);

  return { isRecording };
}

// Pick the best audio format the browser supports
function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm"];
  for (const type of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(type)) return type;
  }
  return undefined;
}
