/**
 * Build Battle engine.
 * All state is stored in localStorage.
 * Each battle has two cars; the community votes on the winner.
 * Battles run for 5 days, then are archived to history.
 *
 * Flow:
 *  1. Creator submits Car A → battle.status = "open" (waiting for challenger)
 *  2. Any other user clicks "Join Battle" → submits Car B → status = "active"
 *  3. Community votes for 5 days from when Car B was submitted
 */

import { addBalance, addTransaction } from "./revbucks";

export interface BattleCar {
  carName: string;
  ownerName: string;
  ownerPrincipal: string;
  imageUrl: string;
  description: string;
}

export type BattleStatus = "open" | "active" | "ended";

export interface Battle {
  id: string;
  carA: BattleCar;
  carB: BattleCar | null; // null until a challenger joins
  status: BattleStatus;
  votesA: string[]; // array of voter principal IDs
  votesB: string[];
  createdAt: number; // ms timestamp
  endsAt: number; // ms timestamp (set when Car B joins)
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
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Battle[];
    // Migrate old battles that don't have status field
    return parsed.map((b) => {
      if (!b.status) {
        // Old format: both cars exist → active or ended
        const isEnded = Date.now() >= b.endsAt;
        return { ...b, status: isEnded ? "ended" : "active" } as Battle;
      }
      return b;
    });
  } catch {
    return [];
  }
}

function saveAll(battles: Battle[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(battles));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isBattleActive(battle: Battle): boolean {
  return battle.status === "active" && Date.now() < battle.endsAt;
}

export function isBattleOpen(battle: Battle): boolean {
  return battle.status === "open";
}

export function msUntilBattleEnd(battle: Battle): number {
  return Math.max(0, battle.endsAt - Date.now());
}

export function formatBattleTimeLeft(battle: Battle): string {
  if (battle.status === "open") return "Waiting for challenger";
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
  if (isBattleActive(battle) || isBattleOpen(battle)) return null;
  const vA = battle.votesA.length;
  const vB = battle.votesB.length;
  if (vA === 0 && vB === 0) return null; // no votes — no winner
  return vA >= vB ? "A" : "B";
}

// ─── Query helpers ─────────────────────────────────────────────────────────────

/** Open + active battles, newest first. */
export function getActiveBattles(): Battle[] {
  const all = loadAll();
  return all
    .filter((b) => b.status === "open" || isBattleActive(b))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Finished battles with resolved winners. */
export function getHistoryBattles(): Battle[] {
  const all = loadAll();
  return all
    .filter((b) => b.status !== "open" && !isBattleActive(b))
    .map((b) => {
      // Resolve winner lazily
      if (b.winnerSide === null && b.carB !== null) {
        const winner = resolveWinner(b);
        if (winner !== null) {
          b.winnerSide = winner;
          // Award if not yet done
          if (!b.winnerRewarded) {
            const winnerCar = winner === "A" ? b.carA : b.carB;
            if (winnerCar) {
              addBalance(winnerCar.ownerPrincipal, BATTLE_WIN_RB);
              addTransaction(winnerCar.ownerPrincipal, {
                type: "earn",
                description: `Build Battle win: ${winnerCar.carName}`,
                amount: BATTLE_WIN_RB,
              });
            }
            b.winnerRewarded = true;
          }
        }
      }
      return b;
    })
    .sort((a, b) => b.endsAt - a.endsAt);
}

// ─── Submission ────────────────────────────────────────────────────────────────

/** Creator submits only their own car (Car A). Battle starts in "open" state. */
export function createBattle(carA: BattleCar): Battle {
  const battle: Battle = {
    id: `battle_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    carA,
    carB: null,
    status: "open",
    votesA: [],
    votesB: [],
    createdAt: Date.now(),
    endsAt: 0, // set when challenger joins
    winnerSide: null,
    winnerRewarded: false,
  };
  const all = loadAll();
  all.unshift(battle);
  saveAll(all);
  return battle;
}

/** Challenger submits Car B, activating the battle for voting. */
export function joinBattle(battleId: string, carB: BattleCar): Battle {
  const all = loadAll();
  const idx = all.findIndex((b) => b.id === battleId);
  if (idx === -1) throw new Error("Battle not found");

  const battle = all[idx];
  if (battle.status !== "open")
    throw new Error("This battle already has a challenger");
  if (battle.carA.ownerPrincipal === carB.ownerPrincipal) {
    throw new Error("You can't challenge your own battle");
  }

  battle.carB = carB;
  battle.status = "active";
  battle.endsAt = Date.now() + FIVE_DAYS_MS;

  all[idx] = battle;
  saveAll(all);
  return battle;
}

// ─── Voting ────────────────────────────────────────────────────────────────────

export type VoteSide = "A" | "B";

/**
 * Cast or change a vote. Returns the updated battle.
 * Throws if battle is closed or not active.
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
  if (!isBattleActive(battle))
    throw new Error("Battle has ended or is waiting for a challenger");

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
