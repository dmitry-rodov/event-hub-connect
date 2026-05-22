import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { eventSchema, type EventFormValues, getTimezones, slugify } from "@/lib/event-schema";

type Props = {
  initial?: Partial<EventFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: EventFormValues) => Promise<void> | void;
};

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ initial, submitting, submitLabel = "Save", onSubmit }: Props) {
  const tzList = useMemo(() => getTimezones(), []);
  const guessedTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const [values, setValues] = useState<EventFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    timezone: initial?.timezone ?? guessedTz,
    start_at: toLocalInput(initial?.start_at as any) || "",
    end_at: toLocalInput(initial?.end_at as any) || "",
    capacity: initial?.capacity ?? 50,
    venue_type: initial?.venue_type ?? "physical",
    location: initial?.location ?? "",
    online_url: initial?.online_url ?? "",
    visibility: initial?.visibility ?? "public",
    status: initial?.status ?? "draft",
    is_paid: initial?.is_paid ?? false,
    slug: initial?.slug ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = {
      ...values,
      slug: values.slug.trim() || slugify(values.title),
      start_at: values.start_at ? new Date(values.start_at).toISOString() : "",
      end_at: values.end_at ? new Date(values.end_at).toISOString() : "",
    };
    const result = eventSchema.safeParse(candidate);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0]?.toString() ?? "_";
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      toast.error(Object.values(errs)[0] ?? "Please fix the errors in the form");
      return;
    }
    setErrors({});
    await onSubmit(result.data);
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label>Title *</Label>
        <Input value={values.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
        {err("title")}
      </div>

      <div>
        <Label>Slug *</Label>
        <Input
          value={values.slug}
          onChange={(e) => set("slug", e.target.value)}
          placeholder={slugify(values.title || "my-event")}
        />
        {err("slug")}
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea rows={5} value={values.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
        {err("description")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Start *</Label>
          <Input type="datetime-local" value={values.start_at} onChange={(e) => set("start_at", e.target.value)} />
          {err("start_at")}
        </div>
        <div>
          <Label>End *</Label>
          <Input type="datetime-local" value={values.end_at} onChange={(e) => set("end_at", e.target.value)} />
          {err("end_at")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Timezone *</Label>
          <Select value={values.timezone} onValueChange={(v) => set("timezone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {tzList.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
          {err("timezone")}
        </div>
        <div>
          <Label>Capacity *</Label>
          <Input
            type="number" min={1}
            value={values.capacity}
            onChange={(e) => set("capacity", parseInt(e.target.value || "0", 10))}
          />
          {err("capacity")}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <Label>Venue</Label>
        <div className="flex gap-2">
          <Button type="button" variant={values.venue_type === "physical" ? "default" : "outline"} size="sm" onClick={() => set("venue_type", "physical")}>Physical</Button>
          <Button type="button" variant={values.venue_type === "online" ? "default" : "outline"} size="sm" onClick={() => set("venue_type", "online")}>Online</Button>
        </div>
        {values.venue_type === "physical" ? (
          <div>
            <Label className="text-xs">Address *</Label>
            <Input value={values.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="123 Main St, City" />
            {err("location")}
          </div>
        ) : (
          <div>
            <Label className="text-xs">Online URL *</Label>
            <Input value={values.online_url ?? ""} onChange={(e) => set("online_url", e.target.value)} placeholder="https://meet.example.com/..." />
            {err("online_url")}
          </div>
        )}
      </div>

      <div>
        <Label>Visibility</Label>
        <Select value={values.visibility} onValueChange={(v) => set("visibility", v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public — listed in Explore</SelectItem>
            <SelectItem value="unlisted">Unlisted — link only</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          {values.status === "published"
            ? "Currently published. Use the Unpublish button above to take it offline."
            : "Currently a draft. Use the Publish button above to make it live."}
        </p>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Paid event</Label>
                <p className="text-xs text-muted-foreground">Charge attendees a ticket fee.</p>
              </div>
              <Switch checked={false} disabled aria-label="Paid event (coming soon)" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
