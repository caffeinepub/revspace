import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUploadFile } from "../hooks/useQueries";
import { convertToJpegIfNeeded } from "../lib/convertHeic";
import {
  FEATURE_COST_RB,
  type FeaturedCar,
  deleteFeaturedCar,
  formatTimeLeft,
  getActiveFeaturedCars,
  msUntilExpiry,
  submitFeaturedCar,
} from "../lib/featuredCars";
import { addTransaction, deductBalance, getBalance } from "../lib/revbucks";

// ─── Submit Form State ─────────────────────────────────────────────────────────

const FC_MAX_IMAGES = 5;

interface FormData {
  ownerName: string;
  carName: string;
  year: string;
  description: string;
  imageFiles: File[];
  imagePreviews: string[];
}

const DEFAULT_FORM: FormData = {
  ownerName: "",
  carName: "",
  year: "",
  description: "",
  imageFiles: [],
  imagePreviews: [],
};

// ─── Countdown Badge ──────────────────────────────────────────────────────────

function CountdownBadge({ car }: { car: FeaturedCar }) {
  const msLeft = msUntilExpiry(car);
  const isUrgent = msLeft < 24 * 60 * 60 * 1000; // < 24h
  const timeStr = formatTimeLeft(car);

  return (
    <motion.div
      animate={
        isUrgent
          ? {
              opacity: [1, 0.6, 1],
              scale: [1, 1.03, 1],
            }
          : {}
      }
      transition={
        isUrgent
          ? {
              duration: 1.8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }
          : {}
      }
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: isUrgent
          ? "oklch(0.58 0.24 27 / 0.25)"
          : "oklch(0 0 0 / 0.5)",
        border: `1px solid ${isUrgent ? "oklch(0.58 0.24 27 / 0.5)" : "oklch(0.5 0.01 240 / 0.4)"}`,
        color: isUrgent ? "oklch(0.85 0.18 40)" : "oklch(0.75 0.005 240)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Clock size={10} strokeWidth={2.5} />
      {timeStr}
    </motion.div>
  );
}

// ─── Weekly Badge ─────────────────────────────────────────────────────────────

function WeeklyBadge() {
  return (
    <div
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.68 0.22 55) 0%, oklch(0.58 0.24 27) 100%)",
        color: "oklch(0.1 0.01 50)",
        boxShadow:
          "0 0 12px oklch(0.68 0.22 55 / 0.6), 0 0 24px oklch(0.58 0.24 27 / 0.3)",
      }}
    >
      <Star size={10} strokeWidth={2.5} fill="currentColor" />
      Weekly Feature
    </div>
  );
}

// ─── Featured Car Card ────────────────────────────────────────────────────────

function FeaturedCarCard({
  car,
  myPrincipal,
  onDelete,
}: {
  car: FeaturedCar;
  myPrincipal: string | undefined;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const isOwner = myPrincipal && car.ownerPrincipal === myPrincipal;

  // Support both legacy imageUrl and new imageUrls array
  const images =
    car.imageUrls && car.imageUrls.length > 0
      ? car.imageUrls
      : car.imageUrl
        ? [car.imageUrl]
        : [];
  const hasMultiple = images.length > 1;
  const currentImage = images[imgIndex] ?? null;

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteFeaturedCar(car.id);
    onDelete(car.id);
    toast.success("Featured car removed");
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl cursor-pointer group"
      style={{
        background: "oklch(var(--surface))",
        border: "1px solid oklch(var(--border))",
        boxShadow: "0 4px 24px oklch(0 0 0 / 0.4)",
        transition: "box-shadow 0.3s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 8px 40px oklch(var(--orange) / 0.25), 0 0 0 1px oklch(var(--orange) / 0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 24px oklch(0 0 0 / 0.4)";
      }}
    >
      {/* Photo with gradient overlay */}
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        {currentImage ? (
          <img
            src={currentImage}
            alt={`${car.year} ${car.carName} view ${imgIndex + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.12 0.01 240) 0%, oklch(0.16 0.02 240) 100%)",
            }}
          >
            <Camera
              size={48}
              style={{ color: "oklch(var(--steel))" }}
              strokeWidth={1}
            />
          </div>
        )}

        {/* Carousel controls */}
        {hasMultiple && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                setImgIndex((i) => (i - 1 + images.length) % images.length);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0 0 0 / 0.55)" }}
            >
              <ChevronLeft size={15} color="white" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                setImgIndex((i) => (i + 1) % images.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0 0 0 / 0.55)" }}
            >
              <ChevronRight size={15} color="white" />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={`fcdot-${car.id}-${i}`}
                  type="button"
                  aria-label={`Go to photo ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgIndex(i);
                  }}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    background:
                      i === imgIndex ? "oklch(1 0 0)" : "oklch(1 0 0 / 0.4)",
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Dark gradient overlay at bottom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 30%, oklch(0 0 0 / 0.75) 100%)",
          }}
        />

        {/* Car name + year overlaid on photo */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8">
          <h3
            className="font-display text-2xl font-black leading-tight"
            style={{
              color: "oklch(0.97 0.005 240)",
              textShadow: "0 2px 8px oklch(0 0 0 / 0.8)",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            {car.carName}
          </h3>
          <p
            className="text-sm font-semibold"
            style={{
              color: "oklch(0.7 0.12 40)",
              textShadow: "0 1px 4px oklch(0 0 0 / 0.8)",
            }}
          >
            {car.year}
          </p>
        </div>

        {/* Weekly Feature badge — top right */}
        <div className="absolute top-3 right-3">
          <WeeklyBadge />
        </div>

        {/* Delete button — top left, owner only */}
        {isOwner && (
          <div className="absolute top-3 left-3">
            <button
              type="button"
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: confirmDelete
                  ? "oklch(0.58 0.24 27 / 0.9)"
                  : "oklch(0 0 0 / 0.55)",
                color: "oklch(0.95 0.005 240)",
                backdropFilter: "blur(8px)",
                border: `1px solid ${confirmDelete ? "oklch(0.7 0.18 27 / 0.6)" : "oklch(0.35 0.01 240 / 0.5)"}`,
              }}
            >
              <Trash2 size={11} strokeWidth={2.5} />
              {confirmDelete ? "Confirm?" : "Remove"}
            </button>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-2">
        {/* Owner name */}
        <p
          className="text-sm font-semibold"
          style={{ color: "oklch(var(--orange-bright))" }}
        >
          {car.ownerName}
        </p>

        {/* Description */}
        {car.description && (
          <p
            className="text-sm leading-relaxed"
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

        {/* Countdown */}
        <div className="flex items-center justify-between pt-1">
          <CountdownBadge car={car} />
          <span
            className="text-[11px]"
            style={{ color: "oklch(var(--steel))" }}
          >
            Featured
          </span>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────

function SubmitModal({
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
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();

  const handleFieldChange = (
    field: keyof Pick<
      FormData,
      "ownerName" | "carName" | "year" | "description"
    >,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    if (form.imageFiles.length >= FC_MAX_IMAGES) {
      toast.error(`Maximum ${FC_MAX_IMAGES} photos allowed`);
      return;
    }

    // Convert HEIC/HEIF/WebP to JPEG for broader browser compatibility
    file = await convertToJpegIfNeeded(file);

    const preview = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      imageFiles: [...prev.imageFiles, file as File],
      imagePreviews: [...prev.imagePreviews, preview],
    }));
    // Reset so same file can be chosen again after removal
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFormImage = (index: number) => {
    setForm((prev) => {
      URL.revokeObjectURL(prev.imagePreviews[index]);
      return {
        ...prev,
        imageFiles: prev.imageFiles.filter((_, i) => i !== index),
        imagePreviews: prev.imagePreviews.filter((_, i) => i !== index),
      };
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    for (const p of form.imagePreviews) URL.revokeObjectURL(p);
    setForm(DEFAULT_FORM);
    setUploadProgress(0);
    setUploadStep("");
    onClose();
  };

  const handleSubmit = useCallback(async () => {
    if (!form.ownerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!form.carName.trim()) {
      toast.error("Please enter a car name");
      return;
    }
    if (!form.year.trim() || form.year.length !== 4) {
      toast.error("Please enter a valid 4-digit year");
      return;
    }
    if (form.imageFiles.length === 0) {
      toast.error("Please add at least one photo of your car");
      return;
    }

    // Check balance
    const balance = getBalance(myPrincipal);
    if (balance < FEATURE_COST_RB) {
      toast.error(
        `Insufficient RevBucks. You need ${FEATURE_COST_RB} RB but have ${balance} RB.`,
      );
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // 1. Upload all photos sequentially
      const uploadedUrls: string[] = [];
      for (let i = 0; i < form.imageFiles.length; i++) {
        setUploadStep(`Uploading photo ${i + 1}/${form.imageFiles.length}...`);
        try {
          const url = await uploadFile(form.imageFiles[i], (pct) => {
            const overall = ((i + pct / 100) / form.imageFiles.length) * 100;
            setUploadProgress(Math.round(overall));
          });
          uploadedUrls.push(url);
        } catch {
          // Fallback to preview URL if upload fails
          uploadedUrls.push(form.imagePreviews[i] ?? "");
        }
      }

      // 2. Deduct RevBucks
      const ok = deductBalance(myPrincipal, FEATURE_COST_RB);
      if (!ok) {
        toast.error("Failed to deduct RevBucks. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // 3. Record transaction
      addTransaction(myPrincipal, {
        type: "spend",
        description: `Featured Car: ${form.carName} (${form.year})`,
        amount: -FEATURE_COST_RB,
      });

      // 4. Save to featured cars store
      submitFeaturedCar({
        ownerPrincipal: myPrincipal,
        ownerName: form.ownerName.trim(),
        carName: form.carName.trim(),
        year: form.year.trim(),
        description: form.description.trim(),
        imageUrl: uploadedUrls[0] ?? "",
        imageUrls: uploadedUrls,
      });

      toast.success("🌟 Your car is now featured for 1 week!", {
        duration: 5000,
      });

      for (const p of form.imagePreviews) URL.revokeObjectURL(p);
      setForm(DEFAULT_FORM);
      setUploadProgress(0);
      setUploadStep("");
      onSubmitted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to feature car: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, myPrincipal, uploadFile, onSubmitted]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-lg w-full"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-xl font-black"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.03em",
            }}
          >
            Feature Your Car
          </DialogTitle>
        </DialogHeader>

        {/* Cost reminder */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={{
            background: "oklch(var(--orange) / 0.1)",
            border: "1px solid oklch(var(--orange) / 0.25)",
          }}
        >
          <Zap size={14} style={{ color: "oklch(var(--orange-bright))" }} />
          <span style={{ color: "oklch(var(--orange-bright))" }}>
            <strong>1,200 RB</strong> will be deducted from your balance
          </span>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {/* Car photo upload — up to 5 photos */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              Car Photos <span className="text-ember">*</span>
              <span
                className="ml-1 text-xs font-normal"
                style={{ color: "oklch(var(--steel))" }}
              >
                ({form.imagePreviews.length}/{FC_MAX_IMAGES})
              </span>
            </Label>

            {/* Thumbnail strip */}
            {form.imagePreviews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                {form.imagePreviews.map((preview, i) => (
                  <div
                    key={preview}
                    className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden"
                    style={{ border: "1px solid oklch(var(--border))" }}
                  >
                    <img
                      src={preview}
                      alt={`Car view ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Remove car view ${i + 1}`}
                      onClick={() => removeFormImage(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "oklch(0 0 0 / 0.65)" }}
                    >
                      <X size={10} color="white" />
                    </button>
                  </div>
                ))}

                {/* Add More button */}
                {form.imagePreviews.length < FC_MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 text-xs transition-opacity hover:opacity-80"
                    style={{
                      background: "oklch(var(--surface-raised))",
                      border: "2px dashed oklch(var(--border))",
                      color: "oklch(var(--steel-light))",
                    }}
                  >
                    <ImagePlus size={16} />
                    Add
                  </button>
                )}
              </div>
            )}

            {/* Initial upload area when no images */}
            {form.imagePreviews.length === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full relative overflow-hidden rounded-lg transition-all duration-200"
                style={{
                  border: "2px dashed oklch(var(--border))",
                  background: "oklch(var(--surface-raised))",
                  aspectRatio: "16/9",
                  minHeight: 140,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "oklch(var(--orange) / 0.6)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "oklch(var(--border))";
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <ImagePlus
                    size={32}
                    style={{ color: "oklch(var(--steel))" }}
                    strokeWidth={1.5}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: "oklch(var(--steel-light))" }}
                  >
                    Tap to upload photos
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(var(--steel))" }}
                  >
                    Up to {FC_MAX_IMAGES} photos · JPG, PNG, HEIC
                  </p>
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif,.webp"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="fc-owner"
                className="text-sm font-semibold mb-1.5 block"
              >
                Your Name <span className="text-ember">*</span>
              </Label>
              <Input
                id="fc-owner"
                placeholder="e.g. Alex Rivera"
                value={form.ownerName}
                onChange={(e) => handleFieldChange("ownerName", e.target.value)}
                style={{
                  background: "oklch(var(--surface-raised))",
                  border: "1px solid oklch(var(--border))",
                }}
              />
            </div>
            <div>
              <Label
                htmlFor="fc-year"
                className="text-sm font-semibold mb-1.5 block"
              >
                Year <span className="text-ember">*</span>
              </Label>
              <Input
                id="fc-year"
                placeholder="e.g. 2006"
                value={form.year}
                maxLength={4}
                onChange={(e) =>
                  handleFieldChange("year", e.target.value.replace(/\D/g, ""))
                }
                style={{
                  background: "oklch(var(--surface-raised))",
                  border: "1px solid oklch(var(--border))",
                }}
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="fc-carname"
              className="text-sm font-semibold mb-1.5 block"
            >
              Car Name <span className="text-ember">*</span>
            </Label>
            <Input
              id="fc-carname"
              placeholder="e.g. Honda Civic Type R"
              value={form.carName}
              onChange={(e) => handleFieldChange("carName", e.target.value)}
              style={{
                background: "oklch(var(--surface-raised))",
                border: "1px solid oklch(var(--border))",
              }}
            />
          </div>

          <div>
            <Label
              htmlFor="fc-desc"
              className="text-sm font-semibold mb-1.5 block"
            >
              Description
            </Label>
            <Textarea
              id="fc-desc"
              placeholder="Tell the community about your build — mods, specs, story..."
              value={form.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              rows={3}
              style={{
                background: "oklch(var(--surface-raised))",
                border: "1px solid oklch(var(--border))",
                resize: "none",
              }}
            />
          </div>
        </div>

        {/* Upload progress */}
        {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "oklch(var(--steel-light))" }}>
                {uploadStep || "Uploading photos..."}
              </span>
              <span style={{ color: "oklch(var(--orange-bright))" }}>
                {uploadProgress}%
              </span>
            </div>
            <Progress
              value={uploadProgress}
              className="h-1.5"
              style={
                {
                  "--progress-foreground": "oklch(var(--orange))",
                } as React.CSSProperties
              }
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
            className="flex-1 font-semibold"
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
              boxShadow: "0 0 20px oklch(var(--orange) / 0.3)",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin mr-2" />
                Featuring...
              </>
            ) : (
              <>
                <Star size={15} className="mr-2" />
                Feature My Car · 1,200 RB
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FeaturedCarPage() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toText();

  const [cars, setCars] = useState<FeaturedCar[]>([]);
  const [balance, setBalance] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Load active featured cars
  const refresh = useCallback(() => {
    setCars(getActiveFeaturedCars());
  }, []);

  // Load balance
  const refreshBalance = useCallback(() => {
    if (!myPrincipal) return;
    setBalance(getBalance(myPrincipal));
  }, [myPrincipal]);

  // Initial load
  useEffect(() => {
    refresh();
    refreshBalance();
  }, [refresh, refreshBalance]);

  // Auto-refresh every 60s to keep countdowns live
  useEffect(() => {
    const id = setInterval(() => {
      refresh();
      refreshBalance();
    }, 60_000);
    return () => clearInterval(id);
  }, [refresh, refreshBalance]);

  const canFeature = balance >= FEATURE_COST_RB;

  const handleDelete = (id: string) => {
    setCars((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmitted = () => {
    setShowModal(false);
    refresh();
    refreshBalance();
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
                "linear-gradient(135deg, oklch(0.68 0.22 55) 0%, oklch(0.58 0.24 27) 100%)",
              boxShadow: "0 0 16px oklch(0.68 0.22 55 / 0.4)",
            }}
          >
            <Trophy
              size={16}
              style={{ color: "oklch(0.1 0.01 50)" }}
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
              Weekly Featured Cars
            </h1>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Spotlight your build · 1 week · 1,200 RevBucks
            </p>
          </div>
        </div>

        {/* Feature My Car button + balance */}
        <div className="flex items-center gap-3">
          {myPrincipal && (
            <div
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full"
              style={{
                background: "oklch(var(--orange) / 0.1)",
                border: "1px solid oklch(var(--orange) / 0.25)",
                color: "oklch(var(--orange-bright))",
              }}
            >
              <Zap size={11} />
              {balance.toLocaleString()} RB
            </div>
          )}
          <Button
            onClick={() => setShowModal(true)}
            disabled={!canFeature || !myPrincipal}
            size="sm"
            className="font-semibold text-sm"
            style={
              canFeature && myPrincipal
                ? {
                    background:
                      "linear-gradient(135deg, oklch(0.68 0.22 55) 0%, oklch(0.58 0.24 27) 100%)",
                    color: "oklch(0.1 0.01 50)",
                    boxShadow: "0 0 20px oklch(0.68 0.22 55 / 0.35)",
                    border: "none",
                  }
                : {
                    background: "oklch(var(--surface-raised))",
                    color: "oklch(var(--steel))",
                    border: "1px solid oklch(var(--border))",
                  }
            }
          >
            <Star size={13} className="mr-1.5" strokeWidth={2.5} />
            {!myPrincipal
              ? "Sign In to Feature"
              : !canFeature
                ? `Need ${(FEATURE_COST_RB - balance).toLocaleString()} more RB`
                : "Feature My Car"}
          </Button>
        </div>
      </header>

      {/* Content area */}
      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Balance strip on mobile */}
        {myPrincipal && (
          <div
            className="sm:hidden flex items-center justify-between mb-4 px-4 py-2.5 rounded-lg"
            style={{
              background: "oklch(var(--orange) / 0.08)",
              border: "1px solid oklch(var(--orange) / 0.2)",
            }}
          >
            <span
              className="text-sm"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Your balance
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: "oklch(var(--orange-bright))" }}
            >
              <Zap
                size={12}
                className="inline mr-1"
                style={{ color: "oklch(var(--orange-bright))" }}
              />
              {balance.toLocaleString()} RevBucks
            </span>
          </div>
        )}

        {/* Info banner */}
        <div
          className="mb-6 px-4 py-3 rounded-xl flex items-start gap-3"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.12 0.015 240) 0%, oklch(0.14 0.02 50) 100%)",
            border: "1px solid oklch(var(--orange) / 0.2)",
          }}
        >
          <Star
            size={18}
            fill="currentColor"
            style={{
              color: "oklch(0.75 0.22 55)",
              flexShrink: 0,
              marginTop: 1,
            }}
          />
          <div>
            <p
              className="text-sm font-semibold mb-0.5"
              style={{ color: "oklch(var(--foreground))" }}
            >
              Get your build in the spotlight
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "oklch(var(--steel-light))" }}
            >
              Each featured car is displayed for exactly 7 days then
              automatically removed. Slots cost 1,200 RevBucks — earn more by
              posting, getting likes, and winning Build Battles.
            </p>
          </div>
        </div>

        {/* Cars grid */}
        <AnimatePresence mode="popLayout">
          {cars.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-5"
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.15 0.02 240) 0%, oklch(0.18 0.03 50) 100%)",
                  border: "1px solid oklch(var(--orange) / 0.2)",
                  boxShadow: "0 0 32px oklch(var(--orange) / 0.1)",
                }}
              >
                <Trophy
                  size={36}
                  style={{ color: "oklch(0.75 0.22 55)" }}
                  strokeWidth={1.5}
                />
              </div>
              <div className="text-center space-y-1.5">
                <h2
                  className="text-xl font-black"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.04em",
                    color: "oklch(var(--foreground))",
                  }}
                >
                  No Featured Cars This Week
                </h2>
                <p
                  className="text-sm"
                  style={{ color: "oklch(var(--steel-light))" }}
                >
                  Be the first to feature your build!
                </p>
              </div>
              {myPrincipal && canFeature && (
                <Button
                  onClick={() => setShowModal(true)}
                  className="font-semibold mt-2"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.68 0.22 55) 0%, oklch(0.58 0.24 27) 100%)",
                    color: "oklch(0.1 0.01 50)",
                    boxShadow: "0 0 20px oklch(0.68 0.22 55 / 0.35)",
                    border: "none",
                  }}
                >
                  <Star size={15} className="mr-2" />
                  Feature Your Car · 1,200 RB
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {cars.map((car) => (
                <FeaturedCarCard
                  key={car.id}
                  car={car}
                  myPrincipal={myPrincipal}
                  onDelete={handleDelete}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit modal */}
      {myPrincipal && (
        <SubmitModal
          open={showModal}
          onClose={() => setShowModal(false)}
          myPrincipal={myPrincipal}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
}
