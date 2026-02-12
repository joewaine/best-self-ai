import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "--";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function formatTime(isoString: string | null): string {
  if (!isoString) return "--";
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
