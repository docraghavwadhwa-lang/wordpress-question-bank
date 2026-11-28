import { useEffect, useState } from "react";
import { Headphones, Volume2, VolumeX, Pause, Play, Music2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ambientSound,
  AMBIENCE_TRACKS,
  type SoundscapePreset,
} from "@/lib/ambient-sound";
import { cn } from "@/lib/utils";

export function AmbiencePopover({ compact }: { compact?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<SoundscapePreset>("rain");
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    if (!ambientSound) return;
    setIsPlaying(ambientSound.getIsPlaying());
    setCurrentPreset(ambientSound.getCurrentPreset() || "rain");
    setVolume(ambientSound.getVolume());

    const unsubscribe = ambientSound.subscribe(() => {
      setIsPlaying(ambientSound.getIsPlaying());
      setCurrentPreset(ambientSound.getCurrentPreset() || "rain");
      setVolume(ambientSound.getVolume());
    });

    return () => unsubscribe();
  }, []);

  const handleToggle = () => {
    if (!ambientSound) return;
    ambientSound.toggle(currentPreset);
  };

  const handleSelectTrack = (presetId: SoundscapePreset) => {
    if (!ambientSound) return;
    setCurrentPreset(presetId);
    ambientSound.play(presetId);
  };

  const handleVolumeChange = (values: number[]) => {
    const val = values[0] ?? 0.7;
    setVolume(val);
    if (ambientSound) {
      ambientSound.setVolume(val);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Study Ambience & Background Sounds"
          title="Study Ambience"
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
            compact ? "h-9 w-9" : "h-9 w-9 sm:h-10 sm:w-10",
            isPlaying
              ? "bg-[#E5B95C]/20 text-[#E5B95C] ring-2 ring-[#E5B95C]/70 shadow-sm animate-pulse"
              : "text-brand-foreground hover:bg-brand-foreground/15"
          )}
        >
          <Headphones className={compact ? "h-4 w-4" : "h-5 w-5"} />
          {isPlaying && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E5B95C] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E5B95C]" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-4 bg-[#082428] border border-[#0D4347] text-[#F7F5F0] shadow-2xl rounded-2xl z-50"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#0D4347]">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-[#E5B95C]" />
              <h4 className="font-display font-semibold text-sm text-[#F7F5F0]">
                Study Ambience
              </h4>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggle}
              className={cn(
                "h-7 px-2.5 text-xs font-semibold rounded-full gap-1.5 transition-colors",
                isPlaying
                  ? "bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90"
                  : "bg-[#0D4347] text-[#F7F5F0] hover:bg-[#0D4347]/80"
              )}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3 w-3" /> Playing
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" /> Turn On
                </>
              )}
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2.5 px-1">
            <button
              type="button"
              onClick={() => handleVolumeChange([volume > 0 ? 0 : 0.7])}
              className="text-[#F7F5F0]/70 hover:text-[#E5B95C] transition-colors cursor-pointer"
              aria-label={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <Slider
              value={[volume]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
            <span className="font-mono text-[11px] text-[#F7F5F0]/60 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* 6 Ambience Tracks */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#E5B95C]/80">
              6 Focus Soundscapes
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {AMBIENCE_TRACKS.map((track) => {
                const active = isPlaying && currentPreset === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleSelectTrack(track.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl p-2 text-left text-xs transition-all border cursor-pointer",
                      active
                        ? "bg-[#0D4347] border-[#E5B95C] text-[#F7F5F0] shadow-sm font-semibold ring-1 ring-[#E5B95C]"
                        : "bg-[#082428]/80 border-[#0D4347]/80 text-[#F7F5F0]/80 hover:bg-[#0D4347]/50 hover:text-[#F7F5F0]"
                    )}
                  >
                    <Music2
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active ? "text-[#E5B95C] animate-bounce" : "text-[#F7F5F0]/50"
                      )}
                    />
                    <span className="truncate">{track.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
