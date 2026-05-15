const LEGACY_STORAGE_KEY = "selected_hospital_id";

function getStorageKey(userId?: string | null) {
  return userId ? `${LEGACY_STORAGE_KEY}:${userId}` : LEGACY_STORAGE_KEY;
}

export function getSelectedHospitalId(userId?: string | null) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getStorageKey(userId));
}

export function setSelectedHospitalId(userId: string | null | undefined, hospitalId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(userId), hospitalId);
}

export function clearSelectedHospitalId(userId?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey(userId));
}

export function clearAllSelectedHospitalIds(userId?: string | null) {
  if (typeof window === "undefined") return;
  clearSelectedHospitalId(userId);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}