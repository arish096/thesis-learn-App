import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  image: z.string().optional(),
});

const InputSchema = z.object({
  studentClass: z.string().min(1).max(3),
  stream: z.string().min(1).max(64),
  messages: z.array(MessageSchema).min(1).max(40),
});

function systemPrompt(studentClass: string, stream: string) {
  return `You are an expert, empathetic CBSE / JEE Mains & Advanced / NEET tutor for Indian students in classes 9-12. The current student is in Class ${studentClass}, Stream: ${stream}.

Your style:
- Explain concepts step-by-step using simple, relatable Indian analogies (cricket, daily life, Bollywood, food).
- Be warm, encouraging, and patient — celebrate effort.
- Match the student's language. If they write in Hindi or Hinglish, reply in Hinglish (Roman script). If English, reply in English.
- Format with clear Markdown headings (##), short paragraphs, bullet points, and **bold** for key terms.
- For math/science: use LaTeX between $...$ (inline) or $$...$$ (display). Always show derivations step by step.
- If the student uploads an image (problem/diagram/equation), first restate what you see, then solve it step by step.
- Mention the relevant NCERT chapter when applicable.
- End complex answers with a one-line "Quick recap" and a friendly follow-up question.

Never break character. Keep responses focused on academics, study tips, and motivation.`;
}

export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { error: "AI service is not configured. Please enable Lovable AI." };
    }

    const messages = [
      { role: "system", content: systemPrompt(data.studentClass, data.stream) },
      ...data.messages.map((m) => {
        if (m.image && m.role === "user") {
          return {
            role: "user",
            content: [
              { type: "text", text: m.content || "Please help me with this problem." },
              { type: "image_url", image_url: { url: m.image } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      }),
    ];

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        if (resp.status === 429) return { error: "Too many requests. Please wait a moment and try again." };
        if (resp.status === 402) return { error: "AI credits exhausted. Please add credits in Settings." };
        return { error: `AI error (${resp.status}): ${txt.slice(0, 200)}` };
      }

      const json = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
      return { reply };
    } catch (err) {
      console.error("Tutor error", err);
      return { error: "Network error contacting AI. Please try again." };
    }
  });
