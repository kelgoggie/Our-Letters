import { deleteLetter, getCurrentUser, getLetter, getPhotoUrls } from "../data/store";
import { formatWhen } from "../format";
import { createPaper, renderElement } from "../render";

export async function renderView(root: HTMLElement, id: string) {
  const page = document.createElement("main");
  page.className = "view";

  const top = document.createElement("div");
  top.className = "view-top";
  top.innerHTML = `<a class="back" href="#/">‹ back</a>`;
  page.append(top);
  root.append(page);

  const letter = await getLetter(id);
  if (!letter) {
    const missing = document.createElement("p");
    missing.textContent = "This letter doesn't exist.";
    page.append(missing);
    return;
  }
  const photoUrls = await getPhotoUrls(letter.elements);

  // You can delete letters you wrote
  if (letter.from === getCurrentUser()) {
    const remove = document.createElement("button");
    remove.className = "back";
    remove.textContent = "delete letter";
    remove.addEventListener("click", async () => {
      if (!confirm("Delete this letter? This can't be undone.")) return;
      try {
        await deleteLetter(letter);
        location.hash = "#/";
      } catch {
        alert("Couldn't delete the letter. Check your internet connection.");
      }
    });
    top.append(remove);
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
    paper.append(renderElement(el, photoUrls));
  }
  sheet.append(paper);
  page.append(sheet);
}
