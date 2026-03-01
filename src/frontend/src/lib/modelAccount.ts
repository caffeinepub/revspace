/**
 * Model Account state — stored in localStorage with backup keys.
 */

const MODEL_KEY = "revspace_model_account";
const MODEL_KEY_BACKUP = "revspace_model_account_v2";
const MODEL_DATA_KEY = "revspace_model_data";
const MODEL_DATA_KEY_BACKUP = "revspace_model_data_v2";

export interface ModelAccountData {
  specialty: string; // "JDM" | "Euro" | "Stance" | "Muscle" | "Other"
  yearsActive: string;
  socialHandle: string;
  bookingContact: string;
}

export function isModelAccount(): boolean {
  const primary = localStorage.getItem(MODEL_KEY) === "true";
  const backup = localStorage.getItem(MODEL_KEY_BACKUP) === "true";
  if (primary && !backup) {
    localStorage.setItem(MODEL_KEY_BACKUP, "true");
    return true;
  }
  if (backup && !primary) {
    localStorage.setItem(MODEL_KEY, "true");
    return true;
  }
  return primary;
}

export function setModelAccount(enabled: boolean): void {
  const val = enabled ? "true" : "false";
  localStorage.setItem(MODEL_KEY, val);
  localStorage.setItem(MODEL_KEY_BACKUP, val);
}

export function getModelAccountData(): ModelAccountData {
  const tryParse = (key: string): ModelAccountData | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as ModelAccountData;
    } catch {
      return null;
    }
  };
  const primary = tryParse(MODEL_DATA_KEY);
  if (primary) return primary;
  const backup = tryParse(MODEL_DATA_KEY_BACKUP);
  if (backup) {
    localStorage.setItem(MODEL_DATA_KEY, JSON.stringify(backup));
    return backup;
  }
  return {
    specialty: "Just here for the vibes 🌟",
    yearsActive: "",
    socialHandle: "",
    bookingContact: "",
  };
}

export function setModelAccountData(data: ModelAccountData): void {
  const str = JSON.stringify(data);
  localStorage.setItem(MODEL_DATA_KEY, str);
  localStorage.setItem(MODEL_DATA_KEY_BACKUP, str);
}
