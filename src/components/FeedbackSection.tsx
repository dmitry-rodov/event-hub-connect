import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { toast } from "sonner";

export function FeedbackSection({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["feedback", eventId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("feedback")
        .select("id, rating, comment")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

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
    qc.invalidateQueries({ queryKey: ["feedback", eventId] });
  }

  if (existing) {
    return (
      <section className="mt-12 border-t pt-8">
        <h2 className="font-display text-2xl">Your feedback</h2>
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-4 w-4 ${i < existing.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
          ))}
        </div>
        {existing.comment && <p className="mt-2 text-sm text-muted-foreground">{existing.comment}</p>}
      </section>
    );
  }

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="font-display text-2xl">Leave feedback</h2>
      <p className="mt-1 text-sm text-muted-foreground">Share how it went. One submission per attendee.</p>
      <div className="mt-4 space-y-3">
        <div>
          <Label className="text-xs">Rating</Label>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="p-1"
                aria-label={`${n} stars`}
              >
                <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Comment (optional)</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="What stood out?"
          />
        </div>
        <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit feedback"}</Button>
      </div>
    </section>
  );
}
