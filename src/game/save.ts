import type { CharacterId, WorldId } from "./types";
import { CAMPAIGN_COUNT, WORLD_COUNT, WORLD_TOTAL } from "./types";

const KEY = "cacao-rush-save-v1";
const VERSION = 5;

export type ResumeData = {
  world: WorldId;
  levelIndex: number;
  spawnX: number;
  spawnY: number;
  poleIndex: number;
  lives: number;
  coins: number;
  taken: boolean[];
  character: CharacterId;
};

export type SaveData = {
  version: number;
  unlocked: number;
  best: number[];
  character: CharacterId;
  muted: boolean;
  secrets: WorldId[];
  resume: ResumeData | null;
};

const defaults = (): SaveData => ({
  version: VERSION,
  unlocked: 1,
  best: Array.from({ length: WORLD_TOTAL }, () => 0),
  character: "maya",
  muted: false,
  secrets: [],
  resume: null,
});

export function loadSave(): SaveData {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    let unlocked = Math.max(1, Math.min(WORLD_COUNT, parsed.unlocked ?? 1));
    const ver = parsed.version ?? 1;
    if (ver < 2 && unlocked >= 5) unlocked = 6;
    if (ver < 3 && unlocked >= 10) unlocked = 11;
    if (ver < 4 && unlocked >= 11) unlocked = 12;
    const secrets = Array.isArray(parsed.secrets) ? parsed.secrets.filter((id): id is WorldId => typeof id === "string") : [];
    return {
      ...base,
      ...parsed,
      version: VERSION,
      best: Array.from({ length: WORLD_TOTAL }, (_, i) => parsed.best?.[i] ?? 0),
      unlocked,
      secrets,
      resume: parsed.resume ?? null,
    };
  } catch {
    return base;
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: VERSION }));
  } catch {
    /* private mode */
  }
}

export function recordWin(levelIndex: number, coins: number, world?: WorldId) {
  const s = loadSave();
  s.best[levelIndex] = Math.max(s.best[levelIndex] ?? 0, coins);
  if (levelIndex < CAMPAIGN_COUNT) {
    s.unlocked = Math.max(s.unlocked, Math.min(WORLD_COUNT, levelIndex + 2));
  }
  if (levelIndex >= CAMPAIGN_COUNT && world) {
    if (!s.secrets.includes(world)) s.secrets.push(world);
  }
  writeSave(s);
  return s;
}

export function discoverSecret(world: WorldId) {
  const s = loadSave();
  if (!s.secrets.includes(world)) s.secrets.push(world);
  writeSave(s);
  return s;
}

export function writeResume(resume: ResumeData | null) {
  const s = loadSave();
  s.resume = resume;
  if (resume && resume.character) s.character = resume.character;
  writeSave(s);
  return s;
}

export function clearResume() {
  return writeResume(null);
}
