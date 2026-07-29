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

// Sahadaki her satırın dikey konumu (yüzde, üstten alta: FWD -> MID -> DEF -> GK)
const ROW_Y: Record<Position, number> = {
  FWD: 15,
  MID: 39,
  DEF: 63,
  GK: 87,
};

// Bir satırdaki n oyuncu için eşit aralıklı yatay konumlar (yüzde)
function rowX(count: number): number[] {
  if (count === 1) return [50];
  const margin = 14;
  const span = 100 - margin * 2;
  return Array.from({ length: count }, (_, i) => margin + (span * i) / (count - 1));
}

interface PositionedSlot extends SquadSlot {
  x: number;
  y: number;
}

function layoutSlots(slots: SquadSlot[]): PositionedSlot[] {
  const positioned: PositionedSlot[] = [];
  (["FWD", "MID", "DEF", "GK"] as Position[]).forEach((pos) => {
    const inRow = slots.filter((s) => s.position === pos);
    const xs = rowX(inRow.length);
    inRow.forEach((s, i) => {
      positioned.push({ ...s, x: xs[i], y: ROW_Y[pos] });
    });
  });
  return positioned;
}

export function Pitch({
  slots,
  captainId,
  lastWeekPoints,
  onSlotTap,
}: {
  slots: SquadSlot[];
  captainId: string | null;
  lastWeekPoints?: Record<string, number>;
  onSlotTap: (slot: SquadSlot) => void;
}) {
  const positioned = layoutSlots(slots);

  return (
    <div className="mx-auto w-full max-w-[360px] sm:max-w-[440px]">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-pitch">
        {/* Saha çizgileri — viewBox konteynerle aynı 3:4 oranında, bu yüzden bozulma olmaz */}
        <svg
          viewBox="0 0 300 400"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
          aria-hidden="true"
        >
          <rect x="6" y="6" width="288" height="388" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <line x1="6" y1="200" x2="294" y2="200" stroke="#F5F1E8" strokeWidth="1.5" />
          <circle cx="150" cy="200" r="38" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <circle cx="150" cy="200" r="2" fill="#F5F1E8" />
          {/* üst kale alanı */}
          <rect x="90" y="6" width="120" height="46" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <rect x="122" y="6" width="56" height="18" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <circle cx="150" cy="40" r="2" fill="#F5F1E8" />
          <path d="M 118 52 A 34 34 0 0 0 182 52" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          {/* alt kale alanı */}
          <rect x="90" y="348" width="120" height="46" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <rect x="122" y="376" width="56" height="18" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <circle cx="150" cy="360" r="2" fill="#F5F1E8" />
          <path d="M 118 348 A 34 34 0 0 1 182 348" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
        </svg>

        {positioned.map((slot) => (
          <button
            key={slot.id}
            onClick={() => onSlotTap(slot)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 active:scale-95 transition-transform"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            aria-label={
              slot.player
                ? `${slot.player.name}, ${slot.position} — düzenle`
                : `Boş ${slot.position} slotu — oyuncu ekle`
            }
          >
            {slot.player ? (
              <TeamBadge
                team={slot.player.team}
                size={34}
                role={slot.player.id === captainId ? "captain" : undefined}
              />
            ) : (
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-dashed border-ivory/40 text-ivory/50">
                <span className="text-base leading-none">+</span>
              </div>
            )}
            <span className="max-w-[62px] truncate text-[10px] font-medium text-ivory">
              {slot.player ? slot.player.name.split(" ").pop() : slot.position}
            </span>
            {slot.player && (
              <span className="flex items-center gap-1">
                <span className="text-[8px] font-medium text-ivory/75">
                  {slot.player.team}
                </span>
                {lastWeekPoints?.[slot.player.id] !== undefined && (
                  <span
                    className={`rounded-sm px-1 text-[8px] font-semibold ${
                      lastWeekPoints[slot.player.id] > 0
                        ? "bg-green-500/90 text-ivory"
                        : lastWeekPoints[slot.player.id] < 0
                        ? "bg-red-500/90 text-ivory"
                        : "bg-ivory/20 text-ivory"
                    }`}
                  >
                    {lastWeekPoints[slot.player.id] > 0 ? "+" : ""}
                    {lastWeekPoints[slot.player.id]}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
