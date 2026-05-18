import { Plus, MessageSquare, BookOpen, GraduationCap, Sparkles, Trash2 } from "lucide-react";
import type { Conversation, StudentProfile } from "@/lib/tutor.types";

const STUDY_TOPICS: Record<string, string[]> = {
  "9": ["Number Systems", "Motion & Force", "Atoms and Molecules", "Tissues"],
  "10": ["Real Numbers", "Light – Reflection & Refraction", "Chemical Reactions", "Life Processes"],
  "11": ["Sets & Functions", "Laws of Motion", "Thermodynamics", "Cell Structure"],
  "12": ["Integrals", "Electromagnetic Induction", "Coordination Compounds", "Genetics"],
};

interface Props {
  profile: StudentProfile;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onResetProfile: () => void;
  open: boolean;
  onClose: () => void;
}

export function TutorSidebar({
  profile, conversations, activeId, onSelect, onNew, onDelete, onResetProfile, open, onClose,
}: Props) {
  const topics = STUDY_TOPICS[profile.class] ?? [];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 border-r bg-sidebar text-sidebar-foreground flex flex-col transform transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">AI Tutor</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Class {profile.class} · {profile.stream}
              </div>
            </div>
          </div>
          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:shadow-md transition"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="h-4 w-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
              Recent Chats
            </div>
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2">No chats yet. Ask your first doubt!</p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((c) => (
                  <li key={c.id} className="group">
                    <div
                      className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer transition ${
                        c.id === activeId
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/60"
                      }`}
                      onClick={() => onSelect(c.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="flex-1 truncate">{c.title}</span>
                      <button
                        aria-label="Delete"
                        onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
              Suggested Topics
            </div>
            <ul className="space-y-1">
              {topics.map((t) => (
                <li key={t} className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/80">
                  <BookOpen className="h-3.5 w-3.5 opacity-60" />
                  <span className="truncate">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-3 border-t">
          <button
            onClick={onResetProfile}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition py-2"
          >
            Change class / stream
          </button>
        </div>
      </aside>
    </>
  );
}
