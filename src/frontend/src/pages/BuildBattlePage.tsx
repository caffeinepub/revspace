import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  CheckCircle2,
  Clock,
  ImagePlus,
  Loader2,
  Swords,
  ThumbsUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUploadFile } from "../hooks/useQueries";
import {
  BATTLE_WIN_RB,
  type Battle,
  type BattleCar,
  type VoteSide,
  castVote,
  createBattle,
  formatBattleTimeLeft,
  getActiveBattles,
  getHistoryBattles,
  getMyVote,
  isBattleActive,
  isBattleOpen,
  joinBattle,
} from "../lib/buildBattle";
import { convertToJpegIfNeeded } from "../lib/convertHeic";

// ─── Small helpers ─────────────────────────────────────────────────────────────

function votePercent(battle: Battle, side: VoteSide): number {
  const total = battle.votesA.length + battle.votesB.length;
  if (total === 0) return 50;
  return Math.round(
    ((side === "A" ? battle.votesA.length : battle.votesB.length) / total) *
      100,
  );
}

// ─── Car submission mini-form ──────────────────────────────────────────────────

interface CarFormData {
  carName: string;
  ownerName: string;
  description: string;
  imageFile: File | null;
  imagePreview: string | null;
}

const DEFAULT_CAR: CarFormData = {
  carName: "",
  ownerName: "",
  description: "",
  imageFile: null,
  imagePreview: null,
};

interface CarFormProps {
  label: string;
  accentColor: string;
  data: CarFormData;
  onChange: (data: CarFormData) => void;
}

function CarForm({ label, accentColor, data, onChange }: CarFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    file = await convertToJpegIfNeeded(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange({
        ...data,
        imageFile: file as File,
        imagePreview: ev.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="space-y-3 rounded-xl p-4"
      style={{
        background: "oklch(var(--surface))",
        border: `1px solid ${accentColor}40`,
      }}
    >
      {/* Label */}
      <div
        className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full self-start inline-block"
        style={{
          background: `${accentColor}20`,
          color: accentColor,
          border: `1px solid ${accentColor}50`,
        }}
      >
        {label}
      </div>

      {/* Photo upload */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full relative overflow-hidden rounded-lg transition-all duration-200"
        style={{
          border: `2px dashed ${data.imagePreview ? `${accentColor}60` : "oklch(var(--border))"}`,
          background: "oklch(var(--surface-raised))",
          aspectRatio: "4/3",
          minHeight: 130,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor =
            `${accentColor}80`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = data.imagePreview
            ? `${accentColor}60`
            : "oklch(var(--border))";
        }}
      >
        {data.imagePreview ? (
          <>
            <img
              src={data.imagePreview}
              alt="Car preview"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: "oklch(0 0 0 / 0.5)" }}
            >
              <ImagePlus size={28} style={{ color: "white" }} />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Camera
              size={28}
              style={{ color: "oklch(var(--steel))" }}
              strokeWidth={1.5}
            />
            <p
              className="text-xs font-medium"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Upload car photo
            </p>
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.webp"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Car Name */}
      <div>
        <Label className="text-xs font-semibold mb-1 block text-steel-light">
          Car Name *
        </Label>
        <Input
          placeholder="e.g. 2002 Honda Civic Type R"
          value={data.carName}
          onChange={(e) => onChange({ ...data, carName: e.target.value })}
          style={{
            background: "oklch(var(--surface-raised))",
            border: "1px solid oklch(var(--border))",
            fontSize: 13,
          }}
        />
      </div>

      {/* Owner Name */}
      <div>
        <Label className="text-xs font-semibold mb-1 block text-steel-light">
          Your Name *
        </Label>
        <Input
          placeholder="e.g. Alex Rivera"
          value={data.ownerName}
          onChange={(e) => onChange({ ...data, ownerName: e.target.value })}
          style={{
            background: "oklch(var(--surface-raised))",
            border: "1px solid oklch(var(--border))",
            fontSize: 13,
          }}
        />
      </div>

      {/* Description */}
      <div>
        <Label className="text-xs font-semibold mb-1 block text-steel-light">
          Build Notes
        </Label>
        <Textarea
          placeholder="Mods, specs, story..."
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={2}
          style={{
            background: "oklch(var(--surface-raised))",
            border: "1px solid oklch(var(--border))",
            resize: "none",
            fontSize: 13,
          }}
        />
      </div>
    </div>
  );
}

// ─── Create Battle Modal (creator submits Car A only) ─────────────────────────

function CreateBattleModal({
  open,
  onClose,
  myPrincipal,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  myPrincipal: string;
  onSubmitted: () => void;
}) {
  const [car, setCar] = useState<CarFormData>(DEFAULT_CAR);
  const [uploading, setUploading] = useState(false);
  const uploadFile = useUploadFile();

  const handleClose = () => {
    if (uploading) return;
    setCar(DEFAULT_CAR);
    onClose();
  };

  const handleSubmit = useCallback(async () => {
    if (!car.carName.trim() || !car.ownerName.trim()) {
      toast.error("Please fill in car name and your name");
      return;
    }
    if (!car.imageFile) {
      toast.error("Please add a photo of your car");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(car.imageFile).catch(
        () => car.imagePreview ?? "",
      );

      const carData: BattleCar = {
        carName: car.carName.trim(),
        ownerName: car.ownerName.trim(),
        ownerPrincipal: myPrincipal,
        imageUrl: url,
        description: car.description.trim(),
      };

      createBattle(carData);
      toast.success("⚔️ Battle posted! Waiting for a challenger.", {
        duration: 5000,
      });
      setCar(DEFAULT_CAR);
      onSubmitted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to create battle: ${msg}`);
    } finally {
      setUploading(false);
    }
  }, [car, myPrincipal, uploadFile, onSubmitted]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-md w-full"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-xl font-black flex items-center gap-2"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.04em",
            }}
          >
            <Swords
              size={20}
              style={{ color: "oklch(var(--orange-bright))" }}
            />
            Issue a Build Battle
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm" style={{ color: "oklch(var(--steel-light))" }}>
          Submit your car to start a battle. Another user will join with their
          car, then the community votes for 5 days. Winner earns{" "}
          <span style={{ color: "oklch(var(--orange-bright))" }}>
            +{BATTLE_WIN_RB} RevBucks
          </span>
          .
        </p>

        <CarForm
          label="Your Car"
          accentColor="oklch(0.65 0.22 40)"
          data={car}
          onChange={setCar}
        />

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            className="flex-1"
            style={{
              border: "1px solid oklch(var(--border))",
              color: "oklch(var(--steel-light))",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.68 0.22 38) 0%, oklch(0.58 0.24 27) 100%)",
              color: "oklch(0.08 0.005 240)",
              boxShadow: "0 0 20px oklch(0.68 0.22 38 / 0.3)",
              border: "none",
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={15} className="animate-spin mr-2" />
                Uploading…
              </>
            ) : (
              <>
                <Swords size={15} className="mr-2" />
                Post Battle
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Join Battle Modal (challenger submits Car B) ─────────────────────────────

function JoinBattleModal({
  open,
  onClose,
  battle,
  myPrincipal,
  onJoined,
}: {
  open: boolean;
  onClose: () => void;
  battle: Battle;
  myPrincipal: string;
  onJoined: (updated: Battle) => void;
}) {
  const [car, setCar] = useState<CarFormData>(DEFAULT_CAR);
  const [uploading, setUploading] = useState(false);
  const uploadFile = useUploadFile();

  const handleClose = () => {
    if (uploading) return;
    setCar(DEFAULT_CAR);
    onClose();
  };

  const handleSubmit = useCallback(async () => {
    if (!car.carName.trim() || !car.ownerName.trim()) {
      toast.error("Please fill in car name and your name");
      return;
    }
    if (!car.imageFile) {
      toast.error("Please add a photo of your car");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(car.imageFile).catch(
        () => car.imagePreview ?? "",
      );

      const carData: BattleCar = {
        carName: car.carName.trim(),
        ownerName: car.ownerName.trim(),
        ownerPrincipal: myPrincipal,
        imageUrl: url,
        description: car.description.trim(),
      };

      const updated = joinBattle(battle.id, carData);
      toast.success("🔥 You've joined the battle! Voting is now live.", {
        duration: 5000,
      });
      setCar(DEFAULT_CAR);
      onJoined(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, [car, myPrincipal, battle.id, uploadFile, onJoined]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-md w-full"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-xl font-black flex items-center gap-2"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.04em",
            }}
          >
            <Swords size={20} style={{ color: "oklch(0.65 0.22 260)" }} />
            Accept the Challenge
          </DialogTitle>
        </DialogHeader>

        {/* Opponent's car preview */}
        <div
          className="rounded-xl p-3 flex items-center gap-3"
          style={{
            background: "oklch(var(--surface-raised))",
            border: "1px solid oklch(0.65 0.22 40 / 0.3)",
          }}
        >
          {battle.carA.imageUrl && (
            <img
              src={battle.carA.imageUrl}
              alt={battle.carA.carName}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <p
              className="text-xs font-black truncate"
              style={{ color: "oklch(0.65 0.22 40)" }}
            >
              Challenger: {battle.carA.carName}
            </p>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              by {battle.carA.ownerName}
            </p>
          </div>
        </div>

        <p className="text-sm" style={{ color: "oklch(var(--steel-light))" }}>
          Submit your car below. Once you join, voting opens for 5 days. Winner
          earns{" "}
          <span style={{ color: "oklch(var(--orange-bright))" }}>
            +{BATTLE_WIN_RB} RevBucks
          </span>
          .
        </p>

        <CarForm
          label="Your Car"
          accentColor="oklch(0.65 0.22 260)"
          data={car}
          onChange={setCar}
        />

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            className="flex-1"
            style={{
              border: "1px solid oklch(var(--border))",
              color: "oklch(var(--steel-light))",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.22 260) 0%, oklch(0.55 0.24 250) 100%)",
              color: "white",
              boxShadow: "0 0 20px oklch(0.65 0.22 260 / 0.3)",
              border: "none",
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={15} className="animate-spin mr-2" />
                Uploading…
              </>
            ) : (
              <>
                <Swords size={15} className="mr-2" />
                Accept &amp; Fight!
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Single Battle Card ────────────────────────────────────────────────────────

function BattleCard({
  battle,
  myPrincipal,
  onVoted,
  onJoined,
}: {
  battle: Battle;
  myPrincipal: string | undefined;
  onVoted: (updated: Battle) => void;
  onJoined: (updated: Battle) => void;
}) {
  const active = isBattleActive(battle);
  const open = isBattleOpen(battle);
  const myVote = myPrincipal ? getMyVote(battle, myPrincipal) : null;
  const pctA = votePercent(battle, "A");
  const pctB = votePercent(battle, "B");
  const totalVotes = battle.votesA.length + battle.votesB.length;
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const isMyBattle = myPrincipal === battle.carA.ownerPrincipal;
  const canJoin = open && myPrincipal && !isMyBattle;

  const handleVote = (side: VoteSide) => {
    if (!myPrincipal) {
      toast.error("Sign in to vote");
      return;
    }
    if (!active) return;
    try {
      const updated = castVote(battle.id, myPrincipal, side);
      onVoted(updated);
      toast.success(
        side === myVote ? "Vote removed" : `Voted for Car ${side}!`,
        { duration: 2000 },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    }
  };

  const winner = battle.winnerSide;

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-2xl overflow-hidden"
        style={{
          background: "oklch(var(--surface))",
          border: open
            ? "1px solid oklch(0.65 0.22 260 / 0.4)"
            : "1px solid oklch(var(--border))",
          boxShadow: active
            ? "0 4px 32px oklch(var(--orange) / 0.1)"
            : open
              ? "0 4px 24px oklch(0.65 0.22 260 / 0.12)"
              : "0 2px 16px oklch(0 0 0 / 0.3)",
        }}
      >
        {/* Status bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold"
          style={{
            background: active
              ? "oklch(var(--orange) / 0.08)"
              : open
                ? "oklch(0.65 0.22 260 / 0.08)"
                : "oklch(0 0 0 / 0.2)",
            borderBottom: "1px solid oklch(var(--border))",
          }}
        >
          <div className="flex items-center gap-1.5">
            {active ? (
              <>
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "oklch(0.72 0.28 145)" }}
                />
                <span style={{ color: "oklch(0.72 0.28 145)" }}>LIVE</span>
              </>
            ) : open ? (
              <>
                <Users size={11} style={{ color: "oklch(0.65 0.22 260)" }} />
                <span style={{ color: "oklch(0.65 0.22 260)" }}>
                  OPEN — NEEDS CHALLENGER
                </span>
              </>
            ) : (
              <>
                <Trophy
                  size={12}
                  style={{ color: "oklch(0.78 0.18 65)" }}
                  fill="currentColor"
                />
                <span style={{ color: "oklch(0.78 0.18 65)" }}>
                  BATTLE OVER
                </span>
              </>
            )}
          </div>
          <div
            className="flex items-center gap-1"
            style={{ color: "oklch(var(--steel-light))" }}
          >
            <Clock size={11} />
            {formatBattleTimeLeft(battle)}
          </div>
        </div>

        {/* Open battle: show Car A only + join CTA */}
        {open ? (
          <div className="p-4 space-y-4">
            {/* Car A */}
            <div className="flex gap-3">
              {battle.carA.imageUrl ? (
                <img
                  src={battle.carA.imageUrl}
                  alt={battle.carA.carName}
                  className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "oklch(var(--surface-raised))" }}
                >
                  <Camera size={24} style={{ color: "oklch(var(--steel))" }} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: "oklch(0.65 0.22 40 / 0.2)",
                    color: "oklch(0.65 0.22 40)",
                    border: "1px solid oklch(0.65 0.22 40 / 0.4)",
                  }}
                >
                  Car A
                </span>
                <h3
                  className="font-black text-base mt-1 truncate"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    color: "oklch(var(--foreground))",
                  }}
                >
                  {battle.carA.carName}
                </h3>
                <p className="text-xs" style={{ color: "oklch(0.65 0.22 40)" }}>
                  {battle.carA.ownerName}
                </p>
                {battle.carA.description && (
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: "oklch(var(--steel-light))" }}
                  >
                    {battle.carA.description}
                  </p>
                )}
              </div>
            </div>

            {/* VS + challenge slot */}
            <div
              className="rounded-xl p-4 flex items-center gap-4"
              style={{
                background: "oklch(0.65 0.22 260 / 0.06)",
                border: "2px dashed oklch(0.65 0.22 260 / 0.35)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.68 0.22 38) 0%, oklch(0.55 0.22 260) 100%)",
                  color: "white",
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                VS
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "oklch(0.65 0.22 260)" }}
                >
                  {canJoin
                    ? "Think you can take them?"
                    : isMyBattle
                      ? "Waiting for a challenger..."
                      : "Sign in to accept this challenge"}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "oklch(var(--steel-light))" }}
                >
                  {canJoin
                    ? "Upload your car and let the community decide"
                    : isMyBattle
                      ? "Share this page so someone joins your battle"
                      : ""}
                </p>
              </div>
              {canJoin && (
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.65 0.22 260) 0%, oklch(0.55 0.24 250) 100%)",
                    color: "white",
                    boxShadow: "0 0 16px oklch(0.65 0.22 260 / 0.3)",
                    border: "none",
                  }}
                >
                  <Swords size={13} />
                  Accept
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Active or ended: show both cars head-to-head */
          <>
            <div className="grid grid-cols-2 gap-0">
              {(["A", "B"] as const).map((side) => {
                const car = side === "A" ? battle.carA : battle.carB;
                if (!car) return null;
                const pct = side === "A" ? pctA : pctB;
                const votes =
                  side === "A" ? battle.votesA.length : battle.votesB.length;
                const voted = myVote === side;
                const isWinner = winner === side;
                const accentColor =
                  side === "A" ? "oklch(0.65 0.22 40)" : "oklch(0.65 0.22 260)";

                return (
                  <div
                    key={side}
                    className={`relative flex flex-col ${side === "A" ? "border-r border-surface-elevated" : ""}`}
                    style={{
                      borderColor: "oklch(var(--border))",
                      ...(isWinner && !active
                        ? {
                            background:
                              "linear-gradient(180deg, oklch(var(--surface)) 0%, oklch(0.18 0.06 65 / 0.15) 100%)",
                          }
                        : {}),
                    }}
                  >
                    {/* Car photo */}
                    <div className="relative" style={{ aspectRatio: "4/3" }}>
                      {car.imageUrl ? (
                        <img
                          src={car.imageUrl}
                          alt={car.carName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: "oklch(var(--surface-raised))" }}
                        >
                          <Camera
                            size={32}
                            style={{ color: "oklch(var(--steel))" }}
                            strokeWidth={1}
                          />
                        </div>
                      )}

                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to bottom, transparent 40%, oklch(0 0 0 / 0.7) 100%)",
                        }}
                      />

                      <div className="absolute top-2 left-2">
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                          style={{
                            background: `${accentColor}25`,
                            color: accentColor,
                            border: `1px solid ${accentColor}50`,
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          Car {side}
                        </span>
                      </div>

                      {isWinner && !active && (
                        <div className="absolute top-2 right-2">
                          <div
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{
                              background:
                                "linear-gradient(135deg, oklch(0.78 0.18 65) 0%, oklch(0.65 0.22 55) 100%)",
                              color: "oklch(0.1 0.01 50)",
                              boxShadow: "0 0 12px oklch(0.78 0.18 65 / 0.6)",
                            }}
                          >
                            <Trophy size={9} fill="currentColor" />
                            Winner
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Car info */}
                    <div className="px-3 py-2.5 space-y-1.5 flex-1">
                      <h3
                        className="font-black text-sm leading-tight truncate"
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          letterSpacing: "0.02em",
                          color:
                            isWinner && !active
                              ? "oklch(0.85 0.18 65)"
                              : "oklch(var(--foreground))",
                        }}
                      >
                        {car.carName}
                      </h3>
                      <p
                        className="text-xs font-medium"
                        style={{ color: accentColor }}
                      >
                        {car.ownerName}
                      </p>
                      {car.description && (
                        <p
                          className="text-xs leading-snug"
                          style={{
                            color: "oklch(var(--steel-light))",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {car.description}
                        </p>
                      )}
                    </div>

                    {/* Vote section */}
                    <div className="px-3 pb-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{
                            background: "oklch(var(--surface-elevated))",
                          }}
                        >
                          <motion.div
                            initial={{ width: "50%" }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ background: accentColor }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold w-8 text-right"
                          style={{ color: accentColor }}
                        >
                          {pct}%
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => active && handleVote(side)}
                        disabled={!active}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                        style={
                          voted
                            ? {
                                background: `${accentColor}25`,
                                color: accentColor,
                                border: `1.5px solid ${accentColor}70`,
                                cursor: "pointer",
                              }
                            : active
                              ? {
                                  background: "oklch(var(--surface-raised))",
                                  color: "oklch(var(--steel-light))",
                                  border: "1px solid oklch(var(--border))",
                                  cursor: "pointer",
                                }
                              : {
                                  background: "oklch(var(--surface-raised))",
                                  color: "oklch(var(--steel))",
                                  border: "1px solid oklch(var(--border))",
                                  cursor: "default",
                                  opacity: 0.6,
                                }
                        }
                        onMouseEnter={(e) => {
                          if (!active || voted) return;
                          (e.currentTarget as HTMLElement).style.background =
                            `${accentColor}15`;
                          (e.currentTarget as HTMLElement).style.borderColor =
                            `${accentColor}50`;
                        }}
                        onMouseLeave={(e) => {
                          if (!active || voted) return;
                          (e.currentTarget as HTMLElement).style.background =
                            "oklch(var(--surface-raised))";
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "oklch(var(--border))";
                        }}
                      >
                        {voted ? (
                          <>
                            <CheckCircle2 size={12} />
                            {votes} {votes === 1 ? "vote" : "votes"} — You voted
                          </>
                        ) : (
                          <>
                            <ThumbsUp size={12} />
                            {votes} {votes === 1 ? "vote" : "votes"}
                            {active && " — Vote"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="flex items-center justify-center py-3"
              style={{ borderTop: "1px solid oklch(var(--border))" }}
            >
              <span
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: "oklch(var(--steel))" }}
              >
                {totalVotes === 0
                  ? "No votes yet — be first!"
                  : `${totalVotes} total ${totalVotes === 1 ? "vote" : "votes"}`}
              </span>
            </div>
          </>
        )}
      </motion.article>

      {/* Join modal */}
      {myPrincipal && canJoin && (
        <JoinBattleModal
          open={joinModalOpen}
          onClose={() => setJoinModalOpen(false)}
          battle={battle}
          myPrincipal={myPrincipal}
          onJoined={(updated) => {
            setJoinModalOpen(false);
            onJoined(updated);
          }}
        />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function BuildBattlePage() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toText();

  const [activeBattles, setActiveBattles] = useState<Battle[]>([]);
  const [historyBattles, setHistoryBattles] = useState<Battle[]>([]);
  const [showModal, setShowModal] = useState(false);

  const refresh = useCallback(() => {
    setActiveBattles(getActiveBattles());
    setHistoryBattles(getHistoryBattles());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleVoted = useCallback((updated: Battle) => {
    setActiveBattles((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b)),
    );
  }, []);

  const handleJoined = useCallback((updated: Battle) => {
    setActiveBattles((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b)),
    );
  }, []);

  const handleSubmitted = () => {
    setShowModal(false);
    refresh();
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(var(--background))" }}
    >
      {/* Page header */}
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.68 0.22 38) 0%, oklch(0.58 0.24 27) 100%)",
              boxShadow: "0 0 16px oklch(0.68 0.22 38 / 0.4)",
            }}
          >
            <Swords
              size={16}
              style={{ color: "oklch(0.08 0.005 240)" }}
              strokeWidth={2.5}
            />
          </div>
          <div>
            <h1
              className="text-lg font-black leading-tight"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.04em",
                color: "oklch(var(--foreground))",
              }}
            >
              Build Battle
            </h1>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Issue a challenge · someone joins · community votes
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          size="sm"
          className="font-semibold text-sm"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.68 0.22 38) 0%, oklch(0.58 0.24 27) 100%)",
            color: "oklch(0.08 0.005 240)",
            boxShadow: "0 0 20px oklch(0.68 0.22 38 / 0.3)",
            border: "none",
          }}
        >
          <Swords size={13} className="mr-1.5" strokeWidth={2.5} />
          Challenge
        </Button>
      </header>

      <div className="px-4 py-6 max-w-5xl mx-auto space-y-10">
        {/* Info banner */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.12 0.015 240) 0%, oklch(0.14 0.02 38) 100%)",
            border: "1px solid oklch(var(--orange) / 0.2)",
          }}
        >
          <Zap
            size={18}
            fill="currentColor"
            style={{
              color: "oklch(var(--orange-bright))",
              flexShrink: 0,
              marginTop: 1,
            }}
          />
          <div>
            <p
              className="text-sm font-semibold mb-0.5"
              style={{ color: "oklch(var(--foreground))" }}
            >
              How it works
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Post your car to issue a challenge. Another user accepts by
              uploading their own car. Then the community votes for 5 days — the
              car with the most votes wins{" "}
              <span style={{ color: "oklch(var(--orange-bright))" }}>
                +{BATTLE_WIN_RB} RevBucks
              </span>
              .
            </p>
          </div>
        </div>

        {/* Active / Open Battles */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "oklch(0.72 0.28 145)" }}
            />
            <h2
              className="text-base font-black uppercase tracking-widest"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                color: "oklch(var(--foreground))",
                letterSpacing: "0.08em",
              }}
            >
              Active Battles
            </h2>
            {activeBattles.length > 0 && (
              <span
                className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.72 0.28 145 / 0.15)",
                  color: "oklch(0.72 0.28 145)",
                  border: "1px solid oklch(0.72 0.28 145 / 0.3)",
                }}
              >
                {activeBattles.length}
              </span>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {activeBattles.length === 0 ? (
              <motion.div
                key="empty-active"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.15 0.02 240) 0%, oklch(0.18 0.03 38) 100%)",
                    border: "1px solid oklch(var(--orange) / 0.2)",
                    boxShadow: "0 0 24px oklch(var(--orange) / 0.08)",
                  }}
                >
                  <Swords
                    size={28}
                    style={{ color: "oklch(var(--orange-bright))" }}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="text-center">
                  <p
                    className="font-black text-lg mb-1"
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: "0.04em",
                      color: "oklch(var(--foreground))",
                    }}
                  >
                    No Active Battles
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(var(--steel-light))" }}
                  >
                    Be the first to issue a challenge!
                  </p>
                </div>
                <Button
                  onClick={() => setShowModal(true)}
                  size="sm"
                  className="font-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.68 0.22 38) 0%, oklch(0.58 0.24 27) 100%)",
                    color: "oklch(0.08 0.005 240)",
                    boxShadow: "0 0 20px oklch(0.68 0.22 38 / 0.3)",
                    border: "none",
                  }}
                >
                  <Swords size={14} className="mr-1.5" />
                  Issue a Challenge
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {activeBattles.map((battle) => (
                  <BattleCard
                    key={battle.id}
                    battle={battle}
                    myPrincipal={myPrincipal}
                    onVoted={handleVoted}
                    onJoined={handleJoined}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* Battle History */}
        {historyBattles.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Trophy
                size={16}
                style={{ color: "oklch(0.78 0.18 65)" }}
                fill="currentColor"
              />
              <h2
                className="text-base font-black uppercase tracking-widest"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "oklch(var(--foreground))",
                  letterSpacing: "0.08em",
                }}
              >
                Battle History
              </h2>
              <span
                className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.78 0.18 65 / 0.12)",
                  color: "oklch(0.78 0.18 65)",
                  border: "1px solid oklch(0.78 0.18 65 / 0.25)",
                }}
              >
                {historyBattles.length}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {historyBattles.map((battle) => (
                <BattleCard
                  key={battle.id}
                  battle={battle}
                  myPrincipal={myPrincipal}
                  onVoted={handleVoted}
                  onJoined={handleJoined}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Create battle modal */}
      {myPrincipal && (
        <CreateBattleModal
          open={showModal}
          onClose={() => setShowModal(false)}
          myPrincipal={myPrincipal}
          onSubmitted={handleSubmitted}
        />
      )}

      {/* Not-logged-in prompt */}
      {!myPrincipal && showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "oklch(0 0 0 / 0.7)" }}
        >
          <div
            className="rounded-2xl p-6 text-center max-w-xs w-full"
            style={{
              background: "oklch(var(--surface))",
              border: "1px solid oklch(var(--border))",
            }}
          >
            <Swords
              size={32}
              className="mx-auto mb-3"
              style={{ color: "oklch(var(--orange-bright))" }}
            />
            <p
              className="font-black text-lg mb-1"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              Sign In Required
            </p>
            <p
              className="text-sm mb-4"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              You need to be signed in to create a battle.
            </p>
            <Button
              onClick={() => setShowModal(false)}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
