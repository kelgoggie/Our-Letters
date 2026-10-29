import { deleteLetter, getCurrentUser, getLetter } from "../data/store";
import { formatWhen } from "../format";
import { createPaper, renderElement } from "../render";

export function renderView(root: HTMLElement, id: string) {
  const letter = getLetter(id);
  const page = document.createElement("main");
  page.className = "view";

  const top = document.createElement("div");
  top.className = "view-top";
  top.innerHTML = `<a class="back" href="#/">‹ back</a>`;
  page.append(top);

  // You can delete letters you wrote
  if (letter && letter.from === getCurrentUser()) {
    const remove = document.createElement("button");
    remove.className = "back";
    remove.textContent = "delete letter";
    remove.addEventListener("click", () => {
      if (!confirm("Delete this letter? This can't be undone.")) return;
      deleteLetter(letter.id);
      location.hash = "#/";
    });
    top.append(remove);
  }

  if (!letter) {
    const missing = document.createElement("p");
    missing.textContent = "This letter doesn't exist.";
    page.append(missing);
    root.append(page);
    return;
  }

  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <div class="title-field"><h1 class="sheet-title"></h1></div>
    <p class="sheet-meta"></p>
  `;
  sheet.querySelector(".sheet-title")!.textContent = letter.title || "Untitled letter";
  const { time, date } = formatWhen(letter.createdAt);
  sheet.querySelector(".sheet-meta")!.textContent = `${time} · ${date} · by ${letter.from}`;

  const paper = createPaper();
  for (const el of letter.elements) {
    paper.append(renderElement(el));
  }
  sheet.append(paper);

  page.append(sheet);
  root.append(page);
}
