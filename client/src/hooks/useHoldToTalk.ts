import { useEffect, useRef, useState } from "react";

type UseHoldToTalkOpts = {
  onAudioBlob: (blob: Blob) => Promise<void> | void;
};

export function useHoldToTalk({ onAudioBlob }: UseHoldToTalkOpts) {
  const [isRecording, setIsRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const holdingRef = useRef(false);

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if (e.code !== "Space") return;

      // Don't hijack space when typing
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      const typing =
        tag === "input" || tag === "textarea" || (el as any)?.isContentEditable;
      if (typing) return;

      e.preventDefault();

      if (holdingRef.current) return; // avoids repeat
      holdingRef.current = true;

      if (isRecording) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = pickMimeType();
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      mr.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        chunksRef.current = [];

        await onAudioBlob(blob);
      };

      recorderRef.current = mr;
      setIsRecording(true);
      mr.start();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      holdingRef.current = false;

      const mr = recorderRef.current;
      if (!mr) return;
      if (mr.state === "recording") mr.stop();
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

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm"];
  for (const t of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(t)) return t;
  }
  return undefined;
}
