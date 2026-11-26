import React, { useRef } from "react";
import { formatFocusDuration } from "@/lib/apothecary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, Flame, CheckCircle2, FlaskConical } from "lucide-react";
import { toast } from "sonner";

export interface ShareableStudyCardProps {
  userName: string;
  userHandle?: string | null | undefined;
  college?: string | null | undefined;
  todaySeconds: number;
  completedVials: number;
  mcqsSolvedToday: number;
}

export function ShareableStudyCardModal({
  userName,
  userHandle,
  college,
  todaySeconds,
  completedVials,
  mcqsSolvedToday,
}: ShareableStudyCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Render crisp canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // Background: Warm paper navy gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#081b26"); // Deep Navy
    bgGrad.addColorStop(0.5, "#0d2b3c");
    bgGrad.addColorStop(1, "#071720");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative radial glow
    const radial = ctx.createRadialGradient(width / 2, 600, 50, width / 2, 600, 600);
    radial.addColorStop(0, "rgba(45, 212, 191, 0.18)"); // Teal
    radial.addColorStop(1, "rgba(45, 212, 191, 0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // Subtle paper frame border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, width - 120, height - 120);

    // Inner gold accent line
    ctx.strokeStyle = "rgba(217, 119, 6, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, width - 160, height - 160);

    // Header: Elixir Brand
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "italic 64px 'Newsreader', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("ELIXIR", width / 2, 220);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 24px 'Hanken Grotesk', sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("BY NIRMAYA CARE • STUDY SANCTUARY", width / 2, 270);

    // Divider
    ctx.strokeStyle = "rgba(45, 212, 191, 0.4)";
    ctx.beginPath();
    ctx.moveTo(340, 320);
    ctx.lineTo(740, 320);
    ctx.stroke();

    // Student Badge
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 52px 'Newsreader', serif";
    ctx.fillText(userName, width / 2, 420);

    if (userHandle || college) {
      ctx.fillStyle = "#2DD4BF"; // Teal accent
      ctx.font = "28px 'Hanken Grotesk', sans-serif";
      const sub = [userHandle ? `@${userHandle.replace(/^@/, "")}` : "", college || ""].filter(Boolean).join(" • ");
      ctx.fillText(sub, width / 2, 470);
    }

    // Date
    const todayStr = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

    ctx.fillStyle = "#CBD5E1";
    ctx.font = "400 26px 'Hanken Grotesk', sans-serif";
    ctx.fillText(todayStr, width / 2, 530);

    // Stat 1: Total Focus Hours Card
    drawStatCard(ctx, 160, 620, 760, 240, "#0E354A", "TODAY'S DEEP FOCUS", formatFocusDuration(todaySeconds), "#2DD4BF");

    // Stat 2: Apothecary Vials Sealed
    drawStatCard(ctx, 160, 900, 760, 220, "#0E354A", "APOTHECARY VIALS SEALED", `${completedVials} Vials Distilled`, "#FBBF24");

    // Stat 3: MCQs Solved
    drawStatCard(ctx, 160, 1160, 760, 220, "#0E354A", "Q-BANK PRACTICE COMPLETED", `${mcqsSolvedToday} Questions Solved`, "#38BDF8");

    // Inspirational Quote
    ctx.fillStyle = "#94A3B8";
    ctx.font = "italic 32px 'Newsreader', serif";
    ctx.fillText('"Medicine is an art whose practice is guided by science."', width / 2, 1530);
    ctx.font = "24px 'Hanken Grotesk', sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("— Sir William Osler", width / 2, 1580);

    // Footer
    ctx.fillStyle = "#2DD4BF";
    ctx.font = "600 26px 'Hanken Grotesk', sans-serif";
    ctx.fillText("elixir.nirmayacare.com", width / 2, 1750);

    // Trigger PNG Download
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `Elixir-Focus-${new Date().toISOString().split("T")[0]}.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Study card downloaded for your Instagram / WhatsApp story!");
  };

  function drawStatCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    bg: string,
    label: string,
    value: string,
    accentColor: string
  ) {
    ctx.save();
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 24);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 22px 'Hanken Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + 60);

    ctx.fillStyle = accentColor;
    ctx.font = "bold 68px 'Newsreader', serif";
    ctx.fillText(value, x + w / 2, y + 150);
    ctx.restore();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Share2 className="h-4 w-4" /> Share Today's Progress
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Daily Focus Card</DialogTitle>
        </DialogHeader>

        {/* Card Preview */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#081b26] to-[#0d2b3c] p-6 text-center text-white shadow-2xl">
          <div className="font-display text-xs tracking-widest text-accent uppercase">Elixir • Study Sanctuary</div>
          <h3 className="mt-1 font-display text-2xl font-bold text-white">{userName}</h3>
          {college && <p className="text-xs text-muted-foreground">{college}</p>}

          <div className="mt-5 space-y-3">
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center justify-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-accent" /> Focus Duration Today
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-accent">
                {formatFocusDuration(todaySeconds)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center justify-center gap-1">
                  <FlaskConical className="h-3 w-3 text-amber-400" /> Vials Sealed
                </span>
                <p className="mt-1 font-display text-xl font-bold text-amber-300">
                  {completedVials}
                </p>
              </div>

              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-sky-400" /> MCQs Solved
                </span>
                <p className="mt-1 font-display text-xl font-bold text-sky-300">
                  {mcqsSolvedToday}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 font-display italic text-xs text-slate-400">
            "Medicine is an art whose practice is guided by science."
          </p>
        </div>

        {/* Hidden canvas for PNG export */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={handleDownload} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="h-4 w-4" /> Download Story PNG (1080x1920)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
