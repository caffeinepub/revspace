import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Crown,
  FileBarChart2,
  GitBranch,
  LogIn,
  QrCode,
  Thermometer,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUserMeta } from "../hooks/useUserMeta";
import { isUserPro } from "../lib/pro";

// ── Types ──────────────────────────────────────────────────────────────────────
type FuelType = "E85" | "93oct" | "91oct" | "E30" | "Race";
type SessionStatus = "Active" | "Complete";
type VaultStatus = "Active" | "Revoked";
type Severity = "Warning" | "Critical";
type EventType =
  | "Knock Spike"
  | "AFR Swing"
  | "Boost Creep"
  | "Dangerous Temp"
  | "Wrong Fuel"
  | "Over-Rev";

interface Run {
  id: string;
  runNumber: number;
  peakHp: number;
  peakTq: number;
  afr: number;
  notes: string;
  timestamp: string;
}

interface Session {
  id: string;
  vehicleName: string;
  vin: string;
  fuelType: FuelType;
  boostTarget: number;
  weatherTemp: number;
  humidity: number;
  mods: string;
  createdAt: string;
  status: SessionStatus;
  runs: Run[];
}

interface VaultEntry {
  id: string;
  filename: string;
  version: number;
  versionLabel: string;
  changeNotes: string;
  savedAt: string;
  savedBy: string;
  status: VaultStatus;
}

interface SafetyFlag {
  id: string;
  eventType: EventType;
  severity: Severity;
  sessionId: string | null;
  notes: string;
  loggedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const updated =
        typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };
  return [value, set] as const;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG = "#08090e";
const CARD = "rgba(255,255,255,0.03)";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const CYAN = "#00d4ff";
const CYAN_DIM = "rgba(0,212,255,0.12)";
const CYAN_BORDER = "rgba(0,212,255,0.25)";

// ── Shared small components ───────────────────────────────────────────────────
function Chip({
  children,
  color = CYAN,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
      }}
    >
      {children}
    </span>
  );
}

function CardBox({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ background: CARD, border: `1px solid ${CARD_BORDER}` }}
    >
      {children}
    </div>
  );
}

// ── Fuel color ────────────────────────────────────────────────────────────────
function fuelColor(f: FuelType) {
  switch (f) {
    case "E85":
      return "#22c55e";
    case "E30":
      return "#84cc16";
    case "Race":
      return "#ef4444";
    case "93oct":
      return "#00d4ff";
    case "91oct":
      return "#a855f7";
    default:
      return "#94a3b8";
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Dyno Sessions
// ══════════════════════════════════════════════════════════════════════════════
function SessionsTab() {
  const [sessions, setSessions] = useLocalStorage<Session[]>(
    "tuner_sessions",
    [],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [runDialogId, setRunDialogId] = useState<string | null>(null);

  // New session form
  const [form, setForm] = useState({
    vehicleName: "",
    vin: "",
    fuelType: "93oct" as FuelType,
    boostTarget: "",
    weatherTemp: "",
    humidity: "",
    mods: "",
  });
  const [runForm, setRunForm] = useState({
    peakHp: "",
    peakTq: "",
    afr: "",
    notes: "",
  });

  const handleCreateSession = () => {
    if (!form.vehicleName.trim()) {
      toast.error("Vehicle name is required");
      return;
    }
    const session: Session = {
      id: uid(),
      vehicleName: form.vehicleName.trim(),
      vin: form.vin.trim(),
      fuelType: form.fuelType,
      boostTarget: Number.parseFloat(form.boostTarget) || 0,
      weatherTemp: Number.parseFloat(form.weatherTemp) || 72,
      humidity: Number.parseFloat(form.humidity) || 50,
      mods: form.mods.trim(),
      createdAt: new Date().toISOString(),
      status: "Active",
      runs: [],
    };
    setSessions((prev) => [session, ...prev]);
    setForm({
      vehicleName: "",
      vin: "",
      fuelType: "93oct",
      boostTarget: "",
      weatherTemp: "",
      humidity: "",
      mods: "",
    });
    setDialogOpen(false);
    toast.success("Session created");
  };

  const handleAddRun = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    if (!runForm.peakHp) {
      toast.error("Peak HP is required");
      return;
    }
    const run: Run = {
      id: uid(),
      runNumber: session.runs.length + 1,
      peakHp: Number.parseFloat(runForm.peakHp) || 0,
      peakTq: Number.parseFloat(runForm.peakTq) || 0,
      afr: Number.parseFloat(runForm.afr) || 0,
      notes: runForm.notes.trim(),
      timestamp: new Date().toISOString(),
    };
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, runs: [...s.runs, run] } : s,
      ),
    );
    setRunForm({ peakHp: "", peakTq: "", afr: "", notes: "" });
    setRunDialogId(null);
    toast.success(`Run #${run.runNumber} logged`);
  };

  const toggleComplete = (id: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "Active" ? "Complete" : "Active" }
          : s,
      ),
    );
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
    toast.success("Session deleted");
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-white">Dyno Sessions</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-ocid="dyno-os.sessions.new_session_button"
              size="sm"
              className="font-bold text-xs gap-1.5"
              style={{ background: CYAN, color: "#000" }}
            >
              + New Session
            </Button>
          </DialogTrigger>
          <DialogContent
            data-ocid="dyno-os.sessions.dialog"
            className="max-w-md"
            style={{
              background: "#10131c",
              border: `1px solid ${CARD_BORDER}`,
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white font-black">
                New Dyno Session
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-1">
              <div>
                <Label className="text-white/60 text-xs mb-1 block">
                  Vehicle Name *
                </Label>
                <Input
                  data-ocid="dyno-os.sessions.vehicle_name.input"
                  placeholder="e.g. 2002 Subaru WRX STi"
                  value={form.vehicleName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, vehicleName: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs mb-1 block">VIN</Label>
                <Input
                  data-ocid="dyno-os.sessions.vin.input"
                  placeholder="17-character VIN"
                  value={form.vin}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, vin: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/60 text-xs mb-1 block">
                    Fuel Type
                  </Label>
                  <Select
                    value={form.fuelType}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, fuelType: v as FuelType }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="dyno-os.sessions.fuel_type.select"
                      className="bg-white/5 border-white/10 text-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        background: "#10131c",
                        border: `1px solid ${CARD_BORDER}`,
                      }}
                    >
                      {(
                        ["E85", "E30", "93oct", "91oct", "Race"] as FuelType[]
                      ).map((f) => (
                        <SelectItem
                          key={f}
                          value={f}
                          className="text-white hover:bg-white/10"
                        >
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/60 text-xs mb-1 block">
                    Boost Target (psi)
                  </Label>
                  <Input
                    placeholder="e.g. 18"
                    value={form.boostTarget}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, boostTarget: e.target.value }))
                    }
                    type="number"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/60 text-xs mb-1 block">
                    Temp (°F)
                  </Label>
                  <Input
                    placeholder="72"
                    value={form.weatherTemp}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, weatherTemp: e.target.value }))
                    }
                    type="number"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <Label className="text-white/60 text-xs mb-1 block">
                    Humidity (%)
                  </Label>
                  <Input
                    placeholder="50"
                    value={form.humidity}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, humidity: e.target.value }))
                    }
                    type="number"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/60 text-xs mb-1 block">Mods</Label>
                <Textarea
                  placeholder="FMIC, turbo upgrade, injectors, flex sensor..."
                  value={form.mods}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, mods: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[64px]"
                />
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button
                data-ocid="dyno-os.sessions.submit_button"
                onClick={handleCreateSession}
                style={{ background: CYAN, color: "#000" }}
                className="font-black w-full"
              >
                Create Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <CardBox
          data-ocid="dyno-os.sessions.empty_state"
          className="p-8 text-center"
        >
          <ClipboardList
            size={28}
            className="mx-auto mb-3"
            style={{ color: CYAN }}
          />
          <p className="text-white/50 text-sm">
            No sessions yet — start your first dyno session
          </p>
        </CardBox>
      ) : (
        <div data-ocid="dyno-os.sessions.list" className="space-y-2">
          {sessions.map((session, idx) => (
            <motion.div
              key={session.id}
              data-ocid={`dyno-os.sessions.item.${idx + 1}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <CardBox>
                {/* Session card header */}
                <button
                  type="button"
                  className="w-full text-left p-4 flex items-center gap-3"
                  onClick={() =>
                    setExpandedId(expandedId === session.id ? null : session.id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-white truncate">
                        {session.vehicleName}
                      </span>
                      <Chip color={fuelColor(session.fuelType)}>
                        {session.fuelType}
                      </Chip>
                      <Chip
                        color={session.status === "Active" ? CYAN : "#22c55e"}
                      >
                        {session.status}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span
                        className="text-[11px]"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {session.runs.length} run
                        {session.runs.length !== 1 ? "s" : ""}
                      </span>
                      {session.boostTarget > 0 && (
                        <span
                          className="text-[11px]"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {session.boostTarget} psi
                        </span>
                      )}
                    </div>
                  </div>
                  {expandedId === session.id ? (
                    <ChevronUp size={16} style={{ color: CYAN }} />
                  ) : (
                    <ChevronDown
                      size={16}
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    />
                  )}
                </button>

                {/* Expanded run log */}
                <AnimatePresence>
                  {expandedId === session.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-4 pb-4 pt-0 border-t"
                        style={{ borderColor: CARD_BORDER }}
                      >
                        {/* Vehicle details */}
                        {(session.vin || session.mods) && (
                          <div className="mt-3 mb-3 space-y-1">
                            {session.vin && (
                              <p
                                className="text-[11px]"
                                style={{ color: "rgba(255,255,255,0.4)" }}
                              >
                                VIN: {session.vin}
                              </p>
                            )}
                            {session.mods && (
                              <p
                                className="text-[11px]"
                                style={{ color: "rgba(255,255,255,0.4)" }}
                              >
                                Mods: {session.mods}
                              </p>
                            )}
                            <p
                              className="text-[11px]"
                              style={{ color: "rgba(255,255,255,0.4)" }}
                            >
                              {session.weatherTemp}°F · {session.humidity}% RH
                            </p>
                          </div>
                        )}

                        {/* Runs table */}
                        {session.runs.length > 0 ? (
                          <div className="overflow-x-auto -mx-1">
                            <table className="w-full text-xs min-w-[400px]">
                              <thead>
                                <tr style={{ color: "rgba(255,255,255,0.35)" }}>
                                  <th className="text-left py-1.5 px-1 font-semibold">
                                    Run
                                  </th>
                                  <th className="text-right py-1.5 px-1 font-semibold">
                                    HP
                                  </th>
                                  <th className="text-right py-1.5 px-1 font-semibold">
                                    TQ
                                  </th>
                                  <th className="text-right py-1.5 px-1 font-semibold">
                                    AFR
                                  </th>
                                  <th className="text-left py-1.5 px-1 font-semibold">
                                    Notes
                                  </th>
                                  <th className="text-right py-1.5 px-1 font-semibold">
                                    Time
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {session.runs.map((run) => (
                                  <tr
                                    key={run.id}
                                    className="border-t"
                                    style={{ borderColor: CARD_BORDER }}
                                  >
                                    <td
                                      className="py-2 px-1 font-black"
                                      style={{ color: CYAN }}
                                    >
                                      #{run.runNumber}
                                    </td>
                                    <td className="py-2 px-1 text-right text-white font-semibold">
                                      {run.peakHp}
                                    </td>
                                    <td className="py-2 px-1 text-right text-white font-semibold">
                                      {run.peakTq}
                                    </td>
                                    <td className="py-2 px-1 text-right text-white font-semibold">
                                      {run.afr}
                                    </td>
                                    <td
                                      className="py-2 px-1 max-w-[120px] truncate"
                                      style={{ color: "rgba(255,255,255,0.5)" }}
                                    >
                                      {run.notes || "—"}
                                    </td>
                                    <td
                                      className="py-2 px-1 text-right"
                                      style={{
                                        color: "rgba(255,255,255,0.35)",
                                      }}
                                    >
                                      {new Date(
                                        run.timestamp,
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p
                            className="text-[11px] py-3 text-center"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            No runs logged yet
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {/* Add Run Dialog */}
                          <Dialog
                            open={runDialogId === session.id}
                            onOpenChange={(o) =>
                              setRunDialogId(o ? session.id : null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-white/10 text-white/70 hover:text-white hover:border-white/20 bg-transparent"
                              >
                                + Add Run
                              </Button>
                            </DialogTrigger>
                            <DialogContent
                              className="max-w-xs"
                              style={{
                                background: "#10131c",
                                border: `1px solid ${CARD_BORDER}`,
                              }}
                            >
                              <DialogHeader>
                                <DialogTitle className="text-white font-black">
                                  Log Run #{session.runs.length + 1}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 mt-1">
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-white/60 text-xs mb-1 block">
                                      Peak HP
                                    </Label>
                                    <Input
                                      placeholder="320"
                                      value={runForm.peakHp}
                                      onChange={(e) =>
                                        setRunForm((p) => ({
                                          ...p,
                                          peakHp: e.target.value,
                                        }))
                                      }
                                      type="number"
                                      className="bg-white/5 border-white/10 text-white"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-white/60 text-xs mb-1 block">
                                      Peak TQ
                                    </Label>
                                    <Input
                                      placeholder="290"
                                      value={runForm.peakTq}
                                      onChange={(e) =>
                                        setRunForm((p) => ({
                                          ...p,
                                          peakTq: e.target.value,
                                        }))
                                      }
                                      type="number"
                                      className="bg-white/5 border-white/10 text-white"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-white/60 text-xs mb-1 block">
                                      AFR
                                    </Label>
                                    <Input
                                      placeholder="11.8"
                                      value={runForm.afr}
                                      onChange={(e) =>
                                        setRunForm((p) => ({
                                          ...p,
                                          afr: e.target.value,
                                        }))
                                      }
                                      type="number"
                                      step="0.1"
                                      className="bg-white/5 border-white/10 text-white"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-white/60 text-xs mb-1 block">
                                    Notes
                                  </Label>
                                  <Textarea
                                    placeholder="Boost holding steady, slight knock at 6500 rpm..."
                                    value={runForm.notes}
                                    onChange={(e) =>
                                      setRunForm((p) => ({
                                        ...p,
                                        notes: e.target.value,
                                      }))
                                    }
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[60px]"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={() => handleAddRun(session.id)}
                                  style={{ background: CYAN, color: "#000" }}
                                  className="font-black w-full"
                                >
                                  Log Run
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleComplete(session.id)}
                            className="text-xs h-7 bg-transparent"
                            style={{
                              borderColor:
                                session.status === "Active"
                                  ? "rgba(34,197,94,0.4)"
                                  : "rgba(0,212,255,0.4)",
                              color:
                                session.status === "Active" ? "#22c55e" : CYAN,
                            }}
                          >
                            {session.status === "Active"
                              ? "Mark Complete"
                              : "Reopen"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteSession(session.id)}
                            className="text-xs h-7 bg-transparent border-red-500/30 text-red-400 hover:border-red-500/60 hover:text-red-300 ml-auto"
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardBox>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Run Comparison
// ══════════════════════════════════════════════════════════════════════════════
function ComparisonTab() {
  const [sessions] = useLocalStorage<Session[]>("tuner_sessions", []);
  const [sessionAId, setSessionAId] = useState<string>("");
  const [sessionBId, setSessionBId] = useState<string>("");
  const [runAId, setRunAId] = useState<string>("");
  const [runBId, setRunBId] = useState<string>("");

  const sessionA = sessions.find((s) => s.id === sessionAId);
  const sessionB = sessions.find((s) => s.id === sessionBId);
  const runA = sessionA?.runs.find((r) => r.id === runAId);
  const runB = sessionB?.runs.find((r) => r.id === runBId);

  const hasSessions = sessions.some((s) => s.runs.length >= 1);

  if (!hasSessions) {
    return (
      <CardBox className="p-8 text-center">
        <BarChart3 size={28} className="mx-auto mb-3" style={{ color: CYAN }} />
        <p className="text-white/50 text-sm">
          Add at least 2 runs to a session to compare
        </p>
      </CardBox>
    );
  }

  const delta = (a: number, b: number) => b - a;
  const pct = (a: number, b: number) => (a === 0 ? 0 : ((b - a) / a) * 100);

  const DeltaCell = ({
    a,
    b,
    invert = false,
  }: {
    a: number;
    b: number;
    invert?: boolean;
  }) => {
    const d = delta(a, b);
    const p = pct(a, b);
    const positive = invert ? d < 0 : d > 0;
    const color =
      d === 0 ? "rgba(255,255,255,0.4)" : positive ? "#22c55e" : "#ef4444";
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-black text-sm" style={{ color }}>
          {d > 0 ? "+" : ""}
          {d.toFixed(1)}
        </span>
        <span className="text-[10px] font-semibold" style={{ color }}>
          {p > 0 ? "+" : ""}
          {p.toFixed(1)}%
        </span>
      </div>
    );
  };

  const hpDelta = runA && runB ? delta(runA.peakHp, runB.peakHp) : null;
  const tqDelta = runA && runB ? delta(runA.peakTq, runB.peakTq) : null;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-black text-white">Run Comparison Engine</h2>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-3">
        {/* Session A */}
        <div className="space-y-2">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider w-fit"
            style={{ background: "rgba(0,212,255,0.1)", color: CYAN }}
          >
            Run A
          </div>
          <Select
            value={sessionAId}
            onValueChange={(v) => {
              setSessionAId(v);
              setRunAId("");
            }}
          >
            <SelectTrigger
              data-ocid="dyno-os.comparison.session_a.select"
              className="bg-white/5 border-white/10 text-white text-xs"
            >
              <SelectValue placeholder="Select Session A" />
            </SelectTrigger>
            <SelectContent
              style={{
                background: "#10131c",
                border: `1px solid ${CARD_BORDER}`,
              }}
            >
              {sessions.map((s) => (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  className="text-white text-xs hover:bg-white/10"
                >
                  {s.vehicleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sessionA && (
            <Select value={runAId} onValueChange={setRunAId}>
              <SelectTrigger
                data-ocid="dyno-os.comparison.run_a.select"
                className="bg-white/5 border-white/10 text-white text-xs"
              >
                <SelectValue placeholder="Select Run A" />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "#10131c",
                  border: `1px solid ${CARD_BORDER}`,
                }}
              >
                {sessionA.runs.map((r) => (
                  <SelectItem
                    key={r.id}
                    value={r.id}
                    className="text-white text-xs hover:bg-white/10"
                  >
                    Run #{r.runNumber} — {r.peakHp} HP
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Session B */}
        <div className="space-y-2">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider w-fit"
            style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}
          >
            Run B
          </div>
          <Select
            value={sessionBId}
            onValueChange={(v) => {
              setSessionBId(v);
              setRunBId("");
            }}
          >
            <SelectTrigger
              data-ocid="dyno-os.comparison.session_b.select"
              className="bg-white/5 border-white/10 text-white text-xs"
            >
              <SelectValue placeholder="Select Session B" />
            </SelectTrigger>
            <SelectContent
              style={{
                background: "#10131c",
                border: `1px solid ${CARD_BORDER}`,
              }}
            >
              {sessions.map((s) => (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  className="text-white text-xs hover:bg-white/10"
                >
                  {s.vehicleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sessionB && (
            <Select value={runBId} onValueChange={setRunBId}>
              <SelectTrigger
                data-ocid="dyno-os.comparison.run_b.select"
                className="bg-white/5 border-white/10 text-white text-xs"
              >
                <SelectValue placeholder="Select Run B" />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "#10131c",
                  border: `1px solid ${CARD_BORDER}`,
                }}
              >
                {sessionB.runs.map((r) => (
                  <SelectItem
                    key={r.id}
                    value={r.id}
                    className="text-white text-xs hover:bg-white/10"
                  >
                    Run #{r.runNumber} — {r.peakHp} HP
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <AnimatePresence>
        {runA && runB && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <CardBox className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[340px]">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                      <th
                        className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        Metric
                      </th>
                      <th
                        className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider"
                        style={{ color: CYAN }}
                      >
                        Run A
                      </th>
                      <th
                        className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider"
                        style={{ color: "#a855f7" }}
                      >
                        Run B
                      </th>
                      <th
                        className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        Delta / %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Peak HP",
                        a: runA.peakHp,
                        b: runB.peakHp,
                        unit: "hp",
                      },
                      {
                        label: "Peak TQ",
                        a: runA.peakTq,
                        b: runB.peakTq,
                        unit: "lb-ft",
                      },
                      {
                        label: "AFR",
                        a: runA.afr,
                        b: runB.afr,
                        unit: "",
                        invert: true,
                      },
                    ].map((row) => (
                      <tr
                        key={row.label}
                        className="border-t"
                        style={{ borderColor: CARD_BORDER }}
                      >
                        <td className="px-4 py-3 text-white/70 font-semibold text-xs">
                          {row.label}
                          {row.unit && (
                            <span className="ml-1 text-white/30">
                              ({row.unit})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-white">
                          {row.a}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-white">
                          {row.b}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DeltaCell a={row.a} b={row.b} invert={row.invert} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBox>

            {/* Summary card */}
            <CardBox className="p-4">
              <p
                className="text-[10px] font-black uppercase tracking-widest mb-1"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Net Result
              </p>
              <p
                className="text-base font-black"
                style={{
                  color:
                    hpDelta !== null && hpDelta > 0
                      ? "#22c55e"
                      : hpDelta !== null && hpDelta < 0
                        ? "#ef4444"
                        : "rgba(255,255,255,0.6)",
                }}
              >
                {hpDelta !== null && tqDelta !== null ? (
                  hpDelta > 0 ? (
                    <>
                      +{hpDelta.toFixed(0)} HP / +{tqDelta.toFixed(0)} TQ —{" "}
                      <span className="text-green-400">Tune Improved</span>
                    </>
                  ) : hpDelta < 0 ? (
                    <>
                      {hpDelta.toFixed(0)} HP / {tqDelta.toFixed(0)} TQ —{" "}
                      <span className="text-red-400">Tune Regressed</span>
                    </>
                  ) : (
                    <>No change in peak HP</>
                  )
                ) : null}
              </p>
            </CardBox>
          </motion.div>
        )}
      </AnimatePresence>

      {(!runA || !runB) && (
        <p className="text-center text-white/30 text-xs pt-4">
          Select a run from each session to compare
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — TuneVault
// ══════════════════════════════════════════════════════════════════════════════
function VaultTab() {
  const [vault, setVault] = useLocalStorage<VaultEntry[]>("tuner_vault", []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ filename: "", changeNotes: "" });

  const handleSave = () => {
    if (!form.filename.trim()) {
      toast.error("Filename is required");
      return;
    }
    const existing = vault.filter(
      (v) => v.filename.toLowerCase() === form.filename.trim().toLowerCase(),
    );
    const version = existing.length + 1;
    const entry: VaultEntry = {
      id: uid(),
      filename: form.filename.trim(),
      version,
      versionLabel: `v${version}`,
      changeNotes: form.changeNotes.trim(),
      savedAt: new Date().toISOString(),
      savedBy: "You",
      status: "Active",
    };
    setVault((prev) => [entry, ...prev]);
    setForm({ filename: "", changeNotes: "" });
    setDialogOpen(false);
    toast.success(`${entry.filename} ${entry.versionLabel} saved`);
  };

  const toggleRevoke = (id: string) => {
    setVault((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, status: v.status === "Active" ? "Revoked" : "Active" }
          : v,
      ),
    );
  };

  // Group by filename
  const grouped = vault.reduce(
    (acc, entry) => {
      const key = entry.filename;
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    },
    {} as Record<string, VaultEntry[]>,
  );

  let flatIdx = 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-white">TuneVault</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-ocid="dyno-os.vault.add_version.open_modal_button"
              size="sm"
              className="font-bold text-xs gap-1.5"
              style={{ background: CYAN, color: "#000" }}
            >
              + Add Version
            </Button>
          </DialogTrigger>
          <DialogContent
            data-ocid="dyno-os.vault.add_version.dialog"
            className="max-w-sm"
            style={{
              background: "#10131c",
              border: `1px solid ${CARD_BORDER}`,
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white font-black">
                Save Tune Version
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-1">
              <div>
                <Label className="text-white/60 text-xs mb-1 block">
                  Filename *
                </Label>
                <Input
                  data-ocid="dyno-os.vault.filename.input"
                  placeholder="e.g. WRX_STi_E85_Stage2.map"
                  value={form.filename}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, filename: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs mb-1 block">
                  Change Notes
                </Label>
                <Textarea
                  data-ocid="dyno-os.vault.notes.textarea"
                  placeholder="Bumped boost to 22psi, enriched AFR 0.3 lambda at peak..."
                  value={form.changeNotes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, changeNotes: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                data-ocid="dyno-os.vault.submit_button"
                onClick={handleSave}
                style={{ background: CYAN, color: "#000" }}
                className="font-black w-full"
              >
                Save Version
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {vault.length === 0 ? (
        <CardBox
          data-ocid="dyno-os.vault.empty_state"
          className="p-8 text-center"
        >
          <GitBranch
            size={28}
            className="mx-auto mb-3"
            style={{ color: CYAN }}
          />
          <p className="text-white/50 text-sm">No tune files saved yet</p>
        </CardBox>
      ) : (
        <div data-ocid="dyno-os.vault.list" className="space-y-4">
          {Object.entries(grouped).map(([filename, entries]) => (
            <div key={filename}>
              <div
                className="flex items-center gap-2 mb-2 px-1"
                style={{
                  borderBottom: `1px solid ${CARD_BORDER}`,
                  paddingBottom: "6px",
                }}
              >
                <GitBranch size={12} style={{ color: CYAN }} />
                <span
                  className="text-[11px] font-black uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {filename}
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  {entries.length} version{entries.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-1.5">
                {entries.map((entry) => {
                  const idx = ++flatIdx;
                  return (
                    <motion.div
                      key={entry.id}
                      data-ocid={`dyno-os.vault.item.${idx}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <CardBox className="p-3 flex items-start gap-3">
                        <div
                          className="shrink-0 px-2 py-0.5 rounded-md text-xs font-black"
                          style={{
                            background:
                              entry.status === "Active"
                                ? CYAN_DIM
                                : "rgba(239,68,68,0.1)",
                            color: entry.status === "Active" ? CYAN : "#ef4444",
                            border: `1px solid ${entry.status === "Active" ? CYAN_BORDER : "rgba(239,68,68,0.3)"}`,
                          }}
                        >
                          {entry.versionLabel}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-white">
                              {new Date(entry.savedAt).toLocaleDateString()}
                            </span>
                            <span
                              className="text-[10px]"
                              style={{ color: "rgba(255,255,255,0.3)" }}
                            >
                              by {entry.savedBy}
                            </span>
                            {entry.status === "Revoked" && (
                              <Chip color="#ef4444">Revoked</Chip>
                            )}
                          </div>
                          {entry.changeNotes && (
                            <p
                              className="text-xs mt-1 leading-relaxed"
                              style={{ color: "rgba(255,255,255,0.5)" }}
                            >
                              {entry.changeNotes}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRevoke(entry.id)}
                          className="shrink-0 text-[10px] h-6 px-2 bg-transparent"
                          style={{
                            borderColor:
                              entry.status === "Active"
                                ? "rgba(239,68,68,0.3)"
                                : CYAN_BORDER,
                            color: entry.status === "Active" ? "#ef4444" : CYAN,
                          }}
                        >
                          {entry.status === "Active" ? "Revoke" : "Restore"}
                        </Button>
                      </CardBox>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Power Reports
// ══════════════════════════════════════════════════════════════════════════════
function ReportsTab() {
  const [sessions] = useLocalStorage<Session[]>("tuner_sessions", []);
  const [customerName, setCustomerName] = useState("");
  const [shopName, setShopName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [beforeRunId, setBeforeRunId] = useState("");
  const [afterRunId, setAfterRunId] = useState("");
  const [reportVisible, setReportVisible] = useState(false);

  const session = sessions.find((s) => s.id === sessionId);
  const beforeRun = session?.runs.find((r) => r.id === beforeRunId);
  const afterRun = session?.runs.find((r) => r.id === afterRunId);

  const hpGain =
    beforeRun && afterRun ? afterRun.peakHp - beforeRun.peakHp : null;
  const tqGain =
    beforeRun && afterRun ? afterRun.peakTq - beforeRun.peakTq : null;

  const handleGenerate = () => {
    if (!session || !beforeRun || !afterRun) {
      toast.error("Select a session and both runs first");
      return;
    }
    setReportVisible(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(`${window.location.href}#report`)
      .then(() => toast.success("Link copied!"))
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-black text-white">
        Customer Power Reports
      </h2>

      {/* Form */}
      <CardBox className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-white/60 text-xs mb-1 block">
              Customer Name
            </Label>
            <Input
              data-ocid="dyno-os.reports.customer_name.input"
              placeholder="Jake M."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div>
            <Label className="text-white/60 text-xs mb-1 block">
              Shop Name
            </Label>
            <Input
              data-ocid="dyno-os.reports.shop_name.input"
              placeholder="Altered Imports"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </div>
        <div>
          <Label className="text-white/60 text-xs mb-1 block">Session</Label>
          <Select
            value={sessionId}
            onValueChange={(v) => {
              setSessionId(v);
              setBeforeRunId("");
              setAfterRunId("");
              setReportVisible(false);
            }}
          >
            <SelectTrigger
              data-ocid="dyno-os.reports.session.select"
              className="bg-white/5 border-white/10 text-white"
            >
              <SelectValue placeholder="Select Session" />
            </SelectTrigger>
            <SelectContent
              style={{
                background: "#10131c",
                border: `1px solid ${CARD_BORDER}`,
              }}
            >
              {sessions.map((s) => (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  className="text-white hover:bg-white/10"
                >
                  {s.vehicleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {session && session.runs.length >= 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/60 text-xs mb-1 block">
                Before Run
              </Label>
              <Select value={beforeRunId} onValueChange={setBeforeRunId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent
                  style={{
                    background: "#10131c",
                    border: `1px solid ${CARD_BORDER}`,
                  }}
                >
                  {session.runs.map((r) => (
                    <SelectItem
                      key={r.id}
                      value={r.id}
                      className="text-white hover:bg-white/10"
                    >
                      Run #{r.runNumber} — {r.peakHp} HP
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/60 text-xs mb-1 block">
                After Run
              </Label>
              <Select value={afterRunId} onValueChange={setAfterRunId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent
                  style={{
                    background: "#10131c",
                    border: `1px solid ${CARD_BORDER}`,
                  }}
                >
                  {session.runs.map((r) => (
                    <SelectItem
                      key={r.id}
                      value={r.id}
                      className="text-white hover:bg-white/10"
                    >
                      Run #{r.runNumber} — {r.peakHp} HP
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <Button
          data-ocid="dyno-os.reports.generate.primary_button"
          onClick={handleGenerate}
          style={{ background: CYAN, color: "#000" }}
          className="font-black w-full"
        >
          Generate Report
        </Button>
      </CardBox>

      {/* Report preview */}
      <AnimatePresence>
        {reportVisible && session && beforeRun && afterRun && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            id="report"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#0d1117",
                border: `2px solid ${CYAN_BORDER}`,
                boxShadow: "0 0 32px rgba(0,212,255,0.08)",
              }}
            >
              {/* Report header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,80,120,0.1))",
                  borderBottom: `1px solid ${CYAN_BORDER}`,
                }}
              >
                <div>
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: CYAN }}
                  >
                    {shopName || "Tuning Shop"}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    {new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest"
                  style={{
                    background: CYAN_DIM,
                    color: CYAN,
                    border: `1px solid ${CYAN_BORDER}`,
                  }}
                >
                  Dyno Report
                </div>
              </div>

              {/* Customer & vehicle */}
              <div
                className="px-5 py-4"
                style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {[
                    ["Customer", customerName || "—"],
                    ["Vehicle", session.vehicleName],
                    ["VIN", session.vin || "—"],
                    ["Fuel", session.fuelType],
                    ["Boost Target", `${session.boostTarget} psi`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p
                        className="text-[9px] font-black uppercase tracking-wider"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {label}
                      </p>
                      <p className="text-xs font-semibold text-white">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                {session.mods && (
                  <div className="mt-2">
                    <p
                      className="text-[9px] font-black uppercase tracking-wider"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      Mods
                    </p>
                    <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                      {session.mods}
                    </p>
                  </div>
                )}
              </div>

              {/* Power results */}
              <div
                className="px-5 py-4"
                style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-widest mb-3"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Power Results
                </p>
                <div className="space-y-2">
                  {[
                    {
                      label: "Before",
                      run: beforeRun,
                      color: "rgba(255,255,255,0.5)",
                    },
                    { label: "After", run: afterRun, color: "#ffffff" },
                  ].map(({ label, run, color }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {label}
                      </span>
                      <span className="text-sm font-black" style={{ color }}>
                        {run.peakHp} HP / {run.peakTq} TQ
                      </span>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between pt-2 mt-2"
                    style={{ borderTop: `1px solid ${CARD_BORDER}` }}
                  >
                    <span
                      className="text-xs font-black uppercase tracking-wider"
                      style={{ color: CYAN }}
                    >
                      Gain
                    </span>
                    <span
                      className="text-base font-black"
                      style={{
                        color:
                          hpGain !== null && hpGain > 0
                            ? "#22c55e"
                            : hpGain !== null && hpGain < 0
                              ? "#ef4444"
                              : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {hpGain !== null && hpGain > 0 ? "+" : ""}
                      {hpGain ?? 0} HP /{" "}
                      {tqGain !== null && tqGain > 0 ? "+" : ""}
                      {tqGain ?? 0} TQ
                    </span>
                  </div>
                </div>
              </div>

              {/* QR placeholder */}
              <div
                className="px-5 py-4 flex items-center gap-4"
                style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
              >
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${CARD_BORDER}`,
                  }}
                >
                  <QrCode
                    size={24}
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                </div>
                <div>
                  <p className="text-xs font-black text-white/60">QR Code</p>
                  <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">
                    Scan to view this vehicle's full dyno profile online
                  </p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="px-5 py-4">
                <p
                  className="text-[9px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  DISCLAIMER: Results obtained under controlled dyno conditions.
                  Shop not responsible for modifications made after this tune.
                  Warranty void if fuel type changed or boost target exceeded
                  without shop authorization. All figures are wheel horsepower.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <Button
                data-ocid="dyno-os.reports.share.secondary_button"
                onClick={handleCopyLink}
                variant="outline"
                className="flex-1 text-xs border-white/10 text-white/60 hover:text-white bg-transparent gap-1.5"
              >
                <QrCode size={13} />
                Copy Share Link
              </Button>
              <Button
                variant="outline"
                onClick={() => setReportVisible(false)}
                className="text-xs border-white/10 text-white/40 hover:text-white bg-transparent"
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sessions.length === 0 && (
        <p className="text-center text-white/30 text-xs pt-4">
          Create a session with at least 2 runs to generate a report
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — Safety Flags
// ══════════════════════════════════════════════════════════════════════════════
const CUSTOMER_EXPLANATIONS: Record<EventType, string> = {
  "Knock Spike":
    "Abnormal combustion detected. Continued operation risks engine damage. Do not drive aggressively until addressed.",
  "AFR Swing":
    "Air/fuel ratio fluctuation detected. May indicate a fueling or sensor issue requiring inspection.",
  "Boost Creep":
    "Boost pressure exceeded target. Wastegate or boost control system requires inspection before continued use.",
  "Dangerous Temp":
    "Critical temperature threshold reached. Coolant, oil, or intake air temperature exceeded safe limits. Allow cool-down before operating.",
  "Wrong Fuel":
    "Incorrect fuel type detected. Tune calibration is now invalid. Do not drive until refueled and retested by your tuner.",
  "Over-Rev":
    "Engine exceeded safe RPM limit. Valve, piston, or rod inspection is recommended before further high-rpm operation.",
};

function SafetyTab() {
  const [sessions] = useLocalStorage<Session[]>("tuner_sessions", []);
  const [flags, setFlags] = useLocalStorage<SafetyFlag[]>("tuner_safety", []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [explanationsOpen, setExplanationsOpen] = useState(false);
  const [form, setForm] = useState({
    eventType: "" as EventType | "",
    severity: "Warning" as Severity,
    sessionId: "",
    notes: "",
  });

  const handleSave = () => {
    if (!form.eventType) {
      toast.error("Select an event type");
      return;
    }
    const flag: SafetyFlag = {
      id: uid(),
      eventType: form.eventType as EventType,
      severity: form.severity,
      sessionId: form.sessionId || null,
      notes: form.notes.trim(),
      loggedAt: new Date().toISOString(),
    };
    setFlags((prev) => [flag, ...prev]);
    setForm({ eventType: "", severity: "Warning", sessionId: "", notes: "" });
    setDialogOpen(false);
    toast.success(`${flag.severity}: ${flag.eventType} logged`);
  };

  const deleteFlag = (id: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== id));
  };

  const severityColor = (s: Severity) =>
    s === "Critical" ? "#ef4444" : "#f59e0b";
  const severityBg = (s: Severity) =>
    s === "Critical" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-white">Safety Flags</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-ocid="dyno-os.safety.log_flag.open_modal_button"
              size="sm"
              className="font-bold text-xs gap-1.5"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              + Log Flag
            </Button>
          </DialogTrigger>
          <DialogContent
            data-ocid="dyno-os.safety.log_flag.dialog"
            className="max-w-sm"
            style={{
              background: "#10131c",
              border: `1px solid ${CARD_BORDER}`,
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white font-black">
                Log Safety Flag
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-1">
              <div>
                <Label className="text-white/60 text-xs mb-1 block">
                  Event Type *
                </Label>
                <Select
                  value={form.eventType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, eventType: v as EventType }))
                  }
                >
                  <SelectTrigger
                    data-ocid="dyno-os.safety.event_type.select"
                    className="bg-white/5 border-white/10 text-white"
                  >
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "#10131c",
                      border: `1px solid ${CARD_BORDER}`,
                    }}
                  >
                    {(
                      [
                        "Knock Spike",
                        "AFR Swing",
                        "Boost Creep",
                        "Dangerous Temp",
                        "Wrong Fuel",
                        "Over-Rev",
                      ] as EventType[]
                    ).map((t) => (
                      <SelectItem
                        key={t}
                        value={t}
                        className="text-white hover:bg-white/10"
                      >
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/60 text-xs mb-2 block">
                  Severity
                </Label>
                <div
                  data-ocid="dyno-os.safety.severity.radio"
                  className="flex gap-3"
                >
                  {(["Warning", "Critical"] as Severity[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, severity: s }))}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background:
                          form.severity === s
                            ? severityBg(s)
                            : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.severity === s ? `${severityColor(s)}60` : CARD_BORDER}`,
                        color:
                          form.severity === s
                            ? severityColor(s)
                            : "rgba(255,255,255,0.4)",
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor:
                            form.severity === s
                              ? severityColor(s)
                              : "rgba(255,255,255,0.2)",
                        }}
                      >
                        {form.severity === s && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: severityColor(s) }}
                          />
                        )}
                      </span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/60 text-xs mb-1 block">
                  Session (optional)
                </Label>
                <Select
                  value={form.sessionId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, sessionId: v }))
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Link to session" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "#10131c",
                      border: `1px solid ${CARD_BORDER}`,
                    }}
                  >
                    <SelectItem
                      value=""
                      className="text-white/40 hover:bg-white/10"
                    >
                      None
                    </SelectItem>
                    {sessions.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className="text-white hover:bg-white/10"
                      >
                        {s.vehicleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/60 text-xs mb-1 block">
                  Notes
                </Label>
                <Textarea
                  placeholder="Detected knock at 6,200 rpm on 3rd pull, corrected with ignition trim..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[72px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                data-ocid="dyno-os.safety.submit_button"
                onClick={handleSave}
                style={{ background: "#ef4444", color: "#fff" }}
                className="font-black w-full"
              >
                Log Safety Flag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {flags.length === 0 ? (
        <CardBox
          data-ocid="dyno-os.safety.empty_state"
          className="p-8 text-center"
        >
          <AlertTriangle
            size={28}
            className="mx-auto mb-3"
            style={{ color: "#f59e0b" }}
          />
          <p className="text-white/50 text-sm">No safety flags logged</p>
        </CardBox>
      ) : (
        <div data-ocid="dyno-os.safety.list" className="space-y-2">
          {flags.map((flag, idx) => {
            const linkedSession = flag.sessionId
              ? sessions.find((s) => s.id === flag.sessionId)
              : null;
            return (
              <motion.div
                key={flag.id}
                data-ocid={`dyno-os.safety.item.${idx + 1}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <div
                  className="rounded-xl p-3 flex items-start gap-3 relative overflow-hidden"
                  style={{
                    background: CARD,
                    border: `1px solid ${CARD_BORDER}`,
                    borderLeft: `3px solid ${severityColor(flag.severity)}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          background: severityBg(flag.severity),
                          color: severityColor(flag.severity),
                        }}
                      >
                        {flag.severity}
                      </span>
                      <span className="text-sm font-black text-white">
                        {flag.eventType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="text-[10px]"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {new Date(flag.loggedAt).toLocaleDateString()}
                      </span>
                      {linkedSession && (
                        <span className="text-[10px]" style={{ color: CYAN }}>
                          {linkedSession.vehicleName}
                        </span>
                      )}
                    </div>
                    {flag.notes && (
                      <p
                        className="text-xs mt-1.5 leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        {flag.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteFlag(flag.id)}
                    className="shrink-0 h-6 w-6 p-0 text-white/20 hover:text-white/60"
                  >
                    <X size={12} />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Customer Explanations collapsible */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setExplanationsOpen((o) => !o)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider w-full text-left py-2"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          {explanationsOpen ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
          Customer Explanations
        </button>
        <AnimatePresence>
          {explanationsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-2">
                {(
                  Object.entries(CUSTOMER_EXPLANATIONS) as [EventType, string][]
                ).map(([type, explanation]) => (
                  <CardBox key={type} className="p-3">
                    <p className="text-xs font-black text-white mb-1">{type}</p>
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {explanation}
                    </p>
                  </CardBox>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Marketing page sections (reused from old page) ────────────────────────────
const FEATURES_MARKETING = [
  {
    id: "session",
    number: "01",
    icon: ClipboardList,
    title: "Dyno Session Manager",
    tagline: "Every pull. Every detail. Every time.",
    color: CYAN,
    bullets: [
      "Vehicle profile — VIN, mods, fuel type, boost level",
      "Run-by-run pull tracking with timestamps",
      "Notes per pull, right where you need them",
      "Weather & correction factors logged automatically",
    ],
  },
  {
    id: "comparison",
    number: "02",
    icon: BarChart3,
    title: "Run Comparison Engine",
    tagline: "This alone saves hours per day.",
    color: "#a855f7",
    bullets: [
      "Overlay dyno graphs from any two runs",
      "Auto-highlight gains and losses across the RPM range",
      "% change calculated per mod or tune revision",
      "Instant visual diff — no spreadsheet required",
    ],
  },
  {
    id: "version",
    number: "03",
    icon: GitBranch,
    title: "Tune Version Control",
    tagline: "Like GitHub — but for tune files.",
    color: "#22c55e",
    bullets: [
      "Full version history of every tune revision",
      "One-click rollback to any previous state",
      "Change notes attached to every save",
      "Who touched what, and when",
    ],
  },
  {
    id: "report",
    number: "04",
    icon: FileBarChart2,
    title: "Customer Power Report Generator",
    tagline: "1-click export. Looks pro. Gets shared.",
    color: "#f59e0b",
    bullets: [
      "Branded dyno sheets with your shop's logo",
      "Before/after graphs ready for social media",
      "Full build summary in one document",
      "QR code linking to the car's online profile",
    ],
  },
  {
    id: "safety",
    number: "05",
    icon: AlertTriangle,
    title: "Safety & Anomaly Detection",
    tagline: "A second set of eyes on every pull.",
    color: "#ef4444",
    bullets: [
      "Real-time knock spike detection and flagging",
      "AFR swing alerts before they become problems",
      "Boost creep monitoring across the pull",
      "Dangerous temp thresholds — coolant, oil, IAT",
    ],
  },
];

const PAIN_POINTS = [
  { icon: "📊", label: "Dyno software" },
  { icon: "📋", label: "Spreadsheets" },
  { icon: "📁", label: "Google Drive" },
  { icon: "📱", label: "WhatsApp texts" },
  { icon: "📝", label: "Paper notes" },
  { icon: "❓", label: '"How much power?"' },
];

const STAT_CHIPS = [
  { icon: TrendingUp, value: "Run-by-Run", label: "Tracking" },
  { icon: Zap, value: "1-Click", label: "Reports" },
  { icon: Activity, value: "Live", label: "Anomaly Detection" },
  { icon: GitBranch, value: "Full", label: "Version Control" },
];

function MarketingContent() {
  return (
    <>
      {/* Hero image section */}
      <section className="relative overflow-hidden">
        <div className="relative h-56 sm:h-72 md:h-80 overflow-hidden">
          <img
            src="/assets/generated/dyno-os-hero.dim_1200x500.jpg"
            alt="DynoOS dashboard"
            className="w-full h-full object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(8,9,14,0.3) 0%, rgba(8,9,14,0.0) 40%, rgba(8,9,14,0.85) 80%, #08090e 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,212,255,0.12) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="px-5 -mt-16 relative z-10 max-w-2xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest"
                style={{
                  background: "rgba(0,212,255,0.1)",
                  border: "1px solid rgba(0,212,255,0.3)",
                  color: CYAN,
                }}
              >
                <Zap size={10} />
                Dyno Intelligence Platform
              </span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2"
              style={{
                color: "#ffffff",
                textShadow: "0 0 40px rgba(0,212,255,0.3)",
              }}
            >
              Dyno<span style={{ color: CYAN }}>OS</span>
            </h1>
            <p
              className="text-base sm:text-lg font-semibold mb-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              The Operating System for Dyno Tuners
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              Shop management + tuning intelligence, built for dynos.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6"
          >
            {STAT_CHIPS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center py-3 px-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${CARD_BORDER}`,
                }}
              >
                <Icon size={14} style={{ color: CYAN }} className="mb-1" />
                <span
                  className="text-sm font-black"
                  style={{ color: "#ffffff" }}
                >
                  {value}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Problem */}
      <section className="px-5 mt-10 max-w-2xl mx-auto">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <p
            className="text-xs font-black uppercase tracking-widest mb-2"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            The Problem
          </p>
          <h2
            className="text-2xl font-black leading-tight mb-4"
            style={{ color: "#ffffff" }}
          >
            Dyno tuners currently juggle{" "}
            <span style={{ color: "#ef4444" }}>six separate systems.</span>
          </h2>
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            There is no unified system. Every job leaks time, context, and
            professionalism into the cracks between tools.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PAIN_POINTS.map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <span className="text-base">{icon}</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div
            className="h-px mt-8"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(0,212,255,0.3), transparent)",
            }}
          />
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-5 mt-8 max-w-2xl mx-auto space-y-4">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xs font-black uppercase tracking-widest mb-6"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Core Features
        </motion.p>
        {FEATURES_MARKETING.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${CARD_BORDER}`,
              }}
            >
              <div
                className="flex items-start gap-4 p-4 pb-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span
                    className="text-[10px] font-black tabular-nums"
                    style={{ color: `${feature.color}80` }}
                  >
                    {feature.number}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${feature.color}12`,
                      border: `1px solid ${feature.color}30`,
                    }}
                  >
                    <Icon size={18} style={{ color: feature.color }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3
                    className="text-base font-black leading-tight"
                    style={{ color: "#ffffff" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-xs mt-0.5 font-semibold italic"
                    style={{ color: feature.color }}
                  >
                    {feature.tagline}
                  </p>
                </div>
              </div>
              <ul className="p-4 pt-3 space-y-2">
                {feature.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2.5 text-sm"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: feature.color }}
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </section>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB BAR
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "sessions", label: "Sessions", icon: ClipboardList },
  { id: "comparison", label: "Comparison", icon: BarChart3 },
  { id: "vault", label: "TuneVault", icon: GitBranch },
  { id: "reports", label: "Reports", icon: FileBarChart2 },
  { id: "safety", label: "Safety", icon: AlertTriangle },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function DynoOSPage() {
  const { meta } = useUserMeta();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isPro = isUserPro() || meta?.isPro;
  const isAnonymous = !identity || identity.getPrincipal().isAnonymous();
  const [activeTab, setActiveTab] = useState<TabId>("sessions");

  // ── Anonymous gate ──────────────────────────────────────────────────────────
  if (isAnonymous) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ background: BG }}
        data-ocid="dyno-os.page"
      >
        <MarketingContent />
        <section className="px-5 mt-8 max-w-2xl mx-auto pb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl p-6"
            style={{
              background: "rgba(0,212,255,0.05)",
              border: `1px solid ${CYAN_BORDER}`,
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: CYAN_DIM,
                  border: `1px solid ${CYAN_BORDER}`,
                }}
              >
                <LogIn size={18} style={{ color: CYAN }} />
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  Sign in to access TunerOS
                </p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Pro tier required to use the platform
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={login}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${CYAN}, #0080ff)`,
                color: "#000",
              }}
            >
              {isLoggingIn ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign in with Internet Identity
                </>
              )}
            </button>
          </motion.div>
        </section>
      </div>
    );
  }

  // ── Non-Pro: marketing + lock banner ───────────────────────────────────────
  if (!isPro) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ background: BG }}
        data-ocid="dyno-os.page"
      >
        {/* Pro lock banner */}
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between gap-3"
          style={{
            background: "rgba(8,9,14,0.92)",
            borderBottom: "1px solid rgba(245,158,11,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Crown
              size={16}
              style={{ color: "#f59e0b" }}
              className="shrink-0"
            />
            <p className="text-xs font-black text-white truncate">
              TunerOS requires{" "}
              <span style={{ color: "#f59e0b" }}>RevSpace Pro</span>
            </p>
          </div>
          <Link to="/pro" className="shrink-0">
            <Button
              data-ocid="dyno-os.pro_lock.upgrade.primary_button"
              size="sm"
              className="text-xs font-black h-8 px-3"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "#000",
              }}
            >
              <Crown size={12} className="mr-1" />
              Upgrade
            </Button>
          </Link>
        </motion.div>

        <MarketingContent />
      </div>
    );
  }

  // ── Pro: full TunerOS app ───────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: BG }}
      data-ocid="dyno-os.page"
    >
      {/* Pro access header badge */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          background: "rgba(0,212,255,0.05)",
          borderBottom: `1px solid ${CARD_BORDER}`,
        }}
      >
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
          style={{
            background: CYAN_DIM,
            border: `1px solid ${CYAN_BORDER}`,
            color: CYAN,
          }}
        >
          <Crown size={9} />
          Pro Access: TunerOS
        </div>
        <span
          className="text-[10px]"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          All features unlocked
        </span>
      </div>

      {/* DynoOS Title */}
      <div className="px-4 pt-5 pb-1">
        <h1
          className="text-2xl font-black tracking-tight"
          style={{ color: "#ffffff" }}
        >
          Dyno<span style={{ color: CYAN }}>OS</span>
        </h1>
        <p
          className="text-xs mt-0.5"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          The Operating System for Dyno Tuners
        </p>
      </div>

      {/* Sticky tab bar */}
      <div
        className="sticky top-0 z-40 mt-3"
        style={{
          background: "rgba(8,9,14,0.95)",
          borderBottom: `1px solid ${CARD_BORDER}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex overflow-x-auto scrollbar-hide">
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-ocid={`dyno-os.tab.${i + 1}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-150 relative"
                style={{
                  color: isActive ? CYAN : "rgba(255,255,255,0.4)",
                  borderBottom: isActive
                    ? `2px solid ${CYAN}`
                    : "2px solid transparent",
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "sessions" && <SessionsTab />}
            {activeTab === "comparison" && <ComparisonTab />}
            {activeTab === "vault" && <VaultTab />}
            {activeTab === "reports" && <ReportsTab />}
            {activeTab === "safety" && <SafetyTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
