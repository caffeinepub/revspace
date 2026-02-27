import { useState } from "react";
import { Calendar, MapPin, Users, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllEvents, useRsvpEvent, useUnrsvpEvent, useCreateEvent } from "../hooks/useQueries";
import { formatDate, formatPrice } from "../utils/format";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { EventView } from "../backend.d";
import { toast } from "sonner";

const EVENT_CATEGORIES = ["All", "Cruise", "Show", "Track", "Meetup"];

const CATEGORY_COLORS: Record<string, string> = {
  Cruise: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Show: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Track: "bg-red-500/20 text-red-400 border-red-500/30",
  Meetup: "bg-green-500/20 text-green-400 border-green-500/30",
};

function EventDetailModal({ event, open, onClose }: { event: EventView; open: boolean; onClose: () => void }) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const isAttending = myPrincipal ? event.attendees.some((a) => a.toString() === myPrincipal) : false;
  const rsvp = useRsvpEvent();
  const unrsvp = useUnrsvpEvent();

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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto"
        style={{ background: "oklch(var(--surface))", border: "1px solid oklch(var(--border))" }}
      >
        <img
          src={event.coverImageUrl || `https://picsum.photos/seed/${event.id}/800/400`}
          alt={event.title}
          className="w-full h-48 object-cover rounded-lg"
        />
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="font-display text-2xl">{event.title}</DialogTitle>
            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 font-medium ${CATEGORY_COLORS[event.category] ?? "badge-orange"}`}>
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
            {Number(event.maxAttendees) > 0 && ` / ${formatPrice(event.maxAttendees)} max`}
          </div>

          <p className="text-sm text-foreground leading-relaxed">{event.description}</p>
        </div>

        <Button
          type="button"
          onClick={handleRsvp}
          disabled={rsvp.isPending || unrsvp.isPending}
          className="w-full"
          style={
            isAttending
              ? { background: "oklch(var(--surface-elevated))", color: "oklch(var(--foreground))" }
              : { background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }
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
      </DialogContent>
    </Dialog>
  );
}

function CreateEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    eventDate: "",
    coverImageUrl: "",
    category: "Meetup",
    maxAttendees: "100",
  });
  const createEvent = useCreateEvent();

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
          setForm({ title: "", description: "", location: "", eventDate: "", coverImageUrl: "", category: "Meetup", maxAttendees: "100" });
        },
        onError: () => toast.error("Failed to create event"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md w-full"
        style={{ background: "oklch(var(--surface))", border: "1px solid oklch(var(--border))" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-steel mb-1 block">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Cars & Coffee Downtown"
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
                  {EVENT_CATEGORIES.slice(1).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-steel mb-1 block">Max Attendees</Label>
              <Input
                value={form.maxAttendees}
                onChange={(e) => setForm((f) => ({ ...f, maxAttendees: e.target.value }))}
                type="number"
                min="1"
                style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Date & Time *</Label>
            <Input
              value={form.eventDate}
              onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
              type="datetime-local"
              required
              style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
            />
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Location *</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="123 Main St, Los Angeles, CA"
              required
              style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
            />
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Tell us about the event..."
              className="min-h-[80px] resize-none text-sm"
              style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
            />
          </div>

          <div>
            <Label className="text-xs text-steel mb-1 block">Cover Image URL</Label>
            <Input
              value={form.coverImageUrl}
              onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
              placeholder="https://..."
              type="url"
              style={{ background: "oklch(var(--surface-elevated))", borderColor: "oklch(var(--border))" }}
            />
          </div>

          <Button
            type="submit"
            disabled={createEvent.isPending || !form.title || !form.location || !form.eventDate}
            className="w-full"
            style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
          >
            {createEvent.isPending ? (
              <><Loader2 size={14} className="mr-2 animate-spin" />Creating...</>
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
  const { data: events, isLoading } = useAllEvents();

  const displayEvents = events ?? [];
  const filtered = activeCategory === "All"
    ? displayEvents
    : displayEvents.filter((e) => e.category === activeCategory);

  return (
    <div className="min-h-screen">
      {/* Urban Banner */}
      <div className="relative w-full h-[180px] md:h-[240px] overflow-hidden">
        <img src="/assets/generated/urban-events-banner.dim_1600x400.jpg" alt="Events" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 urban-overlay" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <h1 className="tag-text text-3xl text-white">Events</h1>
            <p className="text-white/60 text-xs mt-0.5">Car meets &amp; street gatherings</p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
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
                ? { background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }
                : { background: "oklch(var(--surface))", color: "oklch(var(--steel-light))", border: "1px solid oklch(var(--border))" }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          (["e1","e2","e3"]).map((k) => (
            <div key={k} className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(var(--border))" }}>
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
            <p className="text-steel text-sm">No {activeCategory.toLowerCase()} events yet</p>
          </div>
        ) : (
          filtered.map((event) => (
            <button
              key={event.id}
              type="button"
              className="w-full overflow-hidden rounded-xl cursor-pointer group text-left"
              style={{ border: "1px solid oklch(var(--border))", background: "oklch(var(--surface))" }}
              onClick={() => setSelectedEvent(event)}
            >
              <div className="relative overflow-hidden">
                <img
                  src={event.coverImageUrl || `https://picsum.photos/seed/${event.id}/800/400`}
                  alt={event.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, oklch(0 0 0 / 0.6) 0%, transparent 50%)" }}
                />
                <span
                  className={`absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[event.category] ?? "badge-orange"}`}
                >
                  {event.category}
                </span>
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-white font-display text-xl font-bold leading-tight">{event.title}</p>
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
                    <span className="truncate max-w-[180px]">{event.location}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-orange" />
                    {event.attendees.length} attending
                  </span>
                </div>
                <div
                  className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "oklch(var(--orange))", color: "oklch(var(--carbon))" }}
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
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
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
      <CreateEventModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
