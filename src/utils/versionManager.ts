// Version and Build Tracking System for ArduASM & ESP32 Studio
// Automatically manages semantic versions, build history, and auto-incrementing build numbers

export const BASE_SEMVER = '2.0.0';
const STORAGE_KEY_BUILD = 'ardu_asm_build_number_v2';
const STORAGE_KEY_CHANGES = 'ardu_asm_total_changes_v2';
const STORAGE_KEY_LAST_UPDATED = 'ardu_asm_last_updated_v2';
const STORAGE_KEY_LOGS = 'ardu_asm_build_logs_v2';

// Default initial build number for v2.0.0
const DEFAULT_INITIAL_BUILD = 200;

export interface BuildLogEntry {
  id: string;
  buildNumber: number;
  reason: string;
  timestamp: string;
}

export interface VersionInfo {
  semver: string;
  buildNumber: number;
  displayTag: string;
  formatted: string;
  totalEdits: number;
  lastUpdated: string;
  engine: string;
  buildLogs: BuildLogEntry[];
}

function getStoredBuildNumber(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY_BUILD);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch (e) {}
  return DEFAULT_INITIAL_BUILD;
}

function getStoredChangeCount(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY_CHANGES);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0) return num;
    }
  } catch (e) {}
  return 0;
}

function getStoredBuildLogs(): BuildLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(0, 20);
    }
  } catch (e) {}
  return [
    {
      id: 'init-2.0.0',
      buildNumber: DEFAULT_INITIAL_BUILD,
      reason: 'Főverzió 2.0.0: ESP32 Kétmagos 240MHz Xtensa & AVR Hibrid Stúdió Kiadás',
      timestamp: new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }),
    },
  ];
}

let inMemoryBuild = getStoredBuildNumber();
let inMemoryChanges = getStoredChangeCount();
let inMemoryLogs = getStoredBuildLogs();
let listeners: Array<(info: VersionInfo) => void> = [];

export function getVersionInfo(): VersionInfo {
  let lastUpdatedStr = new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  try {
    const savedTime = localStorage.getItem(STORAGE_KEY_LAST_UPDATED);
    if (savedTime) lastUpdatedStr = savedTime;
  } catch (e) {}

  return {
    semver: BASE_SEMVER,
    buildNumber: inMemoryBuild,
    displayTag: `v${BASE_SEMVER} (Build #${inMemoryBuild})`,
    formatted: `v${BASE_SEMVER}-b${inMemoryBuild}`,
    totalEdits: inMemoryChanges,
    lastUpdated: lastUpdatedStr,
    engine: 'ArduASM & ESP32 Xtensa Dual-Core Engine v2.0',
    buildLogs: inMemoryLogs,
  };
}

export function incrementBuild(reason: string = 'Kód módosítás'): VersionInfo {
  inMemoryBuild += 1;
  inMemoryChanges += 1;
  const nowStr = new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const newLogEntry: BuildLogEntry = {
    id: `b-${inMemoryBuild}-${Date.now()}`,
    buildNumber: inMemoryBuild,
    reason,
    timestamp: nowStr,
  };

  inMemoryLogs = [newLogEntry, ...inMemoryLogs.slice(0, 19)];

  try {
    localStorage.setItem(STORAGE_KEY_BUILD, inMemoryBuild.toString());
    localStorage.setItem(STORAGE_KEY_CHANGES, inMemoryChanges.toString());
    localStorage.setItem(STORAGE_KEY_LAST_UPDATED, nowStr);
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(inMemoryLogs));
  } catch (e) {}

  const info = getVersionInfo();
  listeners.forEach((listener) => listener(info));
  return info;
}

export function resetBuildCounter(): VersionInfo {
  inMemoryBuild = DEFAULT_INITIAL_BUILD;
  inMemoryChanges = 0;
  inMemoryLogs = [
    {
      id: `reset-${Date.now()}`,
      buildNumber: inMemoryBuild,
      reason: 'Build számláló visszaállítása',
      timestamp: new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }),
    },
  ];
  try {
    localStorage.setItem(STORAGE_KEY_BUILD, inMemoryBuild.toString());
    localStorage.setItem(STORAGE_KEY_CHANGES, '0');
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(inMemoryLogs));
  } catch (e) {}

  const info = getVersionInfo();
  listeners.forEach((listener) => listener(info));
  return info;
}

export function subscribeToVersionUpdates(callback: (info: VersionInfo) => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}
