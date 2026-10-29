import type { Letter } from "../types";

// Everything is saved in this browser's localStorage for now.
// Pages only talk to this file, so it can be swapped for a real backend later.
const LETTERS_KEY = "letters";
const USER_KEY = "currentUser";

// The only two accounts. Passwords come from .env.local.
// Note: Vite bakes these into the site's code, so this only keeps out
// casual visitors until there's a real backend.
const USERS: Record<string, { name: string; password?: string }> = {
  kelly: { name: "Kelly", password: import.meta.env.VITE_KELLY_PASSWORD },
  binks: { name: "Binks", password: import.meta.env.VITE_BINKS_PASSWORD },
};

export function getCurrentUser(): string | null {
  const name = localStorage.getItem(USER_KEY);
  const isKnownUser = Object.values(USERS).some((user) => user.name === name);
  return isKnownUser ? name : null;
}

// Returns false if the username or password is wrong.
export function logIn(username: string, password: string): boolean {
  const user = USERS[username.trim().toLowerCase()];
  if (!user?.password || password !== user.password) return false;
  localStorage.setItem(USER_KEY, user.name);
  return true;
}

export function logOut() {
  localStorage.removeItem(USER_KEY);
}

export function getLetters(): Letter[] {
  try {
    const saved = localStorage.getItem(LETTERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// One-time cleanup of old test data:
// - the sample letters (ids "1"–"3") that got saved alongside real ones
// - the first test letter, sent as "Untitled letter" back when blank titles got that name
// Runs once per browser, so a letter you deliberately title "Untitled letter" later is safe.
const CLEANUP_KEY = "cleanupVersion";
if (localStorage.getItem(CLEANUP_KEY) !== "2") {
  const SAMPLE_IDS = ["1", "2", "3"];
  const cleaned = getLetters().filter(
    (letter) => !SAMPLE_IDS.includes(letter.id) && !(letter.title === "Untitled letter" && !letter.draft)
  );
  localStorage.setItem(LETTERS_KEY, JSON.stringify(cleaned));
  localStorage.setItem(CLEANUP_KEY, "2");
}

export function getLetter(id: string): Letter | undefined {
  return getLetters().find((letter) => letter.id === id);
}

// Throws if the browser runs out of storage space (usually from big pictures).
export function saveLetter(letter: Letter) {
  const letters = getLetters().filter((l) => l.id !== letter.id);
  letters.push(letter);
  localStorage.setItem(LETTERS_KEY, JSON.stringify(letters));
}

export function deleteLetter(id: string) {
  const letters = getLetters().filter((l) => l.id !== id);
  localStorage.setItem(LETTERS_KEY, JSON.stringify(letters));
}

export function toggleStar(id: string) {
  const letter = getLetter(id);
  if (letter) saveLetter({ ...letter, starred: !letter.starred });
}
