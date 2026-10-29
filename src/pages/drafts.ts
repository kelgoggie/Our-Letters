import type { Letter } from "../types";
import { deleteLetter, getCurrentUser, getLetters } from "../data/store";
import { createGrid, emptyMessage } from "./gallery";

export async function renderDrafts(root: HTMLElement) {
  const page = document.createElement("main");
  page.className = "gallery";
  page.innerHTML = `
    <a class="back" href="#/">‹ back</a>
    <header class="gallery-header">
      <div class="greeting">
        <h1>your <b>drafts</b></h1>
        <p class="welcome">only you can see these</p>
      </div>
    </header>
  `;
  const loading = emptyMessage("loading drafts…");
  page.append(loading);
  root.append(page);

  const me = getCurrentUser();
  const drafts = (await getLetters()).filter((letter) => letter.draft && letter.from === me);
  const onDelete = async (letter: Letter) => {
    try {
      await deleteLetter(letter);
    } catch {
      alert("Couldn't delete that draft. Check your internet connection.");
      return;
    }
    root.innerHTML = "";
    renderDrafts(root); // redraw without it
  };
  loading.replaceWith(drafts.length ? createGrid(drafts, { editable: true, onDelete }) : emptyMessage("no drafts saved."));
}
