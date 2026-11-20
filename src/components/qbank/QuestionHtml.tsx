import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function QuestionHtml({ html, className = "" }: { html: string; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<{ host: HTMLElement; src: string; alt: string }[]>([]);
  const [expanded, setExpanded] = useState<{ src: string; alt: string } | null>(null);
  useEffect(() => {
    if (root.current) root.current.innerHTML = html;
    const wrappers: HTMLElement[] = [];
    const targets = Array.from(root.current?.querySelectorAll("img") ?? []).map(img => {
      const host = document.createElement("span"); host.className = "qb-image-wrap";
      img.parentNode?.insertBefore(host, img); host.appendChild(img); wrappers.push(host);
      return { host, src: img.src, alt: img.alt || "Question image" };
    });
    setImages(targets);
    return () => { for (const host of wrappers) { const img = host.querySelector("img"); if (img) host.replaceWith(img); } };
  }, [html]);
  return <><div ref={root} className={`qb-html ${className}`} />
    {images.map((image, index) => createPortal(<Button type="button" size="icon" variant="secondary" title="Enlarge image" aria-label="Enlarge image" className="qb-image-zoom" onClick={event => { event.stopPropagation(); setExpanded(image); }}><ZoomIn className="h-4 w-4" /></Button>, image.host, String(index)))}
    <Dialog open={!!expanded} onOpenChange={open => { if (!open) setExpanded(null); }}><DialogContent aria-describedby={undefined} className="image-viewer [&>button:last-child]:hidden">
      <DialogTitle className="sr-only">Question image</DialogTitle>
      <Button size="icon" variant="secondary" className="absolute right-4 top-4 z-10" aria-label="Close image" onClick={() => setExpanded(null)}><X /></Button>
      {expanded && <img src={expanded.src} alt={expanded.alt} className="min-h-0 max-h-full max-w-full object-contain" />}
    </DialogContent></Dialog>
  </>;
}