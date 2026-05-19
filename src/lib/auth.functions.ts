import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, class, stream")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

const UpsertSchema = z.object({
  name: z.string().trim().max(64).optional().nullable(),
  class: z.enum(["9", "10", "11", "12"]),
  stream: z.string().min(1).max(64),
});

export const upsertMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        name: data.name ?? null,
        class: data.class,
        stream: data.stream,
      })
      .select("id, name, class, stream")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
