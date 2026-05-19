import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, Sparkles, Loader2 } from "lucide-react";
import type { StudentClass, Stream } from "@/lib/tutor.types";
import { upsertMyProfile } from "@/lib/auth.functions";

const CLASSES: StudentClass[] = ["9", "10", "11", "12"];
const STREAMS_LOWER: Stream[] = ["General"];
const STREAMS_UPPER: Stream[] = [
  "Science (PCM)",
  "Science (PCB)",
  "Science (PCMB)",
  "Commerce",
  "Humanities",
];

export function OnboardingDialog({ onDone }: { onDone: () => void }) {
  const save = useServerFn(upsertMyProfile);
  const [studentClass, setStudentClass] = useState<StudentClass | null>(null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamOptions = studentClass && Number(studentClass) >= 11 ? STREAMS_UPPER : STREAMS_LOWER;
  const canSubmit = !!studentClass && !!stream && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await save({
        data: {
          class: studentClass!,
          stream: stream!,
          name: name.trim() || null,
        },
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--gradient-subtle)" }}>
      <div className="w-full max-w-xl rounded-3xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-2xl p-8 md:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tell us about you</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> We'll personalise every answer for your syllabus
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Your name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Which class are you in?</label>
            <div className="grid grid-cols-4 gap-2">
              {CLASSES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setStudentClass(c); setStream(null); }}
                  className={`rounded-lg border py-3 text-sm font-semibold transition ${
                    studentClass === c
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  Class {c}
                </button>
              ))}
            </div>
          </div>

          {studentClass && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {Number(studentClass) >= 11 ? "Pick your stream" : "Subject focus"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {streamOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStream(s)}
                    className={`rounded-lg border py-2.5 px-3 text-sm font-medium text-left transition ${
                      stream === s
                        ? "border-primary bg-accent text-accent-foreground shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-accent"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/30 px-3 py-2">
              {error}
            </div>
          )}

          <button
            disabled={!canSubmit}
            onClick={submit}
            className="w-full rounded-lg py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Start Learning →
          </button>
        </div>
      </div>
    </div>
  );
}
