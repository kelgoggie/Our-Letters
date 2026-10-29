import type { LetterElement } from "./types";

// A letter is a sheet of paper with elements placed on it.
// x and width are % of the paper's width, y is % of its height,
// and fontSize is % of the paper's width so text scales with the page.
export function createPaper(): HTMLDivElement {
  const paper = document.createElement("div");
  paper.className = "paper";
  return paper;
}

// photoUrls maps uploaded photo paths to viewable links (see getPhotoUrls)
export function renderElement(el: LetterElement, photoUrls?: Map<string, string>): HTMLElement {
  let node: HTMLElement;
  if (el.kind === "text") {
    node = document.createElement("div");
    node.className = "letter-text";
    if (el.html) node.append(cleanHtml(el.html));
    else node.textContent = el.content;
    styleText(node, el);
  } else {
    const img = document.createElement("img");
    img.className = "letter-image";
    img.src = photoUrls?.get(el.src) ?? el.src;
    img.alt = "";
    img.draggable = false;
    node = img;
  }
  positionElement(node, el);
  return node;
}

// Keeps only line breaks and bold/italic from formatted text, so a letter can
// never sneak in scripts, links or odd styling. Everything else becomes plain text.
const KEEP_TAGS = new Set(["B", "STRONG", "I", "EM", "BR", "DIV", "P"]);

export function cleanHtml(html: string): DocumentFragment {
  const template = document.createElement("template"); // inert: nothing in it runs or loads
  template.innerHTML = html;
  const out = document.createDocumentFragment();

  const copy = (from: Node, to: Node) => {
    for (const child of from.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        to.appendChild(document.createTextNode(child.textContent ?? ""));
      } else if (child instanceof HTMLElement) {
        let target: Node = to;
        if (KEEP_TAGS.has(child.tagName)) {
          target = to.appendChild(document.createElement(child.tagName));
        } else if (child.tagName === "SPAN") {
          // Safari marks bold/italic with styled <span>s instead of <b>/<i>
          if (child.style.fontWeight === "bold" || Number(child.style.fontWeight) >= 600) {
            target = target.appendChild(document.createElement("b"));
          }
          if (child.style.fontStyle === "italic") target = target.appendChild(document.createElement("i"));
        }
        copy(child, target);
      }
    }
  };
  copy(template.content, out);
  return out;
}

export function styleText(node: HTMLElement, el: Extract<LetterElement, { kind: "text" }>) {
  node.style.fontSize = `${el.fontSize}cqw`;
  node.style.fontWeight = el.bold ? "700" : "";
  node.style.fontStyle = el.italic ? "italic" : "";
}

export function positionElement(node: HTMLElement, el: LetterElement) {
  node.style.left = `${el.x}%`;
  node.style.top = `${el.y}%`;
  node.style.width = `${el.width}%`;
  node.style.transform = `rotate(${el.rotation}deg)`;
  node.style.zIndex = String(el.z);
}
