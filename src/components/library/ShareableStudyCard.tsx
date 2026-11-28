import React, { useRef, useState } from "react";
import { formatFocusDuration } from "@/lib/apothecary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Flame, CheckCircle2, FlaskConical, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export interface ShareableStudyCardProps {
  userName: string;
  userHandle?: string | null | undefined;
  college?: string | null | undefined;
  todaySeconds: number;
  completedVials: number;
  mcqsSolvedToday: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ShareableStudyCardModal({
  userName,
  userHandle,
  college,
  todaySeconds,
  completedVials,
  mcqsSolvedToday,
  open,
  onOpenChange,
}: ShareableStudyCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleShareOrDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    const toastId = toast.loading("Generating your high-res Sanctuary card...");

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas context");

      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      // 1. Background: Deep Elixir Sanctuary Teal Gradient (#082428 -> #165E63)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#082428");
      bgGrad.addColorStop(0.5, "#0D3E43");
      bgGrad.addColorStop(1, "#165E63");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Decorative Sanctuary Radial Glows
      const radial1 = ctx.createRadialGradient(width / 2, 450, 40, width / 2, 450, 650);
      radial1.addColorStop(0, "rgba(75, 160, 159, 0.28)");
      radial1.addColorStop(1, "rgba(75, 160, 159, 0)");
      ctx.fillStyle = radial1;
      ctx.fillRect(0, 0, width, height);

      const radial2 = ctx.createRadialGradient(width / 2, 1200, 50, width / 2, 1200, 700);
      radial2.addColorStop(0, "rgba(229, 185, 92, 0.16)");
      radial2.addColorStop(1, "rgba(229, 185, 92, 0)");
      ctx.fillStyle = radial2;
      ctx.fillRect(0, 0, width, height);

      // 3. Elegant Gold & Paper Frames
      ctx.strokeStyle = "rgba(244, 241, 234, 0.15)";
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, width - 120, height - 120);

      // Inner Gold Accent Line (#E5B95C / 40)
      ctx.strokeStyle = "rgba(229, 185, 92, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(80, 80, width - 160, height - 160);

      // 4. Header: Elixir Logo & Brand Badge
      // Draw crisp pure white logo directly onto teal background (no white box)
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = "/elixir-header-latest.webp";
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
      });

      if (logoImg.naturalWidth) {
        const logoW = 320;
        const logoH = (logoW / logoImg.naturalWidth) * logoImg.naturalHeight;
        const tCanvas = document.createElement("canvas");
        tCanvas.width = logoImg.naturalWidth;
        tCanvas.height = logoImg.naturalHeight;
        const tCtx = tCanvas.getContext("2d");
        if (tCtx) {
          tCtx.drawImage(logoImg, 0, 0);
          tCtx.globalCompositeOperation = "source-in";
          tCtx.fillStyle = "#FFFFFF";
          tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);
          ctx.drawImage(tCanvas, width / 2 - logoW / 2, 160, logoW, logoH);
        } else {
          ctx.drawImage(logoImg, width / 2 - logoW / 2, 160, logoW, logoH);
        }
      } else {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "700 60px 'Newsreader', Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText("ELIXIR", width / 2, 210);
      }

      ctx.fillStyle = "#E5B95C";
      ctx.font = "600 24px 'Hanken Grotesk', sans-serif";
      ctx.letterSpacing = "6px";
      ctx.textAlign = "center";
      ctx.fillText("ELIXIR • SANCTUARY", width / 2, 280);

      // Subtle Divider
      ctx.strokeStyle = "rgba(229, 185, 92, 0.5)";
      ctx.beginPath();
      ctx.moveTo(360, 330);
      ctx.lineTo(720, 330);
      ctx.stroke();

      // 5. Student Details
      ctx.fillStyle = "#F7F5F0";
      ctx.font = "bold 54px 'Newsreader', Georgia, serif";
      ctx.fillText(userName, width / 2, 430);

      if (userHandle || college) {
        ctx.fillStyle = "#4BA09F";
        ctx.font = "600 28px 'Hanken Grotesk', sans-serif";
        const sub = [userHandle ? `@${userHandle.replace(/^@/, "")}` : "", college || ""].filter(Boolean).join(" • ");
        ctx.fillText(sub, width / 2, 485);
      }

      // Date in IST
      const todayStr = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());

      ctx.fillStyle = "rgba(247, 245, 240, 0.75)";
      ctx.font = "500 26px 'Hanken Grotesk', sans-serif";
      ctx.fillText(todayStr, width / 2, 545);

      // 6. Stat Tiles with Glassmorphism
      drawStatTile(
        ctx,
        140,
        630,
        800,
        240,
        "rgba(8, 36, 40, 0.65)",
        "TODAY'S DEEP FOCUS",
        formatFocusDuration(todaySeconds),
        "#E5B95C"
      );

      drawStatTile(
        ctx,
        140,
        910,
        800,
        220,
        "rgba(8, 36, 40, 0.65)",
        "APOTHECARY VIALS SEALED",
        `${completedVials} Vials Distilled`,
        "#4BA09F"
      );

      drawStatTile(
        ctx,
        140,
        1170,
        800,
        220,
        "rgba(8, 36, 40, 0.65)",
        "MCQS SOLVED TODAY",
        `${mcqsSolvedToday} Questions Solved`,
        "#F7F5F0"
      );

      // 7. Medical Quote in Normal (Non-Italic) Style with strict boundary wrapping
      ctx.fillStyle = "#F4F1EA";
      ctx.font = "500 32px 'Newsreader', Georgia, serif"; // Strictly non-italic
      ctx.textAlign = "center";

      function wrapCanvasText(
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
      ) {
        const words = text.split(" ");
        let line = "";
        let currentY = y;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = context.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            context.fillText(line.trim(), x, currentY);
            line = words[n] + " ";
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        context.fillText(line.trim(), x, currentY);
        return currentY;
      }

      const quoteMaxW = width - 260; // 820px max inside 1080px canvas (130px padding on each side)
      const quoteEndY = wrapCanvasText(
        ctx,
        '"Medicine is an art whose practice is guided by science."',
        width / 2,
        1530,
        quoteMaxW,
        46
      );

      ctx.font = "24px 'Hanken Grotesk', sans-serif";
      ctx.fillStyle = "rgba(244, 241, 234, 0.75)";
      ctx.fillText("— Sir William Osler", width / 2, quoteEndY + 45);

      // 8. Footer Link
      ctx.fillStyle = "#E5B95C";
      ctx.font = "600 26px 'Hanken Grotesk', sans-serif";
      ctx.fillText("elixir.nirmayacare.com", width / 2, 1750);

      const dataUrl = canvas.toDataURL("image/png");
      const fileName = `Elixir-Sanctuary-Focus-${new Date().toISOString().split("T")[0]}.png`;

      // 9. Platform-Specific Export (Capacitor Native vs Web)
      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = dataUrl.split(",")[1];
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });

          await Share.share({
            title: "Elixir • Sanctuary Focus Progress",
            text: "Today's medical study progress on Elixir Sanctuary",
            url: writeResult.uri,
            dialogTitle: "Share Today's Focus Card",
          });

          toast.dismiss(toastId);
          toast.success("Card opened in Android share sheet!");
          return;
        } catch (nativeErr: any) {
          console.warn("Capacitor native share error, falling back to Web Share / Download", nativeErr);
        }
      }

      // Web: Check for Web Share API with File support
      if (typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "Elixir • Sanctuary Focus",
              text: "Today's medical study progress on Elixir Sanctuary",
            });
            toast.dismiss(toastId);
            toast.success("Focus card shared successfully!");
            return;
          }
        } catch {
          /* ignore and proceed to <a> download */
        }
      }

      // Default Web: <a download> flow
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      toast.dismiss(toastId);
      toast.success("Focus card downloaded for WhatsApp & Instagram story!");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to generate focus card");
    } finally {
      setIsExporting(false);
    }
  };

  function drawStatTile(
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
    // Glassmorphic Tile
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 28);
    ctx.fill();

    // Subtle Gold Border
    ctx.strokeStyle = "rgba(229, 185, 92, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(247, 245, 240, 0.7)";
    ctx.font = "bold 22px 'Hanken Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + 65);

    ctx.fillStyle = accentColor;
    ctx.font = "bold 64px 'Newsreader', Georgia, serif";
    ctx.fillText(value, x + w / 2, y + 155);
    ctx.restore();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-[#082428] border border-[#0D4347] text-[#F7F5F0]">
        <DialogHeader className="border-b border-[#0D4347] pb-3">
          <DialogTitle className="font-display text-xl text-[#E5B95C] flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Today's Focus Card
          </DialogTitle>
          <p className="text-xs text-[#F7F5F0]/70">
            Export a high-resolution story card to celebrate your daily discipline.
          </p>
        </DialogHeader>

        {/* Card Preview with Deep Teal Gradient & Gold Accents */}
        <div className="relative overflow-hidden rounded-2xl border border-[#E5B95C]/40 bg-gradient-to-b from-[#082428] via-[#0D3E43] to-[#165E63] p-6 text-center text-[#F7F5F0] shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img
              src="/elixir-header-latest.webp"
              alt="Elixir"
              className="h-5 w-auto object-contain brightness-0 invert"
            />
            <span className="font-display text-xs tracking-widest text-[#E5B95C] uppercase font-bold">
              SANCTUARY
            </span>
          </div>

          <h3 className="mt-2 font-display text-2xl font-bold text-[#F7F5F0]">{userName}</h3>
          {college && <p className="text-xs text-[#F7F5F0]/70">{college}</p>}

          <div className="mt-5 space-y-3">
            <div className="rounded-xl bg-[#082428]/60 p-3.5 border border-[#E5B95C]/30 shadow-inner">
              <span className="text-[10px] uppercase font-semibold text-[#F7F5F0]/75 tracking-wider flex items-center justify-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-[#E5B95C]" /> Focus Duration Today
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-[#E5B95C]">
                {formatFocusDuration(todaySeconds)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#082428]/60 p-3 border border-[#0D4347]">
                <span className="text-[10px] uppercase font-semibold text-[#F7F5F0]/75 tracking-wider flex items-center justify-center gap-1">
                  <FlaskConical className="h-3.5 w-3.5 text-[#4BA09F]" /> Vials Sealed
                </span>
                <p className="mt-1 font-display text-xl font-bold text-[#4BA09F]">
                  {completedVials}
                </p>
              </div>

              <div className="rounded-xl bg-[#082428]/60 p-3 border border-[#0D4347]">
                <span className="text-[10px] uppercase font-semibold text-[#F7F5F0]/75 tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" /> MCQs Solved
                </span>
                <p className="mt-1 font-display text-xl font-bold text-[#F7F5F0]">
                  {mcqsSolvedToday}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 max-w-[280px] sm:max-w-xs mx-auto text-center">
            <p className="font-display text-xs text-[#F7F5F0]/85 leading-relaxed break-words">
              "Medicine is an art whose practice is guided by science."
            </p>
            <p className="text-[10px] text-[#F7F5F0]/60 mt-1">— Sir William Osler</p>
          </div>
        </div>

        {/* Hidden canvas for high-resolution 1080x1920 PNG export */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="mt-4">
          <Button
            onClick={handleShareOrDownload}
            disabled={isExporting}
            className="w-full gap-2 bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90 shadow-md"
          >
            {Capacitor.isNativePlatform() ? (
              <>
                <Share2 className="h-4 w-4" /> Share Story to Instagram / WhatsApp
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Download Story PNG (1080x1920)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export function ShareableStudyCard({
  onClose,
  todayFocusHours,
  sealedVialsCount,
  currentStreak,
  currentSubject,
}: {
  onClose: () => void;
  todayFocusHours: number;
  sealedVialsCount: number;
  currentStreak?: number;
  currentSubject?: string;
}) {
  return (
    <ShareableStudyCardModal
      userName="Doctor"
      todaySeconds={Math.round(todayFocusHours * 3600)}
      completedVials={sealedVialsCount}
      mcqsSolvedToday={0}
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    />
  );
}
