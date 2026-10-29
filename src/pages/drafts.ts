import { deleteLetter, getCurrentUser, getLetters } from "../data/store";
import { createGrid, emptyMessage } from "./gallery";

export function renderDrafts(root: HTMLElement) {
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

  const me = getCurrentUser();
  const drafts = getLetters().filter((letter) => letter.draft && letter.from === me);
  const onDelete = (id: string) => {
    deleteLetter(id);
    root.innerHTML = "";
    renderDrafts(root); // redraw without it
  };
  page.append(drafts.length ? createGrid(drafts, { editable: true, onDelete }) : emptyMessage("no drafts saved."));
  root.append(page);
}
