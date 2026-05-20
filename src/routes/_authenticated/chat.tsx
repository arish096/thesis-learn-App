import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TutorSidebar } from "@/components/tutor/TutorSidebar";
import { ChatWindow } from "@/components/tutor/ChatWindow";
import { OnboardingDialog } from "@/components/tutor/Onboarding";
import { getMyProfile } from "@/lib/auth.functions";
import { listConversations, getConversation, deleteConversation } from "@/lib/chat.functions";
import type { ChatMessage, StudentProfile } from "@/lib/tutor.types";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "AI Tutor — Ask any doubt" },
      { name: "description", content: "Ask any CBSE / JEE / NEET doubt by text, voice, or photo." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchConvos = useServerFn(listConversations);
  const fetchConv = useServerFn(getConversation);
  const deleteConv = useServerFn(deleteConversation);

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const convosQ = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchConvos(),
    enabled: !!profileQ.data,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeQ = useQuery({
    queryKey: ["conversation", activeId],
    queryFn: () => fetchConv({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  function handleNew() {
    setActiveId(null);
    setSidebarOpen(false);
  }

  async function handleDelete(id: string) {
    await deleteConv({ data: { id } });
    if (activeId === id) setActiveId(null);
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }

  function handleConvoUpdated(newId: string) {
    if (activeId !== newId) setActiveId(newId);
    qc.invalidateQueries({ queryKey: ["conversations"] });
    qc.invalidateQueries({ queryKey: ["conversation", newId] });
  }

  if (profileQ.isLoading) {
    return <div className="min-h-screen" style={{ background: "var(--gradient-subtle)" }} />;
  }

  if (!profileQ.data) {
    return (
      <OnboardingDialog
        onDone={() => qc.invalidateQueries({ queryKey: ["profile"] })}
      />
    );
  }

  const profile = profileQ.data as StudentProfile;
  const messages = (activeQ.data?.messages ?? []) as ChatMessage[];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--gradient-subtle)" }}>
      <TutorSidebar
        profile={profile}
        conversations={convosQ.data ?? []}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setSidebarOpen(false); }}
        onNew={handleNew}
        onDelete={handleDelete}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatWindow
          profile={profile}
          conversationId={activeId}
          messages={messages}
          title={activeQ.data?.title ?? "New chat"}
          onConversationUpdated={handleConvoUpdated}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      </main>
    </div>
  );
}
