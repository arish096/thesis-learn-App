import type { Conversation, StudentProfile } from "./tutor.types";

const PROFILE_KEY = "ai-tutor-profile-v1";
const CONVOS_KEY = "ai-tutor-convos-v1";

export function loadProfile(): StudentProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as StudentProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: StudentProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function loadConvos(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONVOS_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

export function saveConvos(convos: Conversation[]) {
  localStorage.setItem(CONVOS_KEY, JSON.stringify(convos.slice(0, 50)));
}
