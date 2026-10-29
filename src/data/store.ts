import type { Session } from "@supabase/supabase-js";
import type { Letter, LetterElement } from "../types";
import { supabase } from "./supabase";

// Everything is saved in Supabase. Pages only talk to this file.

// ---------- Logins ----------

// The only two accounts. Supabase logins need an email, so each username maps to one
// (e.g. kelly → kelly@ourletters.app). No emails are ever sent to these addresses.
const USERS: Record<string, string> = { kelly: "Kelly", binks: "Binks" };
const EMAIL_DOMAIN = "ourletters.app";

type User = { id: string; name: string };
let currentUser: User | null = null;

function userFromSession(session: Session | null): User | null {
  const username = session?.user.email?.split("@")[0] ?? "";
  return session && USERS[username] ? { id: session.user.id, name: USERS[username] } : null;
}

// Call once at startup, before showing any page
export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  currentUser = userFromSession(data.session);
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = userFromSession(session);
  });
}

export function getCurrentUser(): string | null {
  return currentUser?.name ?? null;
}

// Whoever isn't logged in, e.g. "Binks" when Kelly is
export function getPartnerName(): string {
  return Object.values(USERS).find((name) => name !== currentUser?.name) ?? "";
}

// Returns null on success, otherwise a message to show.
export async function logIn(username: string, password: string): Promise<string | null> {
  const wrong = "wrong username or password";
  // Accept "kelly" or the full "kelly@ourletters.app"
  const name = username.trim().toLowerCase().replace(`@${EMAIL_DOMAIN}`, "");
  if (!USERS[name]) return wrong;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${name}@${EMAIL_DOMAIN}`,
    password,
  });
  if (error) {
    console.error("Login failed:", error);
    if (error.code === "invalid_credentials") return wrong;
    if (error.code === "email_not_confirmed") return "this account isn't confirmed yet in Supabase";
    return `couldn't log in: ${error.message}`;
  }
  currentUser = userFromSession(data.session);
  return null;
}

export async function logOut() {
  await supabase.auth.signOut();
  currentUser = null;
}

// ---------- Letters ----------

type LetterRow = {
  id: string;
  from_name: string;
  title: string;
  elements: LetterElement[];
  draft: boolean;
  created_at: string;
};

function toLetter(row: LetterRow, starred: boolean): Letter {
  return {
    id: row.id,
    title: row.title,
    from: row.from_name,
    createdAt: row.created_at,
    elements: row.elements,
    draft: row.draft,
    starred,
  };
}

// Sent letters from both of you, plus your own drafts (the database rules handle that)
export async function getLetters(): Promise<Letter[]> {
  const [letters, stars] = await Promise.all([
    supabase.from("letters").select("*"),
    supabase.from("stars").select("letter_id"),
  ]);
  if (letters.error) throw letters.error;
  const starred = new Set((stars.data ?? []).map((s) => s.letter_id));
  return (letters.data as LetterRow[]).map((row) => toLetter(row, starred.has(row.id)));
}

export async function getLetter(id: string): Promise<Letter | undefined> {
  const { data, error } = await supabase.from("letters").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toLetter(data as LetterRow, false) : undefined;
}

// newPhotos: element id → a photo picked in the editor that isn't uploaded yet.
// Those get uploaded first, then the letter is saved pointing at them.
export async function saveLetter(letter: Letter, newPhotos = new Map<string, Blob>()) {
  if (!currentUser) throw new Error("Not signed in");
  const userId = currentUser.id;

  const elements = await Promise.all(letter.elements.map(async (el) => {
    const photo = newPhotos.get(el.id);
    if (el.kind !== "image" || !photo) return el;
    const extension = photo.type.split("/")[1] || "webp";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, photo, { contentType: photo.type });
    if (error) throw error;
    return { ...el, src: path };
  }));

  const { error } = await supabase.from("letters").upsert({
    id: letter.id,
    author_id: userId,
    from_name: letter.from,
    title: letter.title,
    elements,
    draft: letter.draft ?? false,
    created_at: letter.createdAt,
  });
  if (error) throw error;
}

export async function deleteLetter(letter: Letter) {
  const { error } = await supabase.from("letters").delete().eq("id", letter.id);
  if (error) throw error;
  const paths = photoPaths(letter.elements);
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
}

export async function setStarred(letterId: string, starred: boolean) {
  const { error } = starred
    ? await supabase.from("stars").insert({ letter_id: letterId })
    : await supabase.from("stars").delete().eq("letter_id", letterId);
  if (error) throw error;
}

// ---------- Photos ----------

const PHOTO_BUCKET = "photos";

// Uploaded photos are saved as a path like "<user id>/<random>.webp".
// Anything else (data:, blob:, http, /heart.svg) is already a usable address.
function isUploadedPhoto(src: string) {
  return !/^(data:|blob:|https?:|\/)/.test(src);
}

function photoPaths(elements: LetterElement[]) {
  return elements.flatMap((el) => (el.kind === "image" && isUploadedPhoto(el.src) ? [el.src] : []));
}

// Photos are private, so each one needs a temporary link (valid for an hour) to show it.
// Returns uploaded path → link.
export async function getPhotoUrls(elements: LetterElement[]): Promise<Map<string, string>> {
  const paths = photoPaths(elements);
  if (!paths.length) return new Map();
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  return new Map(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as [string, string]] : [])));
}
