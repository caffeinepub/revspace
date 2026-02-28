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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, ExternalLink, Package, ShoppingBag, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
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
}: {
  item: ShopItem | null;
  myPrincipal: string;
  myBalance: number;
  onClose: () => void;
  onSent: () => void;
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
      toast.success(`${item.emoji} ${item.name} sent!`);
      setIsSending(false);
      onSent();
    }, 600);
  }, [item, recipient, canAfford, myPrincipal, onSent]);

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

// ─── Shop Tab ─────────────────────────────────────────────────────────────────

function ShopTab({
  myPrincipal,
  balance,
  onBalanceChange,
}: {
  myPrincipal: string;
  balance: number;
  onBalanceChange: () => void;
}) {
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  return (
    <>
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
                {items.map((item) => {
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
                        boxShadow: canAfford
                          ? `0 0 16px ${rarityConfig.glow}`
                          : "none",
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
                            <Zap
                              size={13}
                              style={{ color: "oklch(var(--orange))" }}
                            />
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
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <SendGiftModal
        item={selectedItem}
        myPrincipal={myPrincipal}
        myBalance={balance}
        onClose={() => setSelectedItem(null)}
        onSent={() => {
          setSelectedItem(null);
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
  onBalanceChange,
}: {
  balance: number;
  myPrincipal: string;
  onBalanceChange: () => void;
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
                // Credit 550 RB immediately so users see the balance update
                recordPurchase(myPrincipal, pkg.rb, pkg.name);
                onBalanceChange();
                toast.success(
                  `⚡ ${pkg.rb} RevBucks added to your balance! Taking you to checkout...`,
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
  const [balanceTick, setBalanceTick] = useState(0);
  const balance = getBalance(myPrincipal);

  const refreshBalance = useCallback(() => setBalanceTick((t) => t + 1), []);
  // Suppress unused variable lint — balanceTick is intentionally used as
  // a re-render trigger; the actual balance is read inline from localStorage.
  void balanceTick;

  // Auto-credit 550 RB when Stripe redirects back with ?purchased=true or ?success=true
  useEffect(() => {
    if (!myPrincipal) return;
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("purchased") === "true" ||
      params.get("success") === "true"
    ) {
      recordPurchase(myPrincipal, 550, "RevBucks Pack");
      refreshBalance();
      toast.success("⚡ 550 RevBucks have been added to your balance!", {
        duration: 5000,
      });
      // Remove the query param so it doesn't re-credit on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("purchased");
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.toString());
    }
  }, [myPrincipal, refreshBalance]);

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
          <Zap size={14} />
          {balance.toLocaleString()} RB
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
                onBalanceChange={refreshBalance}
              />
            </TabsContent>
            <TabsContent value="balance">
              <BalanceTab
                balance={balance}
                myPrincipal={myPrincipal}
                onBalanceChange={refreshBalance}
              />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab myPrincipal={myPrincipal} />
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>

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
