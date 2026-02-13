// Utility functions used across the app

import { clsx, type ClassValue } from "clsx";

// Merge classnames - handles conditional classes nicely
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Convert seconds to "Xh Ym" format for sleep durations
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "--";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Format ISO timestamp to readable time like "10:30 PM"
export function formatTime(isoString: string | null): string {
  if (!isoString) return "--";
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Format date for chart labels like "Mon, Jan 5"
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
