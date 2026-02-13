// Hook for "hold spacebar to record" functionality
// Returns isRecording state and calls onAudioBlob when user releases

import { useEffect, useRef, useState } from "react";

type UseHoldToTalkOpts = {
  onAudioBlob: (blob: Blob) => Promise<void> | void;
};

export function useHoldToTalk({ onAudioBlob }: UseHoldToTalkOpts) {
  const [isRecording, setIsRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const holdingRef = useRef(false); // tracks if space is currently held

  useEffect(() => {
    // Start recording when space is pressed
    const onKeyDown = async (e: KeyboardEvent) => {
      if (e.code !== "Space") return;

      // Don't hijack space when user is typing in a form
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || (el as any)?.isContentEditable;
      if (isTyping) return;

      e.preventDefault();

      // Ignore key repeat events (holding down space)
      if (holdingRef.current) return;
      holdingRef.current = true;

      if (isRecording) return;

      // Get mic access and start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      // When recording stops, bundle up the audio and send it
      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];

        await onAudioBlob(blob);
      };

      recorderRef.current = recorder;
      setIsRecording(true);
      recorder.start();
    };

    // Stop recording when space is released
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      holdingRef.current = false;

      const recorder = recorderRef.current;
      if (!recorder) return;
      if (recorder.state === "recording") recorder.stop();
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown as any);
      window.removeEventListener("keyup", onKeyUp as any);
    };
  }, [isRecording, onAudioBlob]);

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
