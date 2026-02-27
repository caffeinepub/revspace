import { useState, useRef } from "react";
import { ShoppingBag, MapPin, Plus, Loader2, CheckCircle, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllListings, useCreateListing, useMarkListingSold, useDeleteListing, useUploadFile } from "../hooks/useQueries";
import { formatPrice, truncatePrincipal } from "../utils/format";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { Listing } from "../backend.d";
import { toast } from "sonner";

const CATEGORIES = ["All", "Cars", "Parts", "Accessories"];
const CONDITIONS = ["New", "Like New", "Good", "Fair", "For Parts"];

const CONDITION_COLORS: Record<string, string> = {
  New: "bg-green-500/20 text-green-400 border-green-500/30",
  "Like New": "bg-green-500/15 text-green-400 border-green-500/25",
  Good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Fair: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "For Parts": "bg-red-500/20 text-red-400 border-red-500/30",
};

function ListingDetailModal({ listing, open, onClose }: { listing: Listing; open: boolean; onClose: () => void }) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const isOwner = myPrincipal === listing.seller.toString();
  const markSold = useMarkListingSold();
  const deleteListing = useDeleteListing();
  const sellerKey = listing.seller.toString();
  const sellerName = truncatePrincipal(sellerKey);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{ background: "oklch(var(--surface))", border: "1px solid oklch(var(--border))" }}
      >
        <img
          src={listing.imageUrls[0] || `https://picsum.photos/seed/${listing.id}/600/400`}
          alt={listing.title}
          className="w-full h-52 object-cover rounded-lg"
        />
        <DialogHeader>
          <DialogTitle className="font-display text-xl leading-tight">{listing.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-3xl font-black text-orange">${formatPrice(listing.price)}</span>
            <div className="flex items-center gap-2">
              {listing.isSold && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                  SOLD
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CONDITION_COLORS[listing.condition] ?? "badge-orange"}`}>
                {listing.condition}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "oklch(var(--orange) / 0.15)",
                  color: "oklch(var(--orange-bright))",
                  border: "1px solid oklch(var(--orange) / 0.3)",
                }}
              >
                {listing.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-steel">
            <MapPin size={12} className="text-orange" />
            {listing.location}
          </div>

          <p className="text-sm text-foreground leading-relaxed">{listing.description}</p>

          <div
            className="flex items-center gap-2 p-3 rounded-lg"
            style={{ background: "oklch(var(--surface-elevated))" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
            >
              {sellerName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold">{sellerName}</p>
              <p className="text-[10px] text-steel">Seller</p>
            </div>
          </div>
        </div>

        {!listing.isSold && !isOwner && (
          <Button
            type="button"
            className="w-full"
            onClick={() => toast.success("Message sent to seller!")}
            style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
          >
            Contact Seller
          </Button>
        )}

        {isOwner && !listing.isSold && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border"
              disabled={markSold.isPending || deleteListing.isPending}
              onClick={() =>
                markSold.mutate(listing.id, {
                  onSuccess: () => {
                    toast.success("Listing marked as sold");
                    onClose();
                  },
                  onError: (err) => toast.error(`Failed to mark sold: ${err instanceof Error ? err.message : "Unknown error"}`),
                })
              }
            >
              {markSold.isPending ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} className="mr-1.5" />Mark Sold</>}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              disabled={deleteListing.isPending || markSold.isPending}
              onClick={() => {
                deleteListing.mutate(listing.id, {
                  onSuccess: () => {
                    toast.success("Listing deleted");
                    onClose();
                  },
                  onError: (err) => toast.error(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`),
                });
              }}
            >
              {deleteListing.isPending ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateListingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "Parts",
    condition: "Good",
    location: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createListing = useCreateListing();
  const uploadFile = useUploadFile();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetAll = () => {
    clearImage();
    setForm({ title: "", description: "", price: "", category: "Parts", condition: "Good", location: "" });
    setUploadProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrls: string[] = [];

    if (imageFile) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const url = await uploadFile(imageFile, (pct) => setUploadProgress(pct));
        imageUrls = [url];
      } catch {
        toast.error("Failed to upload photo");
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }
      setIsUploading(false);
      setUploadProgress(null);
    }

    createListing.mutate(
      {
        title: form.title,
        description: form.description,
        price: BigInt(Math.round(parseFloat(form.price) || 0)),
        category: form.category,
        condition: form.condition,
        imageUrls,
        location: form.location,
      },
      {
        onSuccess: () => {
          toast.success("Listing created!");
          resetAll();
          onClose();
        },
        onError: () => toast.error("Failed to create listing"),
      }
    );
  };

  const isBusy = isUploading || createListing.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetAll(); onClose(); } }}>
      <DialogContent
        className="max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{ background: "oklch(var(--surface))", border: "1px solid oklch(var(--border))" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create Listing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-steel mb-1 block">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="2006 Subaru WRX STI..."
              required
              style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-steel mb-1 block">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(var(--surface))" }}>
                  {CATEGORIES.slice(1).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-steel mb-1 block">Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}>
                <SelectTrigger style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(var(--surface))" }}>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-steel mb-1 block">Price (USD) *</Label>
              <Input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                type="number"
                min="0"
                placeholder="1200"
                required
                style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
              />
            </div>
            <div>
              <Label className="text-xs text-steel mb-1 block">Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Los Angeles, CA"
                style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the item..."
              className="min-h-[80px] resize-none text-sm"
              style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
            />
          </div>

          {/* Photo upload */}
          <div>
            <Label className="text-xs text-steel mb-1 block">Photo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
                  style={{ background: "oklch(0 0 0 / 0.6)" }}
                >
                  <X size={12} />
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
                Upload photo
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
            disabled={isBusy || !form.title || !form.price}
            className="w-full"
            style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
          >
            {isUploading ? (
              <><Loader2 size={14} className="mr-2 animate-spin" />Uploading photo...</>
            ) : createListing.isPending ? (
              <><Loader2 size={14} className="mr-2 animate-spin" />Creating...</>
            ) : (
              "Create Listing"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MarketplacePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: listings, isLoading } = useAllListings();

  const displayListings = listings ?? [];
  const filtered = activeCategory === "All"
    ? displayListings
    : displayListings.filter((l) => l.category === activeCategory);

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <h1 className="font-display text-2xl font-bold">Marketplace</h1>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
        >
          <Plus size={14} className="mr-1" />
          Sell
        </Button>
      </header>

      {/* Category filter */}
      <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className="shrink-0 text-sm px-3 py-1.5 rounded-full font-medium transition-all"
            style={
              activeCategory === cat
                ? { background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }
                : { background: "oklch(var(--surface))", color: "oklch(var(--steel-light))", border: "1px solid oklch(var(--border))" }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {(["l1","l2","l3","l4"]).map((k) => (
              <Skeleton key={k} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag size={32} className="mx-auto mb-3 text-steel" />
            <p className="text-steel text-sm">No listings yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((listing) => (
              <button
                key={listing.id}
                type="button"
                className="relative overflow-hidden rounded-xl cursor-pointer group text-left w-full"
                style={{ border: "1px solid oklch(var(--border))", background: "oklch(var(--surface))" }}
                onClick={() => setSelectedListing(listing)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={listing.imageUrls[0] || `https://picsum.photos/seed/${listing.id}/400/300`}
                    alt={listing.title}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {listing.isSold && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "oklch(0 0 0 / 0.7)" }}
                    >
                      <span className="text-white font-display text-xl font-black rotate-[-20deg]">SOLD</span>
                    </div>
                  )}
                  <span
                    className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${CONDITION_COLORS[listing.condition] ?? "badge-orange"}`}
                  >
                    {listing.condition}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{listing.title}</p>
                  <p
                    className="font-display text-xl font-black mt-1"
                    style={{ color: "oklch(var(--orange-bright))" }}
                  >
                    ${formatPrice(listing.price)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={9} className="text-steel" />
                    <span className="text-[10px] text-steel truncate">{listing.location}</span>
                  </div>
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

      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          open={!!selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
      <CreateListingModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
