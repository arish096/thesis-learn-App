export type StudentClass = "9" | "10" | "11" | "12";
export type Stream = "Science (PCM)" | "Science (PCB)" | "Science (PCMB)" | "Commerce" | "Humanities" | "General";

export interface StudentProfile {
  class: StudentClass;
  stream: Stream;
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string; // data URL
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}
