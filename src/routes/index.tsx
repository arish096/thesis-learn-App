import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      navigate({ to: data.session ? "/chat" : "/login", replace: true });
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--gradient-subtle)" }}
    >
      <div className="text-muted-foreground text-sm">Loading…</div>
    </div>
  );
}
