/**
 * Build Battle engine.
 * All state is stored in localStorage.
 * Each battle has two cars; the community votes on the winner.
 * Battles run for 7 days, then are archived to history.
 */

import { addBalance, addTransaction } from "./revbucks";

export interface BattleCar {
  carName: string;
  ownerName: string;
  ownerPrincipal: string;
  imageUrl: string;
  description: string;
}

export interface Battle {
  id: string;
  carA: BattleCar;
  carB: BattleCar;
  votesA: string[]; // array of voter principal IDs
  votesB: string[];
  createdAt: number; // ms timestamp
  endsAt: number; // ms timestamp
  winnerSide: "A" | "B" | null; // null = still active or no votes
  winnerRewarded: boolean;
}

const STORAGE_KEY = "revspace_build_battles";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
export const BATTLE_WIN_RB = 100;

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadAll(): Battle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Battle[]) : [];
  } catch {
    return [];
  }
}

function saveAll(battles: Battle[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(battles));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isBattleActive(battle: Battle): boolean {
  return Date.now() < battle.endsAt;
}

export function msUntilBattleEnd(battle: Battle): number {
  return Math.max(0, battle.endsAt - Date.now());
}

export function formatBattleTimeLeft(battle: Battle): string {
  const ms = msUntilBattleEnd(battle);
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** Determine the winner of a finished battle. */
function resolveWinner(battle: Battle): "A" | "B" | null {
  if (isBattleActive(battle)) return null;
  const vA = battle.votesA.length;
  const vB = battle.votesB.length;
  if (vA === 0 && vB === 0) return null; // no votes — no winner
  return vA >= vB ? "A" : "B";
}

// ─── Query helpers ─────────────────────────────────────────────────────────────

/** Active battles — not yet ended, newest first. */
export function getActiveBattles(): Battle[] {
  const all = loadAll();
  return all.filter(isBattleActive).sort((a, b) => b.createdAt - a.createdAt);
}

/** Finished battles with resolved winners, oldest first for history. */
export function getHistoryBattles(): Battle[] {
  const all = loadAll();
  return all
    .filter((b) => !isBattleActive(b))
    .map((b) => {
      // Resolve winner lazily
      if (b.winnerSide === null) {
        const winner = resolveWinner(b);
        if (winner !== null) {
          b.winnerSide = winner;
          // Award if not yet done
          if (!b.winnerRewarded) {
            const winnerCar = winner === "A" ? b.carA : b.carB;
            addBalance(winnerCar.ownerPrincipal, BATTLE_WIN_RB);
            addTransaction(winnerCar.ownerPrincipal, {
              type: "earn",
              description: `Build Battle win: ${winnerCar.carName}`,
              amount: BATTLE_WIN_RB,
            });
            b.winnerRewarded = true;
          }
        }
      }
      return b;
    })
    .sort((a, b) => b.endsAt - a.endsAt);
}

// ─── Submission ────────────────────────────────────────────────────────────────

export function createBattle(carA: BattleCar, carB: BattleCar): Battle {
  const battle: Battle = {
    id: `battle_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    carA,
    carB,
    votesA: [],
    votesB: [],
    createdAt: Date.now(),
    endsAt: Date.now() + FIVE_DAYS_MS,
    winnerSide: null,
    winnerRewarded: false,
  };
  const all = loadAll();
  all.unshift(battle);
  saveAll(all);
  return battle;
}

// ─── Voting ────────────────────────────────────────────────────────────────────

export type VoteSide = "A" | "B";

/**
 * Cast or change a vote. Returns the updated battle.
 * Throws if battle is closed or user already voted same side.
 */
export function castVote(
  battleId: string,
  voterPrincipal: string,
  side: VoteSide,
): Battle {
  const all = loadAll();
  const idx = all.findIndex((b) => b.id === battleId);
  if (idx === -1) throw new Error("Battle not found");

  const battle = all[idx];
  if (!isBattleActive(battle)) throw new Error("Battle has ended");

  // Remove previous vote if any
  battle.votesA = battle.votesA.filter((p) => p !== voterPrincipal);
  battle.votesB = battle.votesB.filter((p) => p !== voterPrincipal);

  // Cast new vote
  if (side === "A") {
    battle.votesA.push(voterPrincipal);
  } else {
    battle.votesB.push(voterPrincipal);
  }

  all[idx] = battle;
  saveAll(all);
  return battle;
}

/** Returns which side the principal voted for, or null if no vote. */
export function getMyVote(battle: Battle, principal: string): VoteSide | null {
  if (battle.votesA.includes(principal)) return "A";
  if (battle.votesB.includes(principal)) return "B";
  return null;
}
