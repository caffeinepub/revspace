/**
 * RevBucks virtual currency engine.
 * All state is stored in localStorage — no backend integration required.
 */

export interface Transaction {
  id: string;
  type: "earn" | "spend" | "purchase";
  description: string;
  amount: number; // positive = earn/purchase, negative = spend
  timestamp: number;
}

export interface ReceivedGift {
  id: string;
  giftId: string;
  giftName: string;
  giftEmoji: string;
  fromPrincipal: string;
  timestamp: number;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

function balanceKey(principalId: string) {
  return `revbucks_balance_${principalId}`;
}
function balanceBackupKey(principalId: string) {
  return `revspace_rb_backup_${principalId}`;
}

function txnKey(principalId: string) {
  return `revbucks_txns_${principalId}`;
}
function txnBackupKey(principalId: string) {
  return `revspace_rb_txns_backup_${principalId}`;
}

function giftsKey(principalId: string) {
  return `revbucks_gifts_${principalId}`;
}
function giftsBackupKey(principalId: string) {
  return `revspace_rb_gifts_backup_${principalId}`;
}

// ─── Balance ─────────────────────────────────────────────────────────────────

export function getBalance(principalId: string): number {
  const raw = localStorage.getItem(balanceKey(principalId));
  if (raw) return Number(raw);
  // Primary key missing — check backup and restore from it
  const backup = localStorage.getItem(balanceBackupKey(principalId));
  if (backup) {
    localStorage.setItem(balanceKey(principalId), backup);
    return Number(backup);
  }
  return 0;
}

export function addBalance(principalId: string, amount: number): void {
  const current = getBalance(principalId);
  const next = String(current + amount);
  localStorage.setItem(balanceKey(principalId), next);
  localStorage.setItem(balanceBackupKey(principalId), next);
}

/**
 * Deducts `amount` from the user's balance.
 * Returns `true` if successful, `false` if insufficient funds.
 */
export function deductBalance(principalId: string, amount: number): boolean {
  const current = getBalance(principalId);
  if (current < amount) return false;
  const next = String(current - amount);
  localStorage.setItem(balanceKey(principalId), next);
  localStorage.setItem(balanceBackupKey(principalId), next);
  return true;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function getTransactionHistory(principalId: string): Transaction[] {
  const raw = localStorage.getItem(txnKey(principalId));
  if (raw) {
    try {
      return JSON.parse(raw) as Transaction[];
    } catch {
      // fall through to backup
    }
  }
  // Primary key missing or corrupt — try backup
  const backup = localStorage.getItem(txnBackupKey(principalId));
  if (backup) {
    try {
      const parsed = JSON.parse(backup) as Transaction[];
      localStorage.setItem(txnKey(principalId), backup);
      return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

export function addTransaction(
  principalId: string,
  txn: Omit<Transaction, "id" | "timestamp">,
): void {
  const history = getTransactionHistory(principalId);
  const full: Transaction = {
    ...txn,
    id: `txn_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  };
  history.unshift(full); // newest first
  // Keep last 200 transactions
  if (history.length > 200) history.splice(200);
  const serialized = JSON.stringify(history);
  localStorage.setItem(txnKey(principalId), serialized);
  localStorage.setItem(txnBackupKey(principalId), serialized);
}

// ─── Gifts ────────────────────────────────────────────────────────────────────

export function getReceivedGifts(principalId: string): ReceivedGift[] {
  const raw = localStorage.getItem(giftsKey(principalId));
  if (raw) {
    try {
      return JSON.parse(raw) as ReceivedGift[];
    } catch {
      // fall through to backup
    }
  }
  // Primary key missing or corrupt — try backup
  const backup = localStorage.getItem(giftsBackupKey(principalId));
  if (backup) {
    try {
      const parsed = JSON.parse(backup) as ReceivedGift[];
      localStorage.setItem(giftsKey(principalId), backup);
      return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

export function addReceivedGift(
  principalId: string,
  gift: Omit<ReceivedGift, "id" | "timestamp">,
): void {
  const gifts = getReceivedGifts(principalId);
  const full: ReceivedGift = {
    ...gift,
    id: `gift_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  };
  gifts.unshift(full);
  const serialized = JSON.stringify(gifts);
  localStorage.setItem(giftsKey(principalId), serialized);
  localStorage.setItem(giftsBackupKey(principalId), serialized);
}

/**
 * Returns gifts grouped by giftId with a count of how many times each was received.
 */
export interface GiftSummary {
  giftId: string;
  giftName: string;
  giftEmoji: string;
  count: number;
  latestTimestamp: number;
}

export function getGiftSummary(principalId: string): GiftSummary[] {
  const gifts = getReceivedGifts(principalId);
  const map = new Map<string, GiftSummary>();
  for (const g of gifts) {
    const existing = map.get(g.giftId);
    if (existing) {
      existing.count += 1;
      existing.latestTimestamp = Math.max(
        existing.latestTimestamp,
        g.timestamp,
      );
    } else {
      map.set(g.giftId, {
        giftId: g.giftId,
        giftName: g.giftName,
        giftEmoji: g.giftEmoji,
        count: 1,
        latestTimestamp: g.timestamp,
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.latestTimestamp - a.latestTimestamp,
  );
}

// ─── Earning helpers ──────────────────────────────────────────────────────────

/** Called after a user successfully creates a post. Awards +10 RB. */
export function awardPostCreation(principalId: string): void {
  addBalance(principalId, 10);
  addTransaction(principalId, {
    type: "earn",
    description: "Created a post",
    amount: 10,
  });
}

/**
 * Called after a post reaches a multiple-of-10 likes.
 * Awards the post author +5 RB.
 */
export function awardLikeReceived(principalId: string): void {
  addBalance(principalId, 5);
  addTransaction(principalId, {
    type: "earn",
    description: "Your post reached 10 likes",
    amount: 5,
  });
}

/** Called after a purchase is credited (manual — no webhook). */
export function recordPurchase(
  principalId: string,
  amount: number,
  packName: string,
): void {
  addBalance(principalId, amount);
  addTransaction(principalId, {
    type: "purchase",
    description: `Purchased ${packName} (${amount} RB)`,
    amount,
  });
}

// ─── Shop catalog ─────────────────────────────────────────────────────────────

export type ItemRarity = "common" | "rare" | "epic" | "legendary";

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  category: string;
  cost: number;
  description: string;
  rarity: ItemRarity;
  /** Tailwind-compatible gradient colors for the card */
  gradient: [string, string];
  /** Accent color for the glow / border */
  accentColor: string;
}

export const RARITY_CONFIG: Record<
  ItemRarity,
  { label: string; color: string; glow: string }
> = {
  common: {
    label: "Common",
    color: "oklch(0.72 0.08 200)",
    glow: "oklch(0.72 0.08 200 / 0.3)",
  },
  rare: {
    label: "Rare",
    color: "oklch(0.65 0.22 260)",
    glow: "oklch(0.65 0.22 260 / 0.35)",
  },
  epic: {
    label: "Epic",
    color: "oklch(0.7 0.25 310)",
    glow: "oklch(0.7 0.25 310 / 0.35)",
  },
  legendary: {
    label: "Legendary",
    color: "oklch(0.78 0.18 65)",
    glow: "oklch(0.78 0.18 65 / 0.4)",
  },
};

export const SHOP_CATEGORIES = [
  "Badges & Stickers",
  "Profile Upgrades",
  "Post Boosts",
  "Virtual Trophies",
  "Garage Perks",
  "Shoutouts",
] as const;

export const SHOP_ITEMS: ShopItem[] = [
  // Badges & Stickers
  {
    id: "jdm-badge",
    name: "JDM Badge",
    emoji: "🏅",
    category: "Badges & Stickers",
    cost: 50,
    rarity: "common",
    gradient: ["oklch(0.22 0.05 200)", "oklch(0.18 0.03 200)"],
    accentColor: "oklch(0.72 0.08 200)",
    description: "A rare JDM collector badge for your profile",
  },
  {
    id: "trophy-badge",
    name: "Trophy Badge",
    emoji: "🏆",
    category: "Badges & Stickers",
    cost: 150,
    rarity: "rare",
    gradient: ["oklch(0.24 0.08 260)", "oklch(0.19 0.05 260)"],
    accentColor: "oklch(0.65 0.22 260)",
    description: "Show off your best build with a trophy badge",
  },
  {
    id: "build-certified",
    name: "Build Certified",
    emoji: "⚙️",
    category: "Badges & Stickers",
    cost: 200,
    rarity: "rare",
    gradient: ["oklch(0.24 0.08 140)", "oklch(0.19 0.05 140)"],
    accentColor: "oklch(0.72 0.2 150)",
    description: "Animated 'Build Certified' sticker for your profile",
  },
  // Profile Upgrades
  {
    id: "animated-border",
    name: "Flame Border",
    emoji: "🔥",
    category: "Profile Upgrades",
    cost: 250,
    rarity: "epic",
    gradient: ["oklch(0.28 0.12 35)", "oklch(0.22 0.08 30)"],
    accentColor: "oklch(0.7 0.22 40)",
    description: "Animated flame border around your avatar",
  },
  {
    id: "custom-banner",
    name: "Track Banner",
    emoji: "🎨",
    category: "Profile Upgrades",
    cost: 300,
    rarity: "epic",
    gradient: ["oklch(0.26 0.1 310)", "oklch(0.21 0.07 310)"],
    accentColor: "oklch(0.7 0.25 310)",
    description: "Track, drag strip, or mountain road profile banner",
  },
  {
    id: "gold-frame",
    name: "Gold Avatar Frame",
    emoji: "👑",
    category: "Profile Upgrades",
    cost: 200,
    rarity: "rare",
    gradient: ["oklch(0.28 0.12 65)", "oklch(0.22 0.08 60)"],
    accentColor: "oklch(0.78 0.18 65)",
    description: "Gifted gold frame around the recipient's avatar",
  },
  // Post Boosts
  {
    id: "spotlight-boost",
    name: "Spotlight Boost",
    emoji: "⭐",
    category: "Post Boosts",
    cost: 500,
    rarity: "legendary",
    gradient: ["oklch(0.30 0.14 65)", "oklch(0.24 0.10 50)"],
    accentColor: "oklch(0.82 0.22 65)",
    description: "Pin a reel to the top of Explore for 24 hours",
  },
  {
    id: "fire-effect",
    name: "Fire Effect",
    emoji: "🔥",
    category: "Post Boosts",
    cost: 300,
    rarity: "epic",
    gradient: ["oklch(0.28 0.14 27)", "oklch(0.22 0.10 25)"],
    accentColor: "oklch(0.65 0.24 27)",
    description: "Animated flames around a reel or post",
  },
  {
    id: "front-page",
    name: "Front Page Feature",
    emoji: "📰",
    category: "Post Boosts",
    cost: 750,
    rarity: "legendary",
    gradient: ["oklch(0.32 0.16 300)", "oklch(0.25 0.12 310)"],
    accentColor: "oklch(0.75 0.28 310)",
    description: "Feature your car on the front page banner for 24 hours",
  },
  // Virtual Trophies
  {
    id: "standard-trophy",
    name: "Gold Trophy",
    emoji: "🥇",
    category: "Virtual Trophies",
    cost: 100,
    rarity: "common",
    gradient: ["oklch(0.26 0.10 70)", "oklch(0.21 0.07 65)"],
    accentColor: "oklch(0.76 0.18 72)",
    description: "A classic gold trophy for your collection",
  },
  {
    id: "award-plaque",
    name: "Award Plaque",
    emoji: "🎖️",
    category: "Virtual Trophies",
    cost: 250,
    rarity: "rare",
    gradient: ["oklch(0.24 0.08 30)", "oklch(0.19 0.05 28)"],
    accentColor: "oklch(0.65 0.18 35)",
    description: "Custom award plaque to recognize great builds",
  },
  {
    id: "build-battle-podium",
    name: "Build Battle Podium",
    emoji: "🏁",
    category: "Virtual Trophies",
    cost: 400,
    rarity: "epic",
    gradient: ["oklch(0.26 0.10 260)", "oklch(0.21 0.07 270)"],
    accentColor: "oklch(0.68 0.24 265)",
    description: "Podium trophy for dominating Build Battles",
  },
  // Garage Perks
  {
    id: "extra-garage-slot",
    name: "Garage Slot",
    emoji: "🚗",
    category: "Garage Perks",
    cost: 300,
    rarity: "rare",
    gradient: ["oklch(0.24 0.07 180)", "oklch(0.19 0.05 180)"],
    accentColor: "oklch(0.68 0.18 185)",
    description: "Unlock an additional slot in the recipient's garage",
  },
  {
    id: "featured-car",
    name: "Featured Car Tag",
    emoji: "✨",
    category: "Garage Perks",
    cost: 500,
    rarity: "legendary",
    gradient: ["oklch(0.30 0.14 55)", "oklch(0.24 0.10 50)"],
    accentColor: "oklch(0.80 0.22 60)",
    description: "Highlight one car on the Explore page",
  },
  {
    id: "plate-frame",
    name: "Custom Plate Frame",
    emoji: "🔲",
    category: "Garage Perks",
    cost: 200,
    rarity: "common",
    gradient: ["oklch(0.22 0.05 230)", "oklch(0.18 0.03 230)"],
    accentColor: "oklch(0.65 0.14 235)",
    description: "Custom plate frame overlay for car photos",
  },
  // Shoutouts
  {
    id: "rev-shoutout",
    name: "Rev Shoutout",
    emoji: "📣",
    category: "Shoutouts",
    cost: 250,
    rarity: "rare",
    gradient: ["oklch(0.26 0.10 50)", "oklch(0.21 0.07 45)"],
    accentColor: "oklch(0.72 0.20 55)",
    description: "24-hour banner on the recipient's profile",
  },
  {
    id: "leaderboard-feature",
    name: "Leaderboard Feature",
    emoji: "📊",
    category: "Shoutouts",
    cost: 400,
    rarity: "epic",
    gradient: ["oklch(0.26 0.10 290)", "oklch(0.21 0.07 295)"],
    accentColor: "oklch(0.70 0.24 290)",
    description: "Featured spot in the weekly leaderboard",
  },
];
