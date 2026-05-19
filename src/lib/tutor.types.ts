export type StudentClass = "9" | "10" | "11" | "12";
export type Stream =
  | "Science (PCM)"
  | "Science (PCB)"
  | "Science (PCMB)"
  | "Commerce"
  | "Humanities"
  | "General";

export interface StudentProfile {
  id: string;
  name: string | null;
  class: StudentClass;
  stream: Stream;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: ChatMessage[];
}
