import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareButton({
  title,
  text,
  path,
  size = "sm",
  variant = "outline",
}: {
  title: string;
  text?: string;
  path?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  async function handleShare() {
    const url = typeof window !== "undefined"
      ? new URL(path ?? window.location.pathname + window.location.search, window.location.origin).toString()
      : path ?? "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't share. Copy this link: " + url);
    }
  }

  return (
    <Button type="button" size={size} variant={variant} onClick={handleShare}>
      <Share2 className="mr-2 h-4 w-4" /> Share
    </Button>
  );
}
