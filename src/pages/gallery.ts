import type { Letter } from "../types";
import { getCurrentUser, getLetters, logOut, setStarred } from "../data/store";
import { formatWhen } from "../format";

const STAR_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9L12 3.5z"/></svg>`;
const TRASH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/></svg>`;

type CardOptions = {
  starrable?: boolean;
  editable?: boolean;                 // opens in the editor instead of the reader
  onDelete?: (letter: Letter) => void;    // shows a delete button
};

export async function renderGallery(root: HTMLElement) {
  const page = document.createElement("main");
  page.className = "gallery";

  page.innerHTML = `
    <button class="log-out">log out</button>
    <header class="gallery-header">
      <div class="greeting">
        <h1>hello, <b class="name"></b></h1>
        <p class="welcome">welcome to <b>our letters</b></p>
      </div>
      <nav class="actions">
        <a class="round-action" href="#/drafts">
          <span class="bubble"><img src="/icons/fluent_drafts-24-filled.png" alt="" /></span>
          <span class="label"><b>drafts</b></span>
        </a>
        <a class="round-action new" href="#/new">
          <span class="label">new letter</span>
          <span class="bubble"><img src="/icons/fluent_mail-add-20-filled.png" alt="" /></span>
        </a>
      </nav>
    </header>
  `;
  page.querySelector(".name")!.textContent = `${getCurrentUser()}!`;
  page.querySelector(".log-out")!.addEventListener("click", () => {
    logOut().then(() => (location.hash = "#/login"));
  });

  const loading = emptyMessage("loading letters…");
  page.append(loading);
  root.append(page);

  const sent = (await getLetters()).filter((letter) => !letter.draft);
  loading.replaceWith(sent.length ? createGrid(sent, { starrable: true }) : emptyMessage("no letters yet. write the first one!"));
}

export function createGrid(letters: Letter[], options: CardOptions = {}) {
  const grid = document.createElement("div");
  grid.className = "letter-grid";
  const newestFirst = [...letters].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  for (const letter of newestFirst) {
    grid.append(createCard(letter, options));
  }
  return grid;
}

export function emptyMessage(text: string) {
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = text;
  return empty;
}

function createCard(letter: Letter, { starrable = false, editable = false, onDelete }: CardOptions) {
  const card = document.createElement("article");
  card.className = "letter-card";
  const { time, date } = formatWhen(letter.createdAt);

  card.innerHTML = `
    <h2><a class="card-link"></a></h2>
    <p class="card-meta"><span class="when"></span><br />by <b class="by"></b></p>
    <p class="excerpt"></p>
  `;
  const link = card.querySelector<HTMLAnchorElement>(".card-link")!;
  link.href = editable ? `#/edit/${letter.id}` : `#/letter/${letter.id}`;
  link.textContent = letter.title || "Untitled letter";
  card.querySelector(".when")!.innerHTML = `${time} <span class="divider"></span> ${date}`;
  card.querySelector(".by")!.textContent = letter.from;
  card.querySelector(".excerpt")!.textContent = excerpt(letter);

  if (onDelete) {
    const trash = document.createElement("button");
    trash.className = "card-button";
    trash.innerHTML = TRASH_ICON;
    trash.setAttribute("aria-label", "Delete");
    trash.addEventListener("click", () => {
      if (confirm(`Delete "${letter.title || "Untitled letter"}"? This can't be undone.`)) onDelete(letter);
    });
    card.append(trash);
  }

  if (starrable) {
    const star = document.createElement("button");
    star.className = "card-button star";
    star.innerHTML = STAR_ICON;
    star.setAttribute("aria-label", "Star this letter");
    star.setAttribute("aria-pressed", String(!!letter.starred));
    star.addEventListener("click", () => {
      const starred = star.getAttribute("aria-pressed") !== "true";
      star.setAttribute("aria-pressed", String(starred)); // update right away, save in the background
      setStarred(letter.id, starred).catch(() => {
        star.setAttribute("aria-pressed", String(!starred));
        alert("Couldn't save that star. Check your internet connection.");
      });
    });
    card.append(star);
  }
  return card;
}

// The letter's text, top to bottom, for the card preview
function excerpt(letter: Letter) {
  const text = letter.elements
    .filter((el) => el.kind === "text")
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((el) => el.content)
    .join(" ")
    .trim();
  return text || "(just pictures)";
}
