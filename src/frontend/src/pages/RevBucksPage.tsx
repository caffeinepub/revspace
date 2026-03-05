import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";
import {
  Coins,
  ExternalLink,
  Loader2,
  Lock,
  Package,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useRevBucksSync } from "../hooks/useRevBucksSync";
import { useUserMeta } from "../hooks/useUserMeta";
import {
  FLAIR_OPTIONS,
  getUserFlair,
  hasReactionPack,
  setUserFlair,
  unlockReactionPack,
} from "../lib/customizations";
import { isModelAccountFromMeta } from "../lib/modelAccount";
import {
  MODEL_GIFT_ITEMS,
  RARITY_CONFIG,
  SHOP_CATEGORIES,
  SHOP_ITEMS,
  type ShopItem,
  addReceivedGift,
  addTransaction,
  deductBalance,
  getBalance,
  getTransactionHistory,
  recordPurchase,
} from "../lib/revbucks";

// ─── Stripe purchase packages ─────────────────────────────────────────────────

const STRIPE_PACKAGES = [
  {
    id: "revbucks-550",
    name: "RevBucks Pack",
    rb: 550,
    price: "$5.99",
    badge: "Best Value",
    link: "https://buy.stripe.com/5kQ6oI3tl9Vielf48T9EI01",
  },
] as const;

// ─── Gift Send Modal ──────────────────────────────────────────────────────────

function SendGiftModal({
  item,
  myPrincipal,
  myBalance,
  onClose,
  onSent,
  onDeductBalance,
}: {
  item: ShopItem | null;
  myPrincipal: string;
  myBalance: number;
  onClose: () => void;
  onSent: () => void;
  onDeductBalance?: (cost: number) => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [isSending, setIsSending] = useState(false);

  const canAfford = item ? myBalance >= item.cost : false;

  const handleSend = useCallback(() => {
    if (!item) return;
    if (!recipient.trim()) {
      toast.error("Please enter a Principal ID");
      return;
    }
    if (!canAfford) {
      toast.error("Insufficient RevBucks balance");
      return;
    }
    if (recipient.trim() === myPrincipal) {
      toast.error("You can't send a gift to yourself");
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      const ok = deductBalance(myPrincipal, item.cost);
      if (!ok) {
        toast.error("Insufficient RevBucks balance");
        setIsSending(false);
        return;
      }
      addTransaction(myPrincipal, {
        type: "spend",
        description: `Sent ${item.emoji} ${item.name} to ${recipient.trim().slice(0, 12)}...`,
        amount: -item.cost,
      });
      addReceivedGift(recipient.trim(), {
        giftId: item.id,
        giftName: item.name,
        giftEmoji: item.emoji,
        fromPrincipal: myPrincipal,
      });
      // Propagate balance change to on-chain (best-effort)
      onDeductBalance?.(item.cost);
      toast.success(`${item.emoji} ${item.name} sent!`);
      setIsSending(false);
      onSent();
    }, 600);
  }, [item, recipient, canAfford, myPrincipal, onSent, onDeductBalance]);

  const rarityConfig = item ? RARITY_CONFIG[item.rarity] : null;

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm"
        style={{
          background: "oklch(var(--surface))",
          border: `1px solid ${rarityConfig?.color ?? "oklch(var(--border))"}`,
          boxShadow: rarityConfig ? `0 0 30px ${rarityConfig.glow}` : undefined,
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <span className="text-2xl">{item?.emoji}</span>
            Send {item?.name}
          </DialogTitle>
        </DialogHeader>

        {item && rarityConfig && (
          <div className="space-y-4">
            {/* Item preview card */}
            <div
              className="rounded-xl p-4 flex items-center gap-3 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`,
                border: `1px solid ${rarityConfig.color}`,
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 20% 50%, ${rarityConfig.glow} 0%, transparent 60%)`,
                }}
              />
              <span className="text-4xl relative z-10">{item.emoji}</span>
              <div className="relative z-10">
                <p className="font-bold text-foreground">{item.name}</p>
                <p className="text-xs text-steel">{item.description}</p>
                <span
                  className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1"
                  style={{
                    background: `${rarityConfig.color}22`,
                    color: rarityConfig.color,
                    border: `1px solid ${rarityConfig.color}55`,
                  }}
                >
                  {rarityConfig.label}
                </span>
              </div>
            </div>

            <div
              className="rounded-lg p-3 flex items-center justify-between"
              style={{ background: "oklch(var(--surface-elevated))" }}
            >
              <div>
                <p className="text-xs text-steel">Cost</p>
                <p
                  className="text-xl font-bold font-display"
                  style={{ color: "oklch(var(--orange))" }}
                >
                  ⚡ {item.cost} RB
                </p>
              </div>
              <div>
                <p className="text-xs text-steel">Your Balance</p>
                <p
                  className="text-xl font-bold font-display"
                  style={{
                    color: canAfford
                      ? "oklch(var(--foreground))"
                      : "oklch(0.65 0.22 27)",
                  }}
                >
                  ⚡ {myBalance} RB
                </p>
              </div>
            </div>

            {!canAfford && (
              <p
                className="text-sm text-center"
                style={{ color: "oklch(0.65 0.22 27)" }}
              >
                Not enough RevBucks. Buy more in the Balance tab.
              </p>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="recipient"
                className="text-xs text-steel uppercase tracking-wider font-semibold"
              >
                Recipient Principal ID
              </Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. abc12-defgh-..."
                className="text-sm font-mono"
                style={{
                  background: "oklch(var(--surface-elevated))",
                  borderColor: "oklch(var(--border))",
                }}
              />
              <p className="text-[11px] text-steel">
                The recipient's Principal ID from their Profile page
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-border text-steel"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!canAfford || !recipient.trim() || isSending}
                onClick={handleSend}
                className="flex-1 font-bold"
                style={{
                  background: canAfford ? "oklch(var(--orange))" : undefined,
                  color: canAfford ? "oklch(var(--carbon))" : undefined,
                }}
              >
                {isSending ? "Sending..." : "Send Gift ✈️"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Model Exclusive items ────────────────────────────────────────────────────

const MODEL_EXCLUSIVE_ITEMS: ShopItem[] = [
  {
    id: "model-verified-badge",
    name: "Verified Model Badge",
    emoji: "🎖️",
    category: "Model Exclusives",
    cost: 800,
    rarity: "epic",
    gradient: ["oklch(0.22 0.1 310)", "oklch(0.17 0.07 310)"],
    accentColor: "oklch(0.7 0.25 310)",
    description: "Display a verified badge on your model profile",
    image: "/assets/generated/model-verified-badge.dim_200x200.png",
  },
  {
    id: "model-spotlight",
    name: "Model Spotlight",
    emoji: "🌟",
    category: "Model Exclusives",
    cost: 600,
    rarity: "epic",
    gradient: ["oklch(0.24 0.12 290)", "oklch(0.18 0.08 295)"],
    accentColor: "oklch(0.7 0.22 295)",
    description: "Get featured at the top of Model Reels for 24 hours",
    image: "/assets/generated/model-spotlight.dim_200x200.png",
  },
  {
    id: "model-featured-week",
    name: "Featured Model of the Week",
    emoji: "👑",
    category: "Model Exclusives",
    cost: 1500,
    rarity: "legendary",
    gradient: ["oklch(0.28 0.15 300)", "oklch(0.22 0.12 310)"],
    accentColor: "oklch(0.75 0.28 305)",
    description: "Featured model spot on the Model Gallery page for 7 days",
    image: "/assets/generated/model-featured-crown.dim_200x200.png",
  },
  {
    id: "model-banner-frame",
    name: "Custom Model Banner Frame",
    emoji: "🖼️",
    category: "Model Exclusives",
    cost: 400,
    rarity: "rare",
    gradient: ["oklch(0.22 0.08 310)", "oklch(0.18 0.05 310)"],
    accentColor: "oklch(0.65 0.22 310)",
    description: "Unique banner frame for your model profile",
    image: "/assets/generated/model-banner-frame.dim_200x200.png",
  },
  {
    id: "model-portfolio-boost",
    name: "Model Portfolio Boost",
    emoji: "📈",
    category: "Model Exclusives",
    cost: 500,
    rarity: "epic",
    gradient: ["oklch(0.24 0.1 300)", "oklch(0.19 0.07 305)"],
    accentColor: "oklch(0.68 0.24 300)",
    description: "Boost your portfolio to the top of search for 48 hours",
    image: "/assets/generated/model-portfolio-boost.dim_200x200.png",
  },
];

// ─── Customize Items ──────────────────────────────────────────────────────────

interface CustomizeItem {
  id: "reaction-pack" | "custom-flair";
  name: string;
  emoji: string;
  cost: number;
  rarity: "common" | "rare";
  description: string;
  gradient: [string, string];
}

const CUSTOMIZE_ITEMS: CustomizeItem[] = [
  {
    id: "reaction-pack",
    name: "Reaction Pack",
    emoji: "🔥",
    cost: 150,
    rarity: "rare",
    description: "Unlock 5 custom reactions on any post: 🔥🏎️⚡🤙💨",
    gradient: ["oklch(0.22 0.08 40)", "oklch(0.17 0.05 35)"],
  },
  {
    id: "custom-flair",
    name: "Custom Title / Flair",
    emoji: "🏷️",
    cost: 100,
    rarity: "common",
    description: "Add a custom flair tag under your username",
    gradient: ["oklch(0.2 0.06 280)", "oklch(0.16 0.04 275)"],
  },
];

// ─── Buy Customization Modal ──────────────────────────────────────────────────

function BuyCustomizationModal({
  item,
  myPrincipal,
  myBalance,
  onClose,
  onPurchased,
  onDeductBalance,
}: {
  item: CustomizeItem | null;
  myPrincipal: string;
  myBalance: number;
  onClose: () => void;
  onPurchased: () => void;
  onDeductBalance?: (cost: number) => void;
}) {
  const [isBuying, setIsBuying] = useState(false);
  const [selectedFlair, setSelectedFlair] = useState<string>("");
  const [step, setStep] = useState<"confirm" | "pick-flair">("confirm");

  // Reset when item changes
  const prevItemId = useRef<string | null>(null);
  if (item?.id !== prevItemId.current) {
    prevItemId.current = item?.id ?? null;
    // Can't call setState directly in render, so we track a derived reset
  }

  const canAfford = item ? myBalance >= item.cost : false;
  const rarityConfig = item ? RARITY_CONFIG[item.rarity] : null;

  const handleBuy = useCallback(() => {
    if (!item) return;
    if (!canAfford) {
      toast.error("Insufficient RevBucks balance");
      return;
    }
    setIsBuying(true);
    setTimeout(() => {
      const ok = deductBalance(myPrincipal, item.cost);
      if (!ok) {
        toast.error("Insufficient RevBucks balance");
        setIsBuying(false);
        return;
      }
      addTransaction(myPrincipal, {
        type: "spend",
        description: `Purchased ${item.emoji} ${item.name}`,
        amount: -item.cost,
      });
      onDeductBalance?.(item.cost);

      if (item.id === "reaction-pack") {
        unlockReactionPack(myPrincipal);
        toast.success("🔥 Reaction Pack unlocked! Tap the heart on any post.");
        setIsBuying(false);
        onPurchased();
      } else {
        // Custom flair — move to picker step
        setIsBuying(false);
        setStep("pick-flair");
      }
    }, 500);
  }, [item, canAfford, myPrincipal, onDeductBalance, onPurchased]);

  const handleConfirmFlair = useCallback(() => {
    if (!selectedFlair) {
      toast.error("Please select a flair first");
      return;
    }
    setUserFlair(myPrincipal, selectedFlair);
    toast.success(`🏷️ Flair set to "${selectedFlair}"!`);
    onPurchased();
  }, [selectedFlair, myPrincipal, onPurchased]);

  const handleClose = () => {
    setStep("confirm");
    setSelectedFlair("");
    onClose();
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-sm"
        style={{
          background: "oklch(var(--surface))",
          border: `1px solid ${rarityConfig?.color ?? "oklch(var(--border))"}`,
          boxShadow: rarityConfig ? `0 0 30px ${rarityConfig.glow}` : undefined,
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <span className="text-2xl">{item?.emoji}</span>
            {step === "pick-flair" ? "Choose Your Flair" : item?.name}
          </DialogTitle>
        </DialogHeader>

        {item && rarityConfig && step === "confirm" && (
          <div className="space-y-4">
            {/* Item preview */}
            <div
              className="rounded-xl p-4 flex items-center gap-3 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`,
                border: `1px solid ${rarityConfig.color}`,
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 20% 50%, ${rarityConfig.glow} 0%, transparent 60%)`,
                }}
              />
              <span className="text-4xl relative z-10">{item.emoji}</span>
              <div className="relative z-10">
                <p className="font-bold text-foreground">{item.name}</p>
                <p className="text-xs text-steel">{item.description}</p>
                <span
                  className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1"
                  style={{
                    background: `${rarityConfig.color}22`,
                    color: rarityConfig.color,
                    border: `1px solid ${rarityConfig.color}55`,
                  }}
                >
                  {rarityConfig.label}
                </span>
              </div>
            </div>

            {/* Cost / Balance */}
            <div
              className="rounded-lg p-3 flex items-center justify-between"
              style={{ background: "oklch(var(--surface-elevated))" }}
            >
              <div>
                <p className="text-xs text-steel">Cost</p>
                <p
                  className="text-xl font-bold font-display"
                  style={{ color: "oklch(var(--orange))" }}
                >
                  ⚡ {item.cost} RB
                </p>
              </div>
              <div>
                <p className="text-xs text-steel">Your Balance</p>
                <p
                  className="text-xl font-bold font-display"
                  style={{
                    color: canAfford
                      ? "oklch(var(--foreground))"
                      : "oklch(0.65 0.22 27)",
                  }}
                >
                  ⚡ {myBalance} RB
                </p>
              </div>
            </div>

            {!canAfford && (
              <p
                className="text-sm text-center"
                style={{ color: "oklch(0.65 0.22 27)" }}
              >
                Not enough RevBucks. Buy more in the Balance tab.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-border text-steel"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!canAfford || isBuying}
                onClick={handleBuy}
                className="flex-1 font-bold"
                style={
                  canAfford
                    ? {
                        background: "oklch(var(--orange))",
                        color: "oklch(var(--carbon))",
                      }
                    : undefined
                }
              >
                {isBuying ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : null}
                {isBuying ? "Unlocking..." : "Buy & Unlock"}
              </Button>
            </div>
          </div>
        )}

        {step === "pick-flair" && (
          <div className="space-y-4">
            <p className="text-sm text-steel">
              Select a flair that will appear under your username on your
              profile.
            </p>
            <Select value={selectedFlair} onValueChange={setSelectedFlair}>
              <SelectTrigger
                style={{
                  background: "oklch(var(--surface-elevated))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                <SelectValue placeholder="Choose your flair…" />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(var(--surface))" }}>
                {FLAIR_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    🏷️ {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedFlair && (
              <div
                className="rounded-lg px-3 py-2 flex items-center gap-2 text-sm"
                style={{
                  background: "oklch(var(--orange) / 0.12)",
                  border: "1px solid oklch(var(--orange) / 0.3)",
                  color: "oklch(var(--orange-bright))",
                }}
              >
                <span>🏷️</span>
                <span className="font-semibold">{selectedFlair}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-border text-steel"
                onClick={handleClose}
              >
                Skip
              </Button>
              <Button
                type="button"
                disabled={!selectedFlair}
                onClick={handleConfirmFlair}
                className="flex-1 font-bold"
                style={
                  selectedFlair
                    ? {
                        background: "oklch(var(--orange))",
                        color: "oklch(var(--carbon))",
                      }
                    : undefined
                }
              >
                Set Flair
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Shop Tab ─────────────────────────────────────────────────────────────────

function ShopTab({
  myPrincipal,
  balance,
  onBalanceChange,
  isModel,
  onDeductBalance,
}: {
  myPrincipal: string;
  balance: number;
  onBalanceChange: () => void;
  isModel: boolean;
  onDeductBalance?: (cost: number) => void;
}) {
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [selectedCustomizeItem, setSelectedCustomizeItem] =
    useState<CustomizeItem | null>(null);

  // Force re-render to reflect newly unlocked items
  const [, forceUpdate] = useState(0);
  const refreshOwnership = () => forceUpdate((n) => n + 1);

  const renderItemCard = (item: ShopItem) => {
    const canAfford = balance >= item.cost;
    const rarityConfig = RARITY_CONFIG[item.rarity];

    return (
      <motion.div
        key={item.id}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="rounded-xl overflow-hidden cursor-pointer relative"
        style={{
          background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`,
          border: `1.5px solid ${canAfford ? rarityConfig.color : "oklch(var(--border))"}`,
          boxShadow: canAfford ? `0 0 16px ${rarityConfig.glow}` : "none",
          opacity: canAfford ? 1 : 0.6,
        }}
      >
        {/* Glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 15% 40%, ${rarityConfig.glow} 0%, transparent 55%)`,
          }}
        />

        {item.image ? (
          /* ── Image-style card layout ─────────────────────────────────── */
          <div className="relative z-10">
            {/* Image hero */}
            <div className="relative w-full h-32 overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.95) saturate(1.1)" }}
              />
              {/* Gradient overlay so text is always readable */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent 40%, oklch(0 0 0 / 0.65) 100%)",
                }}
              />
              {/* Rarity badge top-right */}
              <span
                className="absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider backdrop-blur-sm"
                style={{
                  background: `${rarityConfig.color}33`,
                  color: rarityConfig.color,
                  border: `1px solid ${rarityConfig.color}66`,
                }}
              >
                {rarityConfig.label}
              </span>
              {/* Name over image bottom */}
              <p className="absolute bottom-2 left-3 font-bold text-white text-sm drop-shadow leading-tight">
                {item.name}
              </p>
            </div>

            {/* Card footer */}
            <div className="px-3 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-steel leading-snug">
                  {item.description}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Zap size={12} style={{ color: "oklch(var(--orange))" }} />
                  <span
                    className="font-black font-display text-sm"
                    style={{ color: "oklch(var(--orange))" }}
                  >
                    {item.cost.toLocaleString()} RB
                  </span>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!canAfford}
                onClick={() => setSelectedItem(item)}
                className="text-xs h-8 font-bold px-3 rounded-lg shrink-0 ml-2"
                style={
                  canAfford
                    ? {
                        background: rarityConfig.color,
                        color: "oklch(0.12 0.01 250)",
                      }
                    : {
                        background: "oklch(var(--surface))",
                        color: "oklch(var(--steel))",
                        border: "1px solid oklch(var(--border))",
                      }
                }
              >
                {canAfford ? "🎁 Send" : "Need More"}
              </Button>
            </div>
          </div>
        ) : (
          /* ── Emoji-style card layout (fallback) ──────────────────────── */
          <div className="relative z-10 p-4 flex flex-col gap-3">
            {/* Top row: emoji + rarity badge */}
            <div className="flex items-start justify-between">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                style={{
                  background: `${rarityConfig.color}18`,
                  border: `1px solid ${rarityConfig.color}40`,
                  boxShadow: `inset 0 1px 0 ${rarityConfig.color}20`,
                }}
              >
                {item.emoji}
              </div>

              <span
                className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider"
                style={{
                  background: `${rarityConfig.color}22`,
                  color: rarityConfig.color,
                  border: `1px solid ${rarityConfig.color}50`,
                }}
              >
                {rarityConfig.label}
              </span>
            </div>

            {/* Name + description */}
            <div>
              <p className="font-bold text-foreground text-sm leading-tight">
                {item.name}
              </p>
              <p className="text-[11px] text-steel mt-0.5 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Cost + action */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <Zap size={13} style={{ color: "oklch(var(--orange))" }} />
                <span
                  className="font-black font-display text-base"
                  style={{ color: "oklch(var(--orange))" }}
                >
                  {item.cost.toLocaleString()} RB
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!canAfford}
                onClick={() => setSelectedItem(item)}
                className="text-xs h-8 font-bold px-3 rounded-lg"
                style={
                  canAfford
                    ? {
                        background: rarityConfig.color,
                        color: "oklch(0.12 0.01 250)",
                      }
                    : {
                        background: "oklch(var(--surface))",
                        color: "oklch(var(--steel))",
                        border: "1px solid oklch(var(--border))",
                      }
                }
              >
                {canAfford ? "🎁 Send" : "Need More RB"}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderCustomizeCard = (item: CustomizeItem) => {
    const canAfford = balance >= item.cost;
    const rarityConfig = RARITY_CONFIG[item.rarity];
    const isOwned =
      item.id === "reaction-pack"
        ? hasReactionPack(myPrincipal)
        : getUserFlair(myPrincipal) !== null;

    return (
      <motion.div
        key={item.id}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="rounded-xl overflow-hidden cursor-pointer relative"
        style={{
          background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`,
          border: `1.5px solid ${isOwned ? "oklch(0.65 0.18 145)" : canAfford ? rarityConfig.color : "oklch(var(--border))"}`,
          boxShadow: isOwned
            ? "0 0 16px oklch(0.65 0.18 145 / 0.3)"
            : canAfford
              ? `0 0 16px ${rarityConfig.glow}`
              : "none",
          opacity: isOwned ? 0.9 : canAfford ? 1 : 0.6,
        }}
      >
        {isOwned && (
          <div
            className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              background: "oklch(0.35 0.14 145 / 0.8)",
              color: "oklch(0.72 0.2 145)",
              border: "1px solid oklch(0.55 0.18 145 / 0.5)",
            }}
          >
            ✓ Owned
          </div>
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 15% 40%, ${rarityConfig.glow} 0%, transparent 55%)`,
          }}
        />

        <div className="relative z-10 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
              style={{
                background: `${rarityConfig.color}18`,
                border: `1px solid ${rarityConfig.color}40`,
              }}
            >
              {item.emoji}
            </div>
            <span
              className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider"
              style={{
                background: `${rarityConfig.color}22`,
                color: rarityConfig.color,
                border: `1px solid ${rarityConfig.color}50`,
              }}
            >
              {rarityConfig.label}
            </span>
          </div>

          <div>
            <p className="font-bold text-foreground text-sm leading-tight">
              {item.name}
            </p>
            <p className="text-[11px] text-steel mt-0.5 leading-relaxed">
              {item.description}
            </p>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              <Zap size={13} style={{ color: "oklch(var(--orange))" }} />
              <span
                className="font-black font-display text-base"
                style={{ color: "oklch(var(--orange))" }}
              >
                {item.cost.toLocaleString()} RB
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!canAfford || isOwned}
              onClick={() => !isOwned && setSelectedCustomizeItem(item)}
              className="text-xs h-8 font-bold px-3 rounded-lg"
              style={
                isOwned
                  ? {
                      background: "oklch(0.25 0.08 145 / 0.5)",
                      color: "oklch(0.72 0.2 145)",
                      border: "1px solid oklch(0.45 0.14 145 / 0.4)",
                    }
                  : canAfford
                    ? {
                        background: rarityConfig.color,
                        color: "oklch(0.12 0.01 250)",
                      }
                    : {
                        background: "oklch(var(--surface))",
                        color: "oklch(var(--steel))",
                        border: "1px solid oklch(var(--border))",
                      }
              }
            >
              {isOwned
                ? "✓ Owned"
                : canAfford
                  ? "🎯 Buy & Use"
                  : "Need More RB"}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {/* Buy More RevBucks banner */}
      <motion.a
        href={`https://buy.stripe.com/5kQ6oI3tl9Vielf48T9EI01?client_reference_id=${encodeURIComponent(myPrincipal)}`}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.99 }}
        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-6 no-underline cursor-pointer relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.2 0.06 50 / 0.9), oklch(0.16 0.04 50))",
          border: "1.5px solid oklch(var(--orange) / 0.5)",
          boxShadow: "0 0 20px oklch(var(--orange) / 0.12)",
        }}
        onClick={() => {
          toast.success(
            "Taking you to checkout\u2026 RevBucks will be credited when you return.",
            { duration: 4000 },
          );
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 0% 50%, oklch(var(--orange) / 0.1) 0%, transparent 60%)",
          }}
        />
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(var(--orange) / 0.18)",
              border: "1px solid oklch(var(--orange) / 0.35)",
            }}
          >
            <Zap size={18} style={{ color: "oklch(var(--orange))" }} />
          </div>
          <div>
            <p
              className="text-sm font-bold leading-tight"
              style={{ color: "oklch(var(--foreground))" }}
            >
              Buy More RevBucks
            </p>
            <p className="text-[11px]" style={{ color: "oklch(var(--steel))" }}>
              ⚡ {balance.toLocaleString()} RB in your wallet
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 relative z-10"
          style={{
            background: "oklch(var(--orange))",
            color: "oklch(var(--carbon))",
            boxShadow: "0 0 12px oklch(var(--orange) / 0.4)",
          }}
        >
          <Zap size={12} />
          550 RB — $5.99
        </div>
      </motion.a>

      <div className="space-y-8 pb-6">
        {SHOP_CATEGORIES.map((cat) => {
          const items = SHOP_ITEMS.filter((i) => i.category === cat);
          return (
            <div key={cat}>
              {/* Category header */}
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                style={{ color: "oklch(var(--steel))" }}
              >
                <span
                  className="flex-1 h-px"
                  style={{ background: "oklch(var(--border))" }}
                />
                {cat}
                <span
                  className="flex-1 h-px"
                  style={{ background: "oklch(var(--border))" }}
                />
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((item) => renderItemCard(item))}
              </div>
            </div>
          );
        })}

        {/* ── Customize Section ─────────────────────────────────────────── */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2"
            style={{ color: "oklch(0.75 0.2 50)" }}
          >
            <span
              className="flex-1 h-px"
              style={{ background: "oklch(0.45 0.14 50 / 0.45)" }}
            />
            <Sparkles size={13} style={{ color: "oklch(0.75 0.2 50)" }} />
            Customize
            <span
              className="flex-1 h-px"
              style={{ background: "oklch(0.45 0.14 50 / 0.45)" }}
            />
          </h3>
          <p
            className="text-[11px] text-center mb-3"
            style={{ color: "oklch(0.55 0.1 50)" }}
          >
            Unlock profile perks &amp; post reactions
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CUSTOMIZE_ITEMS.map((item) => renderCustomizeCard(item))}
          </div>
        </div>

        {/* Send to a Model section — visible to all users */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2"
            style={{ color: "oklch(0.75 0.18 330)" }}
          >
            <span
              className="flex-1 h-px"
              style={{ background: "oklch(0.45 0.14 330 / 0.45)" }}
            />
            💝 Send to a Model
            <span
              className="flex-1 h-px"
              style={{ background: "oklch(0.45 0.14 330 / 0.45)" }}
            />
          </h3>
          <p
            className="text-[11px] text-center mb-3"
            style={{ color: "oklch(0.55 0.10 330)" }}
          >
            Gift these to any model account — anyone can send
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODEL_GIFT_ITEMS.map((item) => renderItemCard(item))}
          </div>
        </div>

        {/* Model Exclusives section */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: "oklch(0.65 0.15 310)" }}
          >
            <span
              className="flex-1 h-px"
              style={{ background: "oklch(0.35 0.1 310 / 0.4)" }}
            />
            ✦ Model Exclusives
            <span
              className="flex-1 h-px"
              style={{ background: "oklch(0.35 0.1 310 / 0.4)" }}
            />
          </h3>

          {isModel ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODEL_EXCLUSIVE_ITEMS.map((item) => renderItemCard(item))}
            </div>
          ) : (
            <div
              className="rounded-xl p-6 flex flex-col items-center text-center gap-3"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.14 0.06 310 / 0.5), oklch(0.11 0.03 310 / 0.8))",
                border: "1px solid oklch(0.4 0.12 310 / 0.35)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.3 0.1 310 / 0.3)" }}
              >
                <Lock size={22} style={{ color: "oklch(0.6 0.15 310)" }} />
              </div>
              <div>
                <p
                  className="font-bold text-base"
                  style={{ color: "oklch(0.82 0.16 310)" }}
                >
                  Model Account Required
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "oklch(0.55 0.08 310)" }}
                >
                  Switch to a Model Account in Settings to unlock exclusive
                  items
                </p>
              </div>
              <Link to="/settings">
                <Button
                  type="button"
                  size="sm"
                  className="font-bold text-xs"
                  style={{
                    background: "oklch(0.55 0.2 310)",
                    color: "white",
                  }}
                >
                  Go to Settings →
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <SendGiftModal
        item={selectedItem}
        myPrincipal={myPrincipal}
        myBalance={balance}
        onClose={() => setSelectedItem(null)}
        onDeductBalance={onDeductBalance}
        onSent={() => {
          setSelectedItem(null);
          onBalanceChange();
        }}
      />

      <BuyCustomizationModal
        item={selectedCustomizeItem}
        myPrincipal={myPrincipal}
        myBalance={balance}
        onClose={() => setSelectedCustomizeItem(null)}
        onDeductBalance={onDeductBalance}
        onPurchased={() => {
          setSelectedCustomizeItem(null);
          refreshOwnership();
          onBalanceChange();
        }}
      />
    </>
  );
}

// ─── Balance Tab ──────────────────────────────────────────────────────────────

function BalanceTab({
  balance,
  myPrincipal,
}: {
  balance: number;
  myPrincipal: string;
}) {
  const EARN_RATES = [
    { label: "Create a post", amount: "+10 RB", icon: "📸" },
    { label: "Post reaches 10 likes", amount: "+5 RB", icon: "❤️" },
    { label: "Win a Build Battle", amount: "+100 RB", icon: "🏁" },
    { label: "Daily login", amount: "+5 RB", icon: "📅" },
    { label: "First post of the day", amount: "+15 RB", icon: "🌅" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Balance display */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl p-6 text-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.25 0.06 50), oklch(0.22 0.04 50))",
          border: "1px solid oklch(var(--orange) / 0.3)",
          boxShadow: "0 0 40px oklch(var(--orange) / 0.1)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, oklch(var(--orange) / 0.12) 0%, transparent 70%)",
          }}
        />
        <Coins
          size={32}
          className="mx-auto mb-2"
          style={{ color: "oklch(var(--orange))" }}
        />
        <p className="text-steel text-sm mb-1">Your RevBucks Balance</p>
        <p
          className="font-display text-5xl font-black"
          style={{ color: "oklch(var(--orange))" }}
        >
          ⚡ {balance.toLocaleString()}
        </p>
        <p className="text-steel text-xs mt-1">RB</p>
      </motion.div>

      {/* Earn rates */}
      <div>
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "oklch(var(--steel))" }}
        >
          How to Earn RevBucks
        </h3>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid oklch(var(--border))" }}
        >
          {EARN_RATES.map((rate, i) => (
            <div
              key={rate.label}
              className="flex items-center justify-between px-4 py-3"
              style={
                i < EARN_RATES.length - 1
                  ? { borderBottom: "1px solid oklch(var(--border))" }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-base">{rate.icon}</span>
                <p className="text-sm text-foreground">{rate.label}</p>
              </div>
              <Badge
                className="font-bold text-xs"
                style={{
                  background: "oklch(var(--orange) / 0.15)",
                  color: "oklch(var(--orange-bright))",
                  border: "1px solid oklch(var(--orange) / 0.3)",
                }}
              >
                {rate.amount}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Buy RevBucks */}
      <div>
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "oklch(var(--steel))" }}
        >
          Buy RevBucks
        </h3>
        <div className="flex flex-col gap-3">
          {STRIPE_PACKAGES.map((pkg) => (
            <motion.a
              key={pkg.id}
              href={`${pkg.link}?client_reference_id=${encodeURIComponent(myPrincipal)}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl p-5 text-center no-underline relative overflow-hidden cursor-pointer block"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.28 0.1 50), oklch(0.22 0.06 45))",
                border: "2px solid oklch(var(--orange) / 0.45)",
                boxShadow: "0 0 24px oklch(var(--orange) / 0.15)",
              }}
              onClick={() => {
                // Do NOT credit RB here — credits are applied on return from
                // Stripe via the ?success=true redirect handler in useEffect.
                // Crediting here AND on return would double-count the purchase.
                toast.success(
                  "Taking you to checkout\u2026 RevBucks will be credited when you return.",
                  { duration: 4000 },
                );
              }}
            >
              {pkg.badge && (
                <span
                  className="absolute top-3 right-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: "oklch(var(--orange))",
                    color: "oklch(var(--carbon))",
                  }}
                >
                  {pkg.badge}
                </span>
              )}
              <Zap
                size={28}
                className="mx-auto mb-2"
                style={{ color: "oklch(var(--orange))" }}
              />
              <p
                className="font-display font-black text-4xl"
                style={{ color: "oklch(var(--orange))" }}
              >
                {pkg.rb.toLocaleString()} RB
              </p>
              <p className="text-steel text-sm mt-1">{pkg.name}</p>
              <p
                className="font-bold text-2xl mt-3"
                style={{ color: "oklch(var(--foreground))" }}
              >
                {pkg.price}
              </p>
              <div className="flex items-center justify-center gap-1 mt-2 text-steel text-xs">
                <ExternalLink size={11} />
                Buy Now via Stripe
              </div>
            </motion.a>
          ))}
        </div>
        <p className="text-[11px] text-steel text-center mt-2">
          Secure checkout via Stripe · Balance credits instantly · Buy as many
          times as you want
        </p>
      </div>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ myPrincipal }: { myPrincipal: string }) {
  const history = getTransactionHistory(myPrincipal);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package size={40} className="text-steel mb-3" />
        <p className="font-semibold text-sm text-foreground">
          No transactions yet
        </p>
        <p className="text-steel text-xs mt-1">
          Create a post or buy RevBucks to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-8">
      {history.map((txn) => {
        const isPositive = txn.amount > 0;
        return (
          <motion.div
            key={txn.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{
              background: "oklch(var(--surface))",
              border: "1px solid oklch(var(--border))",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-base"
                style={{
                  background: isPositive
                    ? "oklch(0.35 0.12 150 / 0.3)"
                    : "oklch(0.35 0.15 27 / 0.3)",
                }}
              >
                {txn.type === "earn"
                  ? "⚡"
                  : txn.type === "purchase"
                    ? "🛒"
                    : "🎁"}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">
                  {txn.description}
                </p>
                <p className="text-[11px] text-steel">
                  {new Date(txn.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <span
              className="font-bold font-display text-sm shrink-0 ml-3"
              style={{
                color: isPositive
                  ? "oklch(0.72 0.2 150)"
                  : "oklch(0.65 0.22 27)",
              }}
            >
              {isPositive ? "+" : ""}
              {txn.amount} RB
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RevBucksPage() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toText() ?? "";
  const { meta, isLoading: metaLoading, profileLoaded } = useUserMeta();
  const { syncBalance } = useRevBucksSync();

  // Use local state as the live balance for instant UI updates.
  // Initialise from localStorage immediately; sync from on-chain once loaded.
  const [balance, setBalance] = useState<number>(() =>
    myPrincipal ? getBalance(myPrincipal) : 0,
  );
  // Track whether we have already promoted the on-chain value to avoid downgrading
  const onChainSynced = useRef(false);

  // When the on-chain profile loads, take the higher of the two values
  // (protects against a stale on-chain value overwriting a just-purchased balance).
  useEffect(() => {
    if (!profileLoaded || onChainSynced.current) return;
    onChainSynced.current = true;
    const localBal = getBalance(myPrincipal);
    const chainBal = meta.rb;
    const best = Math.max(localBal, chainBal);
    // If chain has more (e.g. admin credited), update localStorage to match
    // Set directly to avoid double-counting (don't use addBalance which increments)
    if (chainBal > localBal) {
      localStorage.setItem(`revbucks_balance_${myPrincipal}`, String(chainBal));
      localStorage.setItem(
        `revspace_rb_backup_${myPrincipal}`,
        String(chainBal),
      );
    }
    setBalance(best);
  }, [profileLoaded, meta.rb, myPrincipal]);

  const isModel = isModelAccountFromMeta(meta);

  // Track if the Stripe redirect has been handled to avoid double-crediting
  const [purchaseHandled, setPurchaseHandled] = useState(false);

  const refreshBalance = useCallback(() => {
    if (myPrincipal) {
      setBalance(getBalance(myPrincipal));
    }
  }, [myPrincipal]);

  // Auto-credit 550 RB when Stripe redirects back with ?purchased=true or ?success=true.
  // We write localStorage immediately (instant UX) then sync to chain with retry.
  // This is the ONLY place credits are issued — the Stripe link button does NOT credit RB
  // on click to prevent double-counting.
  useEffect(() => {
    if (!myPrincipal || purchaseHandled) return;
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("purchased") === "true" ||
      params.get("success") === "true"
    ) {
      setPurchaseHandled(true);
      // Remove query params immediately to prevent re-crediting on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("purchased");
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.toString());

      // Credit localStorage immediately so the UI updates right away
      recordPurchase(myPrincipal, 550, "RevBucks Pack");
      const newBal = getBalance(myPrincipal);
      setBalance(newBal);
      toast.success("⚡ 550 RevBucks added to your balance!", {
        duration: 5000,
      });

      // Sync the new balance to chain with retry — runs in background
      syncBalance(myPrincipal);
    }
  }, [myPrincipal, purchaseHandled, syncBalance]);

  const handleDeductBalance = useCallback(
    (_cost: number) => {
      // localStorage was already updated by deductBalance() in SendGiftModal.
      // Refresh local state and sync to chain.
      const newBal = getBalance(myPrincipal);
      setBalance(newBal);
      syncBalance(myPrincipal);
    },
    [myPrincipal, syncBalance],
  );

  if (!myPrincipal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-steel">Please log in to use RevBucks</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-2">
          <Coins size={22} style={{ color: "oklch(var(--orange))" }} />
          <h1 className="font-display text-2xl font-bold">RevBucks</h1>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
          style={{
            background: "oklch(var(--orange) / 0.15)",
            border: "1px solid oklch(var(--orange) / 0.35)",
            color: "oklch(var(--orange-bright))",
          }}
        >
          {metaLoading && balance === 0 ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <Zap size={14} />
              {balance.toLocaleString()} RB
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 pb-4">
        <Tabs defaultValue="shop">
          <TabsList
            className="w-full mb-5"
            style={{ background: "oklch(var(--surface))" }}
          >
            <TabsTrigger value="shop" className="flex-1 gap-1.5">
              <ShoppingBag size={14} />
              Shop
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex-1 gap-1.5">
              <Coins size={14} />
              My Balance
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <Package size={14} />
              History
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="shop">
              <ShopTab
                myPrincipal={myPrincipal}
                balance={balance}
                isModel={isModel}
                onBalanceChange={refreshBalance}
                onDeductBalance={handleDeductBalance}
              />
            </TabsContent>
            <TabsContent value="balance">
              <BalanceTab balance={balance} myPrincipal={myPrincipal} />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab myPrincipal={myPrincipal} />
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>

      {/* Hidden: pass deduct handler to SendGiftModal via ShopTab context — handled via prop */}
      {/* Footer */}
      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-4">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
