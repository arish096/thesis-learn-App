import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function systemPrompt(studentClass: string, stream: string, name?: string | null) {
  const who = name ? `The student's name is ${name}. ` : "";
  return `You are an expert, empathetic CBSE / JEE / NEET tutor for Indian students in classes 9-12. ${who}The current student is in Class ${studentClass}, Stream: ${stream}.

Style:
- Step-by-step explanations using simple Indian analogies (cricket, daily life, food, Bollywood).
- Warm, encouraging, patient. Celebrate effort.
- Match the student's language. Hindi/Hinglish in → Hinglish (Roman) out. English in → English out.
- Use Markdown: ## headings, short paragraphs, bullets, **bold** key terms.
- Math/science: LaTeX between $...$ or $$...$$. Show every step.
- If an image is sent, restate what you see, then solve step by step.
- Mention the relevant NCERT chapter when applicable.
- End complex answers with a one-line "Quick recap" and a friendly follow-up question.
Never break character.`;
}

// --- Conversations CRUD ---------------------------------------------------

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data;
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [conv, msgs] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, title, updated_at")
        .eq("id", data.id)
        .single(),
      supabase
        .from("messages")
        .select("id, role, content, image, created_at")
        .eq("conversation_id", data.id)
        .order("created_at", { ascending: true }),
    ]);
    if (conv.error) throw new Error(conv.error.message);
    if (msgs.error) throw new Error(msgs.error.message);
    return { ...conv.data, messages: msgs.data };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Ask the tutor (persists user + assistant messages) -------------------

const AskSchema = z.object({
  conversationId: z.string().uuid().nullable(),
  content: z.string().max(8000),
  image: z.string().max(7_000_000).optional().nullable(),
});

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AskSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, class, stream")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      return { error: "Please complete onboarding (Class / Stream) first." };
    }

    // Resolve conversation
    let conversationId = data.conversationId;
    if (!conversationId) {
      const title = (data.content || "Image question").slice(0, 48);
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = created.id;
    }

    // Save user message
    const { error: insertUserErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "user",
      content: data.content || "(image)",
      image: data.image ?? null,
    });
    if (insertUserErr) throw new Error(insertUserErr.message);

    // Load full history for context (limit last 20)
    const { data: history, error: histErr } = await supabase
      .from("messages")
      .select("role, content, image")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);
    if (histErr) throw new Error(histErr.message);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { error: "AI is not configured." };

    const messages = [
      { role: "system", content: systemPrompt(profile.class, profile.stream, profile.name) },
      ...history.map((m) => {
        if (m.image && m.role === "user") {
          return {
            role: "user",
            content: [
              { type: "text", text: m.content || "Please help me with this." },
              { type: "image_url", image_url: { url: m.image } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      }),
    ];

    let reply = "";
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        if (resp.status === 429) return { error: "Too many requests. Please wait a moment.", conversationId };
        if (resp.status === 402) return { error: "AI credits exhausted. Please add credits.", conversationId };
        return { error: `AI error (${resp.status}): ${txt.slice(0, 200)}`, conversationId };
      }
      const json = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
      reply = json.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    } catch (err) {
      console.error("Tutor error", err);
      return { error: "Network error contacting AI.", conversationId };
    }

    // Save assistant message + bump conversation
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: reply,
    });
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { reply, conversationId };
  });
