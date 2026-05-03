// Lightweight content moderation. Replace with a real service in production.

const BANNED = [
  "fuck", "shit", "bitch", "asshole", "cunt", "slut", "whore",
  "kill yourself", "kys", "retard", "nigger", "faggot",
];

const URL_RE = /https?:\/\/[^\s]+/i;

export type ModerationResult = {
  ok: boolean;
  reason?: "PROFANITY" | "URL" | "TOO_LONG" | "EMPTY";
  cleaned: string;
};

export function moderateNote(input: string, opts?: { maxLength?: number }): ModerationResult {
  const maxLength = opts?.maxLength ?? 280;
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return { ok: false, reason: "EMPTY", cleaned };
  if (cleaned.length > maxLength) return { ok: false, reason: "TOO_LONG", cleaned };
  if (URL_RE.test(cleaned)) return { ok: false, reason: "URL", cleaned };
  const lower = cleaned.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) return { ok: false, reason: "PROFANITY", cleaned };
  }
  return { ok: true, cleaned };
}
