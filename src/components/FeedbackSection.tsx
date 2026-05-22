import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  display_name: string | null;
}

export function FeedbackSection({ eventId, canSubmit }: { eventId: string; canSubmit: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: list } = useQuery({
    queryKey: ["feedback-list", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("feedback")
        .select("id, rating, comment, created_at, user_id")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, display_name").in("id", ids)
        : { data: [] as Array<{ id: string; display_name: string | null }> };
      const map = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
      return rows.map((r) => ({ ...r, display_name: map.get(r.user_id) ?? null })) as FeedbackRow[];
    },
  });

  const existing = user ? list?.find((r) => r.user_id === user.id) ?? null : null;

  async function submit() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({
      event_id: eventId,
      user_id: user.id,
      rating,
      comment: comment.trim().slice(0, 1000) || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your feedback!");
    setComment("");
    qc.invalidateQueries({ queryKey: ["feedback-list", eventId] });
  }

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="font-display text-2xl">Feedback</h2>

      {list && list.length > 0 ? (
        <ul className="mt-4 space-y-4">
          {list.map((f) => (
            <li key={f.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{f.display_name ?? "Attendee"}</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                  ))}
                </div>
              </div>
              {f.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{f.comment}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No feedback yet.</p>
      )}

      {canSubmit && !existing && (
        <div className="mt-8 rounded-lg border bg-muted/30 p-4">
          <h3 className="font-medium">Leave your feedback</h3>
          <p className="mt-1 text-xs text-muted-foreground">One submission per attendee.</p>
          <div className="mt-3 space-y-3">
            <div>
              <Label className="text-xs">Rating</Label>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="p-1" aria-label={`${n} stars`}>
                    <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Comment (optional)</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={4} placeholder="What stood out?" />
            </div>
            <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit feedback"}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
