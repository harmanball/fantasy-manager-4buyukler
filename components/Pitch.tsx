"use client";

import { Formation, FORMATION_LAYOUT } from "@/lib/teams";
import { Player, Position } from "@/lib/players";
import { TeamBadge } from "./TeamBadge";

export interface SquadSlot {
  id: string;
  position: Position;
  player: Player | null;
}

export function buildSlots(formation: Formation): SquadSlot[] {
  const layout = FORMATION_LAYOUT[formation];
  const slots: SquadSlot[] = [];
  (["FWD", "MID", "DEF", "GK"] as Position[]).forEach((pos) => {
    for (let i = 0; i < layout[pos]; i++) {
      slots.push({ id: `${pos}-${i}`, position: pos, player: null });
    }
  });
  return slots;
}

function groupByPosition(slots: SquadSlot[]) {
  const rows: SquadSlot[][] = [];
  let current: Position | null = null;
  let bucket: SquadSlot[] = [];
  for (const s of slots) {
    if (s.position !== current) {
      if (bucket.length) rows.push(bucket);
      bucket = [];
      current = s.position;
    }
    bucket.push(s);
  }
  if (bucket.length) rows.push(bucket);
  return rows;
}

export function Pitch({
  slots,
  captainId,
  viceId,
  onSlotTap,
}: {
  slots: SquadSlot[];
  captainId: string | null;
  viceId: string | null;
  onSlotTap: (slot: SquadSlot) => void;
}) {
  const rows = groupByPosition(slots);

  return (
    <div className="relative overflow-hidden rounded-lg bg-pitch px-2 py-5 sm:px-4 sm:py-6">
      <svg
        viewBox="0 0 600 400"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
        aria-hidden="true"
      >
        <rect x="10" y="10" width="580" height="380" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
        <line x1="10" y1="200" x2="590" y2="200" stroke="#F5F1E8" strokeWidth="1.5" />
        <circle cx="300" cy="200" r="45" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
        <circle cx="300" cy="200" r="2.5" fill="#F5F1E8" />
        {/* üst kale — ceza sahası + kale sahası */}
        <rect x="190" y="10" width="220" height="70" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
        <rect x="255" y="10" width="90" height="26" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
        <circle cx="300" cy="58" r="2.5" fill="#F5F1E8" />
        <path d="M 240 80 A 60 60 0 0 0 360 80" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
        {/* alt kale — ceza sahası + kale sahası */}
        <rect x="190" y="320" width="220" height="70" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
        <rect x="255" y="364" width="90" height="26" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
        <circle cx="300" cy="342" r="2.5" fill="#F5F1E8" />
        <path d="M 240 320 A 60 60 0 0 1 360 320" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
      </svg>

      <div className="relative flex flex-col gap-4 sm:gap-6">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-around">
            {row.map((slot) => (
              <button
                key={slot.id}
                onClick={() => onSlotTap(slot)}
                className="flex min-w-[52px] flex-col items-center gap-1 rounded-md py-1 active:scale-95 transition-transform"
                aria-label={
                  slot.player
                    ? `${slot.player.name}, ${slot.position} — düzenle`
                    : `Boş ${slot.position} slotu — oyuncu ekle`
                }
              >
                {slot.player ? (
                  <TeamBadge
                    team={slot.player.team}
                    size={36}
                    role={
                      slot.player.id === captainId
                        ? "captain"
                        : slot.player.id === viceId
                        ? "vice"
                        : undefined
                    }
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-ivory/40 text-ivory/50">
                    <span className="text-lg leading-none">+</span>
                  </div>
                )}
                <span className="max-w-[64px] truncate text-[10px] font-medium text-ivory sm:text-[11px]">
                  {slot.player ? slot.player.name.split(" ").pop() : slot.position}
                </span>
                {slot.player && (
                  <span className="text-[9px] font-medium text-ivory/75">{slot.player.team}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
