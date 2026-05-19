import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { askTutor } from "@/lib/chat.functions";
import { getMyProfile } from "@/lib/auth.functions";
import { getSpeechRecognition, speak, stopSpeaking } from "@/lib/speech";

export const Route = createFileRoute("/_authenticated/talk")({
  head: () => ({
    meta: [
      { title: "Live Talk — AI Tutor" },
      { name: "description", content: "Talk to your AI tutor like a real person." },
    ],
  }),
  component: TalkPage,
});

type Turn = { role: "user" | "assistant"; content: string };

function TalkPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const ask = useServerFn(askTutor);
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const recRef = useRef<ReturnType<typeof getSpeechRecognition>>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const activeRef = useRef(active);
  const modeRef = useRef(mode);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Cleanup on unmount
  useEffect(() => () => stopAll(), []);

  function stopAll() {
    stopSpeaking();
    try { recRef.current?.stop(); } catch {}
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }

  async function startMicMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setLevel(rms);

        // Simple VAD: detect end of speech after ~1.2s of silence while listening
        if (modeRef.current === "listening" && lastTranscriptRef.current.trim()) {
          if (rms < 0.02) {
            silenceStartRef.current ??= performance.now();
            if (performance.now() - silenceStartRef.current > 1200) {
              silenceStartRef.current = null;
              try { recRef.current?.stop(); } catch {}
            }
          } else {
            silenceStartRef.current = null;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      setError("Microphone access denied.");
      setActive(false);
    }
  }

  function startListening() {
    const rec = getSpeechRecognition();
    if (!rec) { setError("Voice input not supported in this browser. Try Chrome."); setActive(false); return; }
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = "";
    lastTranscriptRef.current = "";
    silenceStartRef.current = null;

    rec.onresult = (e) => {
      let interim = "";
      const results = e.results as unknown as ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const text = r[0].transcript;
        if (r.isFinal) finalText += text + " ";
        else interim += text;
      }
      const combined = (finalText + interim).trim();
      lastTranscriptRef.current = combined;
      setTranscript(combined);
    };
    rec.onerror = () => {};
    rec.onend = async () => {
      const said = lastTranscriptRef.current.trim();
      if (!said || !activeRef.current) {
        if (activeRef.current) {
          // restart if nothing captured
          try { rec.start(); } catch {}
        }
        return;
      }
      await handleUtterance(said);
    };
    recRef.current = rec;
    setMode("listening");
    setTranscript("");
    try { rec.start(); } catch {}
  }

  async function handleUtterance(text: string) {
    setMode("thinking");
    setTurns((t) => [...t, { role: "user", content: text }]);
    setTranscript("");
    try {
      const result = await ask({ data: { conversationId, content: text, image: null } });
      if ("conversationId" in result && result.conversationId) setConversationId(result.conversationId);
      if ("error" in result && result.error) {
        setError(result.error);
        setMode("idle");
        if (activeRef.current) startListening();
        return;
      }
      if ("reply" in result && result.reply) {
        setTurns((t) => [...t, { role: "assistant", content: result.reply! }]);
        setMode("speaking");
        speak(result.reply);
        const check = setInterval(() => {
          if (typeof window !== "undefined" && !window.speechSynthesis.speaking) {
            clearInterval(check);
            if (activeRef.current) startListening();
            else setMode("idle");
          }
        }, 300);
      }
    } catch (e) {
      console.error(e);
      setError("Something went wrong.");
      setMode("idle");
    }
  }

  async function toggle() {
    if (active) {
      setActive(false);
      stopAll();
      setMode("idle");
      return;
    }
    setError(null);
    setActive(true);
    await startMicMeter();
    startListening();
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-subtle)" }}>
      <header className="flex items-center gap-3 px-4 md:px-6 py-3 border-b bg-card/60 backdrop-blur">
        <Link to="/chat" className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="font-semibold text-sm">Live Talk</div>
          <div className="text-xs text-muted-foreground">
            {profileQ.data ? `Class ${profileQ.data.class} · ${profileQ.data.stream}` : "Loading…"}
          </div>
        </div>
        <span className="text-xs text-muted-foreground capitalize hidden sm:block">{mode}</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
        {/* Visualizer */}
        <Visualizer level={level} mode={mode} />

        <p className="mt-8 text-center text-sm text-muted-foreground min-h-[1.5rem] max-w-md">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : mode === "listening" && transcript ? (
            <span className="italic">"{transcript}"</span>
          ) : mode === "listening" ? (
            "Listening… speak in English or Hinglish"
          ) : mode === "thinking" ? (
            "Tutor is thinking…"
          ) : mode === "speaking" ? (
            "Tutor is speaking…"
          ) : active ? (
            "Tap mic to start talking"
          ) : (
            "Tap the mic to begin a live conversation"
          )}
        </p>

        <button
          onClick={toggle}
          className={`mt-8 h-20 w-20 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 ${
            active ? "bg-destructive text-destructive-foreground" : "text-primary-foreground"
          }`}
          style={active ? undefined : { background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          aria-label={active ? "Stop" : "Start"}
        >
          {mode === "thinking" ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : mode === "speaking" ? (
            <Volume2 className="h-8 w-8" />
          ) : active ? (
            <MicOff className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </button>

        {turns.length > 0 && (
          <div className="w-full max-w-2xl mt-10 space-y-3 max-h-72 overflow-y-auto pr-1">
            {turns.slice(-6).map((t, i) => (
              <div key={i} className={`text-sm rounded-2xl px-4 py-2.5 ${
                t.role === "user"
                  ? "bg-card border ml-auto max-w-[80%]"
                  : "text-primary-foreground max-w-[80%]"
              }`} style={t.role === "assistant" ? { background: "var(--gradient-primary)" } : undefined}>
                {t.content}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Visualizer({ level, mode }: { level: number; mode: string }) {
  // Five animated bars; size driven by level when listening, by sine wave when speaking/thinking.
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => { setT((x) => x + 0.08); raf = requestAnimationFrame(loop); };
    if (mode === "speaking" || mode === "thinking") raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const bars = [0, 1, 2, 3, 4];
  return (
    <div className="relative h-40 w-40 flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-50 transition-opacity"
        style={{
          background: "var(--gradient-primary)",
          transform: `scale(${1 + Math.min(level * 4, 0.8)})`,
          opacity: mode === "idle" ? 0.2 : 0.5,
        }}
      />
      <div className="relative flex items-end gap-1.5 h-24">
        {bars.map((i) => {
          let h: number;
          if (mode === "listening") {
            h = 20 + Math.min(level * 200, 80) * (0.6 + 0.4 * Math.sin(i + Date.now() / 200));
          } else if (mode === "speaking" || mode === "thinking") {
            h = 20 + 50 * Math.abs(Math.sin(t + i * 0.6));
          } else {
            h = 12;
          }
          return (
            <span
              key={i}
              className="w-2.5 rounded-full"
              style={{
                background: "var(--gradient-primary)",
                height: `${Math.max(8, Math.min(100, h))}%`,
                transition: "height 80ms ease-out",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
