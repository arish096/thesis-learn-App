import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { GraduationCap, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — AI Tutor" },
      { name: "description", content: "Sign in to your AI Tutor for personalised CBSE / JEE / NEET help." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat" });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim() || null },
            emailRedirectTo: `${window.location.origin}/chat`,
          },
        });
        if (error) throw error;
        setError("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/chat" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/chat",
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/chat" });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: "var(--gradient-subtle)" }}
    >
      {/* Decorative glass blobs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl opacity-40" style={{ background: "var(--gradient-primary)" }} />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-30" style={{ background: "var(--gradient-primary)" }} />

      <div className="relative w-full max-w-md">
        {/* Glass card */}
        <div className="rounded-3xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg" style={{ background: "var(--gradient-primary)" }}>
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Tutor</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {mode === "signin" ? "Welcome back" : "Create your account"}
              </p>
            </div>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border bg-white/80 hover:bg-white text-gray-800 py-2.5 text-sm font-medium shadow-sm transition disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border bg-white/70 dark:bg-white/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border bg-white/70 dark:bg-white/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              className="w-full rounded-xl border bg-white/70 dark:bg-white/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {error && (
              <div className="text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/30 px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--gradient-primary)" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
              className="text-primary font-medium hover:underline"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:text-foreground">← Back home</Link>
        </p>
      </div>
    </div>
  );
}
