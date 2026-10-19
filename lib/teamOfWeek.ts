import { supabase } from "./supabase";
import { Formation, FORMATIONS, FORMATION_LAYOUT, TeamCode, TEAM_LIMIT } from "./teams";
import { Position } from "./players";

export interface TeamOfWeekPlayer {
  id: string;
  name: string;
  team: TeamCode;
  position: Position;
  points: number;
  isMotm: boolean;
  // Eşitlik bozmak için (puanlar aynıysa sırayla bakılır):
  rating: number; // maç reytingi (yoksa 0)
  goals: number;
  assists: number;
  minutes: number;
  won: boolean; // oyuncunun takımı maçı kazandı mı
}

export interface TeamOfWeekResult {
  formation: Formation;
  players: TeamOfWeekPlayer[];
}

const EMPTY_RESULT: TeamOfWeekResult = { formation: "4-3-3", players: [] };

// TEK sıralama kuralı: hem 11'in kurulması, hem kaptan, hem "Haftanın
