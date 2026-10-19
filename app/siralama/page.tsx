"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchLeaderboardWithTrend,
  fetchGameweekLeaderboard,
  LeaderboardRowWithTrend,
} from "@/lib/leaderboard";
import { fetchFinishedGameweeks, FinishedGameweek } from "@/lib/gameweekResult";
import { useSession } from "@/lib/useSession";
import { fetchWeekTopPlayer } from "@/lib/teamOfWeek";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonRow } from "@/components/Skeleton";
import { shareText, getSiteUrl } from "@/lib/share";
import { TeamEmblem } from "@/components/TeamEmblem";
import { JerseyIcon } from "@/components/JerseyIcon";
import { EmblemId } from "@/lib/emblems";
import { TeamCode } from "@/lib/teams";

// Sıralamadaki her satırın çerçeve rengini belirler: 1. yeşil, 2-3. mavi,
// (sadece showRelegation açıksa) son 3 satır kırmızı — hiçbir ikon
// kullanılmaz, sadece kalın renkli çerçeve. Rütbe rengi HER ZAMAN önce
// gelir — kendi satırın (isMe) ilk 3'te ya da son 3'teyse yine o rütbe
// rengini alır, "(sen)" etiketi zaten kimin satırı olduğunu gösteriyor.
// isMe altın çerçeve sadece rütbe rengi uygulanmayan orta satırlarda çıkar.
