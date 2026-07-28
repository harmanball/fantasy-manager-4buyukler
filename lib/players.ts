import { TeamCode } from "./teams";
import { supabase } from "./supabase";

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface Player {
  id: string;
  name: string;
  team: TeamCode;
  position: Position;
}

export async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, name, position, is_active, teams(short_code)")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Oyuncular çekilemedi:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const teamRel = row.teams as unknown as { short_code: TeamCode } | { short_code: TeamCode }[];
    const shortCode = Array.isArray(teamRel) ? teamRel[0]?.short_code : teamRel?.short_code;
    return {
      id: row.id as string,
      name: row.name as string,
      position: row.position as Position,
      team: shortCode,
    };
  });
}


export const MOCK_PLAYERS: Player[] = [
  { id: "gs-gk-1", name: "Günay Güvenç", team: "GS", position: "GK" },
  { id: "gs-def-1", name: "Davinson Sánchez", team: "GS", position: "DEF" },
  { id: "gs-def-2", name: "Abdülkerim Bardakcı", team: "GS", position: "DEF" },
  { id: "gs-def-3", name: "Eren Elmalı", team: "GS", position: "DEF" },
  { id: "gs-mid-1", name: "Lucas Torreira", team: "GS", position: "MID" },
  { id: "gs-mid-2", name: "Kerem Demirbay", team: "GS", position: "MID" },
  { id: "gs-fwd-1", name: "Victor Osimhen", team: "GS", position: "FWD" },
  { id: "gs-fwd-2", name: "Yunus Akgün", team: "GS", position: "FWD" },

  { id: "fb-gk-1", name: "Ederson", team: "FB", position: "GK" },
  { id: "fb-def-1", name: "Bright Osayi-Samuel", team: "FB", position: "DEF" },
  { id: "fb-def-2", name: "Rodrigo Becão", team: "FB", position: "DEF" },
  { id: "fb-def-3", name: "Fred", team: "FB", position: "DEF" },
  { id: "fb-mid-1", name: "İsmail Yüksek", team: "FB", position: "MID" },
  { id: "fb-mid-2", name: "Sebastian Szymański", team: "FB", position: "MID" },
  { id: "fb-fwd-1", name: "Edin Džeko", team: "FB", position: "FWD" },
  { id: "fb-fwd-2", name: "Dušan Tadić", team: "FB", position: "FWD" },

  { id: "bjk-gk-1", name: "Ersin Destanoğlu", team: "BJK", position: "GK" },
  { id: "bjk-def-1", name: "Rafa Silva", team: "BJK", position: "DEF" },
  { id: "bjk-def-2", name: "Gökhan Sazdağı", team: "BJK", position: "DEF" },
  { id: "bjk-def-3", name: "Emirhan Topçu", team: "BJK", position: "DEF" },
  { id: "bjk-mid-1", name: "Salih Uçan", team: "BJK", position: "MID" },
  { id: "bjk-mid-2", name: "Gedson Fernandes", team: "BJK", position: "MID" },
  { id: "bjk-fwd-1", name: "Ciro Immobile", team: "BJK", position: "FWD" },
  { id: "bjk-fwd-2", name: "El Bilal Touré", team: "BJK", position: "FWD" },

  { id: "ts-gk-1", name: "Uğurcan Çakır", team: "TS", position: "GK" },
  { id: "ts-def-1", name: "Stefan Savić", team: "TS", position: "DEF" },
  { id: "ts-def-2", name: "Ramip Ramazan", team: "TS", position: "DEF" },
  { id: "ts-def-3", name: "Serdar Saatçı", team: "TS", position: "DEF" },
  { id: "ts-mid-1", name: "Anastasios Bakasetas", team: "TS", position: "MID" },
  { id: "ts-mid-2", name: "Fatih Kurucuk", team: "TS", position: "MID" },
  { id: "ts-fwd-1", name: "Paul Onuachu", team: "TS", position: "FWD" },
  { id: "ts-fwd-2", name: "Felipe Augusto", team: "TS", position: "FWD" },
];
