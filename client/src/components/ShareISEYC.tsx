import { ISEYC_DOC_TITLE, ISEYC_PRIMARY_TAGLINE, ISEYC_TOKENS } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

const SHARE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://iseyc-digital-operations-centre.vercel.app";

const text = `${ISEYC_DOC_TITLE} — ${ISEYC_PRIMARY_TAGLINE}`;

export function ShareISEYC({ compact = false }: { compact?: boolean }) {
  const encodedUrl = encodeURIComponent(SHARE_URL);
  const encodedText = encodeURIComponent(text);

  const links = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${SHARE_URL}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "rounded-2xl border border-slate-200 bg-white p-4"}>
      {!compact ? (
        <div className="mb-3 flex items-center gap-2">
          <img src={ISEYC_TOKENS.logoSrc} alt={ISEYC_TOKENS.logoAlt} className="h-8 w-auto" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Share ISEYC DOC</p>
            <p className="text-xs text-slate-500">{ISEYC_TOKENS.positioning}</p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {links.map(link => (
          <Button key={link.label} asChild size="sm" variant="outline">
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </Button>
        ))}
        <Button size="sm" variant="secondary" onClick={copy}>
          <Share2 className="mr-1 h-3.5 w-3.5" />
          Copy link
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        TikTok / Instagram: copy the link and paste into a post or bio. Previews use the ISEYC Open Graph card.
      </p>
    </div>
  );
}
