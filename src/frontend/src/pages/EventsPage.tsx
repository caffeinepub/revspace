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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Camera,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Users,
  X,
  ZoomIn,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { EventView } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddEventPhoto,
  useAllEvents,
  useCreateEvent,
  useDeleteEvent,
  useGetEventPhotos,
  useRsvpEvent,
  useUnrsvpEvent,
  useUploadFile,
} from "../hooks/useQueries";
import { convertHeicToJpeg } from "../lib/convertHeic";
import { formatDate, formatPrice } from "../utils/format";

const EVENT_CATEGORIES = ["All", "Cruise", "Show", "Track", "Meetup"];

const CATEGORY_COLORS: Record<string, string> = {
  Cruise: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Show: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Track: "bg-red-500/20 text-red-400 border-red-500/30",
  Meetup: "bg-green-500/20 text-green-400 border-green-500/30",
};

function EventDetailModal({
  event,
  open,
  onClose,
}: { event: EventView; open: boolean; onClose: () => void }) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const isCreator = myPrincipal
    ? event.creator.toString() === myPrincipal
    : false;
  const isAttending = myPrincipal
    ? event.attendees.some((a) => a.toString() === myPrincipal)
    : false;
  const rsvp = useRsvpEvent();
  const unrsvp = useUnrsvpEvent();
  const deleteEvent = useDeleteEvent();
  const addEventPhoto = useAddEventPhoto();
  const uploadFile = useUploadFile();
  const { data: photos } = useGetEventPhotos(event.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadPct, setPhotoUploadPct] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleRsvp = () => {
    if (!myPrincipal) {
      toast.error("Sign in to RSVP");
      return;
    }
    if (isAttending) {
      unrsvp.mutate(event.id, {
        onSuccess: () => toast.success("RSVP cancelled"),
        onError: () => toast.error("Failed to cancel RSVP"),
      });
    } else {
      rsvp.mutate(event.id, {
        onSuccess: () => toast.success("RSVP confirmed! See you there 🔥"),
        onError: () => toast.error("Failed to RSVP"),
      });
    }
  };

  const handleDeleteEvent = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteEvent.mutate(event.id, {
      onSuccess: () => {
        toast.success("Event deleted");
        onClose();
      },
      onError: () => toast.error("Failed to delete event"),
    });
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    file = await convertHeicToJpeg(file);
    setIsUploadingPhoto(true);
    setPhotoUploadPct(0);
    try {
      const url = await uploadFile(file, (pct) => setPhotoUploadPct(pct));
      addEventPhoto.mutate(
        { eventId: event.id, photoUrl: url },
        {
          onSuccess: () => toast.success("Photo added!"),
          onError: () => toast.error("Failed to add photo"),
        },
      );
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
      setPhotoUploadPct(0);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const allPhotos = [...(photos ?? []), ...(event.photos ?? [])].filter(
    (url, i, arr) => url && arr.indexOf(url) === i,
  );
  const canAddPhoto = isCreator || isAttending;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="max-w-lg w-full max-h-[90vh] overflow-y-auto"
          style={{
            background: "oklch(var(--surface))",
            border: "1px solid oklch(var(--border))",
          }}
        >
          <img
            src={
              event.coverImageUrl ||
              `https://picsum.photos/seed/${event.id}/800/400`
            }
            alt={event.title}
            className="w-full h-48 object-cover rounded-lg"
          />
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="font-display text-2xl">
                {event.title}
              </DialogTitle>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border shrink-0 font-medium ${CATEGORY_COLORS[event.category] ?? "badge-orange"}`}
              >
                {event.category}
              </span>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-steel">
              <Calendar size={14} className="text-orange" />
              {formatDate(event.eventDate)}
            </div>
            <div className="flex items-center gap-2 text-sm text-steel">
              <MapPin size={14} className="text-orange" />
              {event.location}
            </div>
            <div className="flex items-center gap-2 text-sm text-steel">
              <Users size={14} className="text-orange" />
              {event.attendees.length} attending
              {Number(event.maxAttendees) > 0 &&
                ` / ${formatPrice(event.maxAttendees)} max`}
            </div>

            <p className="text-sm text-foreground leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Photos Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Camera size={14} className="text-orange" />
                Photos
                {allPhotos.length > 0 && (
                  <span className="text-xs font-normal text-steel ml-1">
                    ({allPhotos.length})
                  </span>
                )}
              </h3>
              {canAddPhoto && (
                <div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAddPhoto}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploadingPhoto || addEventPhoto.isPending}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: "oklch(var(--orange) / 0.15)",
                      color: "oklch(var(--orange-bright))",
                      border: "1px solid oklch(var(--orange) / 0.4)",
                    }}
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        {Math.round(photoUploadPct)}%
                      </>
                    ) : (
                      <>
                        <ImagePlus size={12} />
                        Add Photo
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {allPhotos.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {allPhotos.map((url, _i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setLightboxUrl(url)}
                    className="shrink-0 relative group rounded-lg overflow-hidden"
                    style={{ width: 96, height: 96 }}
                    aria-label="View full size"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "oklch(0 0 0 / 0.4)" }}
                    >
                      <ZoomIn size={18} color="white" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-6 rounded-xl text-center"
                style={{
                  background: "oklch(var(--surface-elevated))",
                  border: "1px dashed oklch(var(--border))",
                }}
              >
                <Camera size={24} className="text-steel mb-2" />
                <p className="text-xs text-steel">No photos yet</p>
                {canAddPhoto && (
                  <p className="text-[11px] text-steel/60 mt-0.5">
                    Tap "Add Photo" to share memories
                  </p>
                )}
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleRsvp}
            disabled={rsvp.isPending || unrsvp.isPending}
            className="w-full"
            style={
              isAttending
                ? {
                    background: "oklch(var(--surface-elevated))",
                    color: "oklch(var(--foreground))",
                  }
                : {
                    background: "oklch(var(--orange))",
                    color: "oklch(var(--carbon))",
                  }
            }
          >
            {rsvp.isPending || unrsvp.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isAttending ? (
              "Cancel RSVP"
            ) : (
              "RSVP — I'm Going! 🔥"
            )}
          </Button>

          {/* Delete event — creator only */}
          {isCreator && (
            <Button
              type="button"
              onClick={handleDeleteEvent}
              disabled={deleteEvent.isPending}
              variant="outline"
              className="w-full font-semibold transition-all"
              style={
                confirmDelete
                  ? {
                      background: "oklch(0.45 0.22 25)",
                      color: "white",
                      border: "1px solid oklch(0.55 0.25 25)",
                    }
                  : {
                      background: "transparent",
                      color: "oklch(0.65 0.18 25)",
                      border: "1px solid oklch(0.65 0.18 25 / 0.4)",
                    }
              }
            >
              {deleteEvent.isPending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Deleting...
                </>
              ) : confirmDelete ? (
                <>
                  <Trash2 size={14} className="mr-2" />
                  Tap again to confirm delete
                </>
              ) : (
                <>
                  <Trash2 size={14} className="mr-2" />
                  Delete Event
                </>
              )}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "oklch(0 0 0 / 0.9)" }}
        >
          <button
            type="button"
            aria-label="Close lightbox"
            className="absolute inset-0 w-full h-full cursor-default"
            onClick={() => setLightboxUrl(null)}
          />
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center z-10"
            style={{ background: "oklch(1 0 0 / 0.15)" }}
            onClick={() => setLightboxUrl(null)}
            aria-label="Close lightbox"
          >
            <X size={18} color="white" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain relative z-10"
          />
        </div>
      )}
    </>
  );
}

function CreateEventModal({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    eventDate: "",
    coverImageUrl: "",
    category: "Meetup",
    maxAttendees: "100",
  });
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadPct, setCoverUploadPct] = useState(0);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const createEvent = useCreateEvent();
  const uploadFile = useUploadFile();

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    file = await convertHeicToJpeg(file);
    setIsUploadingCover(true);
    setCoverUploadPct(0);
    try {
      const url = await uploadFile(file, (pct) => setCoverUploadPct(pct));
      setForm((f) => ({ ...f, coverImageUrl: url }));
      toast.success("Cover photo uploaded!");
    } catch {
      toast.error("Failed to upload cover photo");
    } finally {
      setIsUploadingCover(false);
      setCoverUploadPct(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateMs = new Date(form.eventDate).getTime();
    createEvent.mutate(
      {
        title: form.title,
        description: form.description,
        location: form.location,
        eventDate: BigInt(dateMs) * BigInt(1_000_000),
        coverImageUrl: form.coverImageUrl,
        category: form.category,
        maxAttendees: BigInt(form.maxAttendees || "100"),
      },
      {
        onSuccess: () => {
          toast.success("Event created!");
          onClose();
          setForm({
            title: "",
            description: "",
            location: "",
            eventDate: "",
            coverImageUrl: "",
            category: "Meetup",
            maxAttendees: "100",
          });
        },
        onError: () => toast.error("Failed to create event"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: "oklch(var(--surface))",
          border: "1px solid oklch(var(--border))",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Create Event
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-steel mb-1 block">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Cars & Coffee Downtown"
              required
              style={{
                background: "oklch(var(--surface-elevated))",
                borderColor: "oklch(var(--border))",
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-steel mb-1 block">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger
                  style={{
                    background: "oklch(var(--surface-elevated))",
                    borderColor: "oklch(var(--border))",
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(var(--surface))" }}>
                  {EVENT_CATEGORIES.slice(1).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-steel mb-1 block">
                Max Attendees
              </Label>
              <Input
                value={form.maxAttendees}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxAttendees: e.target.value }))
                }
                type="number"
                min="1"
                style={{
                  background: "oklch(var(--surface-elevated))",
                  borderColor: "oklch(var(--border))",
                }}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">
              Date & Time *
            </Label>
            <Input
              value={form.eventDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, eventDate: e.target.value }))
              }
              type="datetime-local"
              required
              style={{
                background: "oklch(var(--surface-elevated))",
                borderColor: "oklch(var(--border))",
              }}
            />
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Location *</Label>
            <Input
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="123 Main St, Los Angeles, CA"
              required
              style={{
                background: "oklch(var(--surface-elevated))",
                borderColor: "oklch(var(--border))",
              }}
            />
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Tell us about the event..."
              className="min-h-[80px] resize-none text-sm"
              style={{
                background: "oklch(var(--surface-elevated))",
                borderColor: "oklch(var(--border))",
              }}
            />
          </div>

          {/* Cover Image Upload */}
          <div>
            <Label className="text-xs text-steel mb-1 block">Cover Photo</Label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
            {form.coverImageUrl ? (
              <div
                className="relative rounded-xl overflow-hidden"
                style={{ height: 120 }}
              >
                <img
                  src={form.coverImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, coverImageUrl: "" }));
                    if (coverInputRef.current) coverInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0 0 0 / 0.6)" }}
                  aria-label="Remove cover photo"
                >
                  <X size={13} color="white" />
                </button>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute bottom-2 right-2 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: "oklch(0 0 0 / 0.6)", color: "white" }}
                >
                  <Camera size={11} />
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="w-full flex flex-col items-center justify-center py-6 gap-2 rounded-xl transition-opacity hover:opacity-80"
                style={{
                  background: "oklch(var(--surface-elevated))",
                  border: "2px dashed oklch(var(--border))",
                }}
              >
                {isUploadingCover ? (
                  <>
                    <Loader2
                      size={22}
                      className="animate-spin"
                      style={{ color: "oklch(var(--orange))" }}
                    />
                    <p className="text-xs text-steel">
                      {Math.round(coverUploadPct)}% uploading...
                    </p>
                  </>
                ) : (
                  <>
                    <ImagePlus
                      size={22}
                      style={{ color: "oklch(var(--orange))" }}
                    />
                    <p className="text-xs text-steel">
                      Tap to upload cover photo
                    </p>
                  </>
                )}
              </button>
            )}
          </div>

          <Button
            type="submit"
            disabled={
              createEvent.isPending ||
              isUploadingCover ||
              !form.title ||
              !form.location ||
              !form.eventDate
            }
            className="w-full"
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
            }}
          >
            {createEvent.isPending ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EventsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState<EventView | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<
    string | null
  >(null);
  const { data: events, isLoading } = useAllEvents();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const deleteEvent = useDeleteEvent();

  const displayEvents = events ?? [];
  const filtered =
    activeCategory === "All"
      ? displayEvents
      : displayEvents.filter((e) => e.category === activeCategory);

  const handleDeleteFromCard = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (confirmDeleteEventId === eventId) {
      deleteEvent.mutate(eventId, {
        onSuccess: () => {
          toast.success("Event deleted");
          setConfirmDeleteEventId(null);
        },
        onError: () => toast.error("Failed to delete event"),
      });
    } else {
      setConfirmDeleteEventId(eventId);
      setTimeout(
        () => setConfirmDeleteEventId((cur) => (cur === eventId ? null : cur)),
        3000,
      );
    }
  };

  return (
    <div className="min-h-screen">
      {/* Urban Banner */}
      <div className="relative w-full h-[180px] md:h-[240px] overflow-hidden">
        <img
          src="/assets/generated/urban-events-banner.dim_1600x400.jpg"
          alt="Events"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 urban-overlay" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <h1 className="tag-text text-3xl text-white">Events</h1>
            <p className="text-white/60 text-xs mt-0.5">
              Car meets &amp; street gatherings
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            style={{
              background: "oklch(var(--orange))",
              color: "oklch(var(--carbon))",
            }}
          >
            <Plus size={14} className="mr-1" />
            Create
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {EVENT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className="shrink-0 text-sm px-3 py-1.5 rounded-full font-medium transition-all"
            style={
              activeCategory === cat
                ? {
                    background: "oklch(var(--orange))",
                    color: "oklch(var(--carbon))",
                  }
                : {
                    background: "oklch(var(--surface))",
                    color: "oklch(var(--steel-light))",
                    border: "1px solid oklch(var(--border))",
                  }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          ["e1", "e2", "e3"].map((k) => (
            <div
              key={k}
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid oklch(var(--border))" }}
            >
              <Skeleton className="w-full h-48" />
              <div className="p-4 space-y-2">
                <Skeleton className="w-3/4 h-4" />
                <Skeleton className="w-1/2 h-3" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={32} className="mx-auto mb-3 text-steel" />
            <p className="text-steel text-sm">
              No {activeCategory.toLowerCase()} events yet
            </p>
          </div>
        ) : (
          filtered.map((event) => (
            <button
              key={event.id}
              type="button"
              className="w-full overflow-hidden rounded-xl cursor-pointer group text-left"
              style={{
                border: "1px solid oklch(var(--border))",
                background: "oklch(var(--surface))",
              }}
              onClick={() => setSelectedEvent(event)}
            >
              <div className="relative overflow-hidden">
                <img
                  src={
                    event.coverImageUrl ||
                    `https://picsum.photos/seed/${event.id}/800/400`
                  }
                  alt={event.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, oklch(0 0 0 / 0.6) 0%, transparent 50%)",
                  }}
                />
                <span
                  className={`absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[event.category] ?? "badge-orange"}`}
                >
                  {event.category}
                </span>
                {/* Delete button — creator only */}
                {myPrincipal && event.creator.toString() === myPrincipal && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteFromCard(e, event.id)}
                    disabled={deleteEvent.isPending}
                    className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-all"
                    style={
                      confirmDeleteEventId === event.id
                        ? { background: "oklch(0.5 0.22 25)", color: "white" }
                        : {
                            background: "oklch(0 0 0 / 0.55)",
                            color: "oklch(0.75 0.15 25)",
                            backdropFilter: "blur(4px)",
                          }
                    }
                    aria-label="Delete event"
                  >
                    <Trash2 size={12} />
                    {confirmDeleteEventId === event.id ? "Confirm?" : "Delete"}
                  </button>
                )}
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-white font-display text-xl font-bold leading-tight">
                    {event.title}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-3 text-xs text-steel">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-orange" />
                    {formatDate(event.eventDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-orange" />
                    <span className="truncate max-w-[180px]">
                      {event.location}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-orange" />
                    {event.attendees.length} attending
                  </span>
                </div>
                <div
                  className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: "oklch(var(--orange))",
                    color: "oklch(var(--carbon))",
                  }}
                >
                  RSVP Now
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-steel border-t border-border mt-4">
        © 2026. Built with ❤️ using{" "}
        <a
          href="https://caffeine.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange hover:underline"
        >
          caffeine.ai
        </a>
      </footer>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
