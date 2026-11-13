import { DumbbellIcon } from "@/components/icons";
import { Activity, ChefHat, FileUser, Gamepad2, GraduationCap, Heart, Music, Wallet } from "lucide-react";

export function ModuleIcon({ id }: { id: string }) {
  switch (id) {
    case "workout":
      return (
        <>
          <DumbbellIcon className="size-5 anim-dumbbell" />
        </>
      );
    case "finance":
      return (
        <>
          <Wallet className="size-5" />
        </>
      );
    case "cashflow":
      return (
        <>
          <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 overflow-visible"
          aria-hidden="true"
          >
          <g className="anim-bill-back text-[#00B0FF]/70">
          <rect width="20" height="12" x="2" y="6" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
          </g>
          <g className="anim-bill-front">
          <rect width="20" height="12" x="2" y="6" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
          </g>
          </svg>
        </>
      );
    case "recipes":
      return (
        <>
          <ChefHat className="size-5 anim-hat" />
          <svg
          className="absolute size-5 anim-tomato opacity-0 pointer-events-none"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          >
          <path d="M12 5 C12 5 11 2 8 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 5 C12 5 13 2 16 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 7 C12 6 12 5 12 4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="14" r="7" fill="#ef4444" />
          <ellipse cx="9.5" cy="11.5" rx="1.8" ry="1.2" fill="rgba(255,255,255,0.25)" transform="rotate(-20 9.5 11.5)" />
          </svg>
        </>
      );
    case "minecraft":
      return (
        <>
          <Gamepad2 className="size-5" />
        </>
      );
    case "minor":
      return (
        <>
          <GraduationCap className="size-5" />
        </>
      );
    case "resume":
      return (
        <>
          <FileUser className="size-5" />
        </>
      );
    case "lyric_quotes":
      return (
        <>
          <Music className="size-5" />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] anim-note-1 opacity-0 pointer-events-none select-none text-[#7C4DFF]" aria-hidden="true">♪</span>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] anim-note-2 opacity-0 pointer-events-none select-none text-[#7C4DFF]" aria-hidden="true">♫</span>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] anim-note-3 opacity-0 pointer-events-none select-none text-[#7C4DFF]" aria-hidden="true">♩</span>
        </>
      );
    case "you":
      return (
        <>
          <Heart className="size-5" />
          <Heart className="absolute size-2 text-[#FF4081]/70 anim-heart-1 opacity-0 pointer-events-none" aria-hidden="true" />
          <Heart className="absolute size-2 text-[#FF4081] anim-heart-2 opacity-0 pointer-events-none" aria-hidden="true" />
          <Heart className="absolute size-2.5 text-[#FF4081] anim-heart-3 opacity-0 pointer-events-none" aria-hidden="true" />
        </>
      );
    case "pulse":
      return (
        <>
          <Activity className="size-5" />
          <svg
          viewBox="0 0 60 20"
          className="absolute inset-0 w-full h-full p-1.5 pointer-events-none"
          aria-hidden="true"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          >
          <polyline
          className="anim-ekg"
          points="0,10 10,10 14,2 18,18 22,2 26,18 30,10 40,10 42,6 44,14 46,10 60,10"
          stroke="rgba(255,23,68,0.95)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="120"
          strokeDashoffset="120"
          />
          </svg>
        </>
      );
    default:
      return null;
  }
}
