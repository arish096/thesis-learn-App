import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Onboarding } from "@/components/tutor/Onboarding";
import { TutorSidebar } from "@/components/tutor/TutorSidebar";
import { ChatWindow } from "@/components/tutor/ChatWindow";
import type { Conversation, StudentProfile } from "@/lib/tutor.types";
import { loadConvos, loadProfile, saveConvos, saveProfile } from "@/lib/tutor.storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Tutor — Personal CBSE / JEE / NEET Coach for Class 9-12" },
      { name: "description", content: "Friendly AI tutor for Indian students (Class 9-12). Ask doubts by text, voice or photo. Covers Science, Commerce, Humanities — in English & Hinglish." },
      { property: "og:title", content: "AI Tutor — Class 9-12 Doubt Solver" },
      { property: "og:description", content: "Your personal AI tutor for CBSE, JEE & NEET. Text, voice, image — explained step by step." },
    ],
  }),
  component: Index,
});

function newConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

function Index() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    const c = loadConvos();
    if (p) setProfile(p);
    if (c.length > 0) {
      setConversations(c);
      setActiveId(c[0].id);
    } else {
      const fresh = newConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveConvos(conversations);
  }, [conversations, hydrated]);

  if (!hydrated) {
    return <div className="min-h-screen" style={{ background: "var(--gradient-subtle)" }} />;
  }

  if (!profile) {
    return (
      <Onboarding
        onComplete={(p) => {
          saveProfile(p);
          setProfile(p);
        }}
      />
    );
  }

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  function updateConvo(updated: Conversation) {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      return next;
    });
  }

  function handleNew() {
    const fresh = newConversation();
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setSidebarOpen(false);
  }

  function handleDelete(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh = newConversation();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--gradient-subtle)" }}>
      <TutorSidebar
        profile={profile}
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setSidebarOpen(false); }}
        onNew={handleNew}
        onDelete={handleDelete}
        onResetProfile={() => setProfile(null)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {active && (
          <ChatWindow
            profile={profile}
            conversation={active}
            onUpdate={updateConvo}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
      </main>
    </div>
  );
}
