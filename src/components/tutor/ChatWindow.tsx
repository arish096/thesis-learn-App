import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, MicOff, Image as ImageIcon, Send, Volume2, VolumeX, X, GraduationCap, Menu, Sparkles } from "lucide-react";
import type { ChatMessage, Conversation, StudentProfile } from "@/lib/tutor.types";
import { askTutor } from "@/lib/tutor.functions";
import { getSpeechRecognition, speak, stopSpeaking } from "@/lib/speech";
import { MarkdownMessage } from "./MarkdownMessage";

interface Props {
  profile: StudentProfile;
  conversation: Conversation;
  onUpdate: (c: Conversation) => void;
  onOpenSidebar: () => void;
}

const SUGGESTIONS = [
  "Explain Newton's 3rd law with an example",
  "Solve: ∫ x·sin(x) dx",
  "What is photosynthesis? (in Hinglish)",
  "Difference between DNA and RNA",
];

export function ChatWindow({ profile, conversation, onUpdate, onOpenSidebar }: Props) {
  const ask = useServerFn(askTutor);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<ReturnType<typeof getSpeechRecognition>>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation.messages, loading]);

  useEffect(() => () => stopSpeaking(), []);

  async function handleImage(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large (max 5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getSpeechRecognition();
    if (!rec) {
      setError("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    rec.lang = "en-IN";
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + t : t));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function toggleSpeak(id: string, text: string) {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      speak(text);
      setSpeakingId(id);
      const check = setInterval(() => {
        if (typeof window !== "undefined" && !window.speechSynthesis.speaking) {
          setSpeakingId(null);
          clearInterval(check);
        }
      }, 400);
    }
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content && !image) return;
    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content || "(image)",
      image: image ?? undefined,
      timestamp: Date.now(),
    };
    const nextMessages = [...conversation.messages, userMsg];
    const title =
      conversation.messages.length === 0
        ? content.slice(0, 48) || "Image question"
        : conversation.title;
    onUpdate({ ...conversation, messages: nextMessages, title, updatedAt: Date.now() });
    setInput("");
    setImage(null);
    setLoading(true);

    try {
      const result = await ask({
        data: {
          studentClass: profile.class,
          stream: profile.stream,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
            image: m.image,
          })),
        },
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("reply" in result && result.reply) {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply,
          timestamp: Date.now(),
        };
        onUpdate({
          ...conversation,
          messages: [...nextMessages, aiMsg],
          title,
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = conversation.messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 md:px-6 py-3 border-b bg-card/70 backdrop-blur">
        <button onClick={onOpenSidebar} className="md:hidden p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{conversation.title}</div>
          <div className="text-xs text-muted-foreground">Class {profile.class} · {profile.stream}</div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {isEmpty && (
            <div className="text-center py-10">
              <div className="inline-flex h-14 w-14 rounded-2xl items-center justify-center text-primary-foreground mb-4" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold mb-1">
                Hi{profile.name ? ` ${profile.name}` : ""}! Ready to learn? 📚
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Ask any doubt — type, speak, or snap a photo of your textbook.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm rounded-xl border bg-card px-4 py-3 hover:border-primary/50 hover:bg-accent transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {conversation.messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] md:max-w-[78%] rounded-2xl px-4 py-3 ${
                  m.role === "user"
                    ? "text-primary-foreground rounded-br-sm"
                    : "bg-card border rounded-bl-sm"
                }`}
                style={m.role === "user" ? { background: "var(--gradient-primary)" } : undefined}
              >
                {m.image && (
                  <img src={m.image} alt="uploaded" className="rounded-lg mb-2 max-h-64" />
                )}
                {m.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <>
                    <MarkdownMessage content={m.content} />
                    <button
                      onClick={() => toggleSpeak(m.id, m.content)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
                    >
                      {speakingId === m.id ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      {speakingId === m.id ? "Stop" : "Listen"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-card/70 backdrop-blur px-4 md:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          {image && (
            <div className="mb-2 inline-flex items-center gap-2 bg-accent rounded-lg p-1.5 pr-2">
              <img src={image} alt="preview" className="h-12 w-12 rounded object-cover" />
              <button onClick={() => setImage(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 focus-within:ring-2 focus-within:ring-ring transition">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition"
              aria-label="Upload image"
              title="Upload image"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <button
              onClick={toggleMic}
              className={`p-2 rounded-lg transition ${
                listening
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Voice input"
              title="Voice input (English/Hindi)"
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ask your doubt... (English / Hindi / Hinglish)"
              className="flex-1 resize-none bg-transparent px-2 py-2 text-sm focus:outline-none max-h-32"
            />
            <button
              onClick={() => send()}
              disabled={loading || (!input.trim() && !image)}
              className="p-2.5 rounded-lg text-primary-foreground transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              style={{ background: "var(--gradient-primary)" }}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            AI Tutor can make mistakes. Verify important answers with your textbook.
          </p>
        </div>
      </div>
    </div>
  );
}
