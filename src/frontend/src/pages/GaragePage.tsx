import { useState, useRef } from "react";
import { Plus, Car, Wrench, Trash2, Loader2, ImagePlus } from "lucide-react";
import { convertHeicToJpeg } from "../lib/convertHeic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMyGarage, useAddCar, useRemoveCar, useUploadFile } from "../hooks/useQueries";
import { toast } from "sonner";
import type { Car as CarType } from "../backend.d";

function CarDetailModal({ car, open, onClose }: { car: CarType; open: boolean; onClose: () => void }) {
  const removeCar = useRemoveCar();

  const handleRemove = () => {
    removeCar.mutate(car.id, {
      onSuccess: () => {
        toast.success("Car removed from garage");
        onClose();
      },
      onError: () => toast.error("Failed to remove car"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md w-full"
        style={{ background: "oklch(var(--surface))", border: "1px solid oklch(var(--border))" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {car.year} {car.make} {car.model}
          </DialogTitle>
        </DialogHeader>

        {car.imageUrls[0] && (
          <img
            src={car.imageUrls[0]}
            alt={`${car.year} ${car.make} ${car.model}`}
            className="w-full h-52 object-cover rounded-lg"
          />
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge style={{ background: "oklch(var(--orange) / 0.2)", color: "oklch(var(--orange-bright))", border: "1px solid oklch(var(--orange) / 0.3)" }}>
              {car.color}
            </Badge>
            <Badge variant="outline" className="text-xs border-border text-steel">{car.year}</Badge>
          </div>

          {car.description && (
            <p className="text-sm text-foreground">{car.description}</p>
          )}

          {car.modifications.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Wrench size={13} className="text-orange" />
                <p className="text-xs font-semibold text-steel uppercase tracking-wider">Modifications</p>
              </div>
              <ul className="space-y-1">
                {car.modifications.map((mod, i) => (
                  <li key={`mod-${car.id}-${i}`} className="text-sm text-foreground flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-orange shrink-0" />
                    {mod}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleRemove}
          disabled={removeCar.isPending}
          className="w-full border-destructive text-destructive hover:bg-destructive/10"
        >
          {removeCar.isPending ? (
            <Loader2 size={14} className="mr-2 animate-spin" />
          ) : (
            <Trash2 size={14} className="mr-2" />
          )}
          Remove from Garage
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function AddCarModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    description: "",
    modificationsText: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addCar = useAddCar();
  const uploadFile = useUploadFile();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    file = await convertHeicToJpeg(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm({ make: "", model: "", year: "", color: "", description: "", modificationsText: "" });
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mods = form.modificationsText
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);

    let imageUrls: string[] = [];

    if (imageFile) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const url = await uploadFile(imageFile, (pct) => setUploadProgress(pct));
        imageUrls = [url];
      } catch {
        toast.error("Failed to upload image");
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }
      setIsUploading(false);
      setUploadProgress(null);
    }

    addCar.mutate(
      {
        make: form.make,
        model: form.model,
        year: form.year,
        color: form.color,
        description: form.description,
        modifications: mods,
        imageUrls,
      },
      {
        onSuccess: () => {
          toast.success("Car added to garage!");
          resetForm();
          onClose();
        },
        onError: () => toast.error("Failed to add car"),
      }
    );
  };

  const isBusy = isUploading || addCar.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose(); } }}>
      <DialogContent
        className="max-w-md w-full"
        style={{ background: "oklch(var(--surface))", border: "1px solid oklch(var(--border))" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Car to Garage</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-steel mb-1 block">Make *</Label>
              <Input
                value={form.make}
                onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                placeholder="Subaru"
                required
                style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
              />
            </div>
            <div>
              <Label className="text-xs text-steel mb-1 block">Model *</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="WRX STI"
                required
                style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-steel mb-1 block">Year *</Label>
              <Input
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                placeholder="2006"
                required
                style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
              />
            </div>
            <div>
              <Label className="text-xs text-steel mb-1 block">Color</Label>
              <Input
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="WR Blue"
                style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Tell us about your build..."
              className="min-h-[70px] resize-none text-sm"
              style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
            />
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Modifications (one per line)</Label>
            <Textarea
              value={form.modificationsText}
              onChange={(e) => setForm((f) => ({ ...f, modificationsText: e.target.value }))}
              placeholder={"Coilovers\nCatback exhaust\nIntake"}
              className="min-h-[80px] resize-none text-sm font-mono"
              style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
            />
          </div>

          {/* Image Upload */}
          <div>
            <Label className="text-xs text-steel mb-1 block">Car Photo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Car preview"
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  onClick={() => { if (imagePreview) URL.revokeObjectURL(imagePreview); setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
                  style={{ background: "oklch(0 0 0 / 0.6)" }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm transition-opacity hover:opacity-80"
                style={{
                  background: "oklch(var(--surface-elevated))",
                  border: "2px dashed oklch(var(--border))",
                  color: "oklch(var(--steel-light))",
                }}
              >
                <ImagePlus size={16} />
                Upload car photo
              </button>
            )}
            {uploadProgress !== null && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-steel">Uploading...</span>
                  <span className="text-xs font-semibold" style={{ color: "oklch(var(--orange))" }}>
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(var(--surface-elevated))" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%`, background: "oklch(var(--orange))" }}
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isBusy || !form.make || !form.model || !form.year}
            className="w-full"
            style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
          >
            {isUploading ? (
              <><Loader2 size={14} className="mr-2 animate-spin" />Uploading photo...</>
            ) : addCar.isPending ? (
              <><Loader2 size={14} className="mr-2 animate-spin" />Adding...</>
            ) : (
              <>Add to Garage</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GaragePage() {
  const { data: cars, isLoading } = useMyGarage();
  const [selectedCar, setSelectedCar] = useState<CarType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const displayCars = cars ?? [];

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <h1 className="font-display text-2xl font-bold">My Garage</h1>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowAddModal(true)}
          style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
        >
          <Plus size={14} className="mr-1" />
          Add Car
        </Button>
      </header>

      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {(["g1","g2","g3","g4"]).map((k) => (
              <Skeleton key={k} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : displayCars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(var(--surface))" }}
            >
              <Car size={28} className="text-steel" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Empty Garage</h3>
            <p className="text-steel text-sm mb-6">Add your first car to showcase your build.</p>
            <Button
              type="button"
              onClick={() => setShowAddModal(true)}
              style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
            >
              <Plus size={14} className="mr-2" />
              Add First Car
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {displayCars.map((car) => (
              <button
                key={car.id}
                type="button"
                className="relative overflow-hidden rounded-xl cursor-pointer group text-left w-full"
                style={{ border: "1px solid oklch(var(--border))", background: "oklch(var(--surface))" }}
                onClick={() => setSelectedCar(car)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={car.imageUrls[0] ?? `https://picsum.photos/seed/${car.id}/400/300`}
                    alt={`${car.year} ${car.make} ${car.model}`}
                    className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "oklch(var(--orange) / 0.2)" }}
                  />
                  {car.modifications.length > 0 && (
                    <div className="absolute top-2 right-2">
                      <div
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          background: "oklch(var(--orange))",
                          color: "oklch(var(--carbon))",
                        }}
                      >
                        <Wrench size={9} />
                        {car.modifications.length}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-display text-base font-bold text-foreground leading-tight">
                    {car.year} {car.make}
                  </p>
                  <p className="font-display text-lg font-black text-orange leading-tight">
                    {car.model}
                  </p>
                  <Badge
                    className="mt-1 text-[9px] px-1.5 py-0"
                    style={{
                      background: "oklch(var(--surface-elevated))",
                      color: "oklch(var(--steel-light))",
                      border: "1px solid oklch(var(--border))",
                    }}
                  >
                    {car.color}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-4">
        © 2026. Built with ❤️ using{" "}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
          caffeine.ai
        </a>
      </footer>

      {selectedCar && (
        <CarDetailModal
          car={selectedCar}
          open={!!selectedCar}
          onClose={() => setSelectedCar(null)}
        />
      )}
      <AddCarModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
