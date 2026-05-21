import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Flag } from "lucide-react";
import { toast } from "sonner";

type Target =
  | { kind: "event"; eventId: string }
  | { kind: "gallery_photo"; eventId: string; photoId: string };

const REASONS = [
  "Spam or scam",
  "Harassment or hate",
  "Inappropriate content",
  "Misinformation",
  "Other",
];

export function ReportButton({
  target,
  size = "sm",
  variant = "ghost",
  label = "Report",
}: {
  target: Target;
  size?: "sm" | "icon";
  variant?: "ghost" | "outline" | "secondary";
  label?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) { toast.error("Sign in to report"); return; }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        reporter_id: user.id,
        reason,
        details: details.trim().slice(0, 1000) || null,
        event_id: target.eventId,
      };
      if (target.kind === "gallery_photo") {
        payload.details = `[photo:${target.photoId}] ${details.trim()}`.slice(0, 1000);
      }
      const { error } = await supabase.from("reports").insert(payload as any);
      if (error) throw error;
      toast.success("Report submitted");
      setOpen(false);
      setDetails("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Report failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Flag className={size === "icon" ? "h-4 w-4" : "mr-1.5 h-3.5 w-3.5"} />
          {size !== "icon" && label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {target.kind === "event" ? "event" : "photo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Details (optional)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              placeholder="Add context for the host…"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
