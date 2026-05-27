import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  bucket: "host-logos" | "event-covers" | "gallery-uploads";
  folder: string; // e.g. hostId or eventId or `${userId}/${eventId}`
  currentUrl?: string | null;
  accept?: string;
  label?: string;
  onUploaded: (info: { path: string; publicUrl: string | null }) => void | Promise<void>;
}

export function ImageUpload({ bucket, folder, currentUrl, accept = "image/*", label = "Upload image", onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;

      let publicUrl: string | null = null;
      if (bucket !== "gallery-uploads") {
        publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        setPreview(publicUrl);
      } else {
        setPreview(URL.createObjectURL(file));
      }
      await onUploaded({ path, publicUrl });
      toast.success("Uploaded");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {preview && (
        <img src={preview} alt="" className="h-40 w-full rounded-lg border object-cover" />
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {label}
      </Button>
    </div>
  );
}
