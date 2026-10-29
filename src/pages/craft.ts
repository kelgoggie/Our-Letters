import type { Letter, LetterElement } from "../types";
import { getCurrentUser, getLetter, getPhotoUrls, saveLetter } from "../data/store";
import { cleanHtml, createPaper, positionElement, renderElement, styleText } from "../render";


// Pass a draftId to keep working on a saved draft
export async function renderCraft(root: HTMLElement, draftId?: string) {
  const me = getCurrentUser() ?? "Someone";
  const draft = draftId ? await getLetter(draftId) : undefined;
  if (draftId && (!draft?.draft || draft.from !== me)) {
    root.innerHTML = `<main class="craft"><a class="back" href="#/drafts">‹ back</a><p>This draft doesn't exist.</p></main>`;
    return;
  }

  const letterId = draft?.id ?? crypto.randomUUID();
  const photoUrls = draft ? await getPhotoUrls(draft.elements) : new Map<string, string>();
  const newPhotos = new Map<string, Blob>(); // photos added here, uploaded when you save
  const elements: LetterElement[] = [];
  const nodes = new Map<string, HTMLElement>();
  let selectedId: string | null = null;

  const page = document.createElement("main");
  page.className = "craft";

  const header = document.createElement("header");
  header.innerHTML = `
    <a class="back" href="#/">‹ back</a>
    <button class="pill" data-action="photo"><img src="/icons/akar-icons_image.png" alt="" /><span><span class="long">add </span><b>photo</b></span></button>
    <button class="pill" data-action="draft"><img src="/icons/fluent_drafts-24-filled.png" alt="" /><span><span class="long">save to </span><b>drafts</b></span></button>
    <button class="pill send" data-action="send"><img src="/icons/andrsrxn_send-filled.png" alt="" /><span>send<span class="long"> <b>letter</b></span></span></button>
    <input type="file" accept="image/*,.heic,.heif" multiple hidden />
  `;
  const fileInput = header.querySelector<HTMLInputElement>("input")!;

  // Settings for whichever element is selected; floats at the bottom of the screen
  const controls = document.createElement("div");
  controls.className = "controls";
  controls.innerHTML = `
    <label>size <input type="range" name="width" min="5" max="100" /></label>
    <label>tilt <input type="range" name="rotation" min="-45" max="45" /></label>
    <label class="font-control">text size <input type="range" name="fontSize" min="2" max="15" step="0.5" /></label>
    <button data-action="bold" class="font-control style-toggle" aria-pressed="false" aria-label="Bold" title="Bold (Ctrl+B)"><b>B</b></button>
    <button data-action="italic" class="font-control style-toggle" aria-pressed="false" aria-label="Italic" title="Italic (Ctrl+I)"><i>I</i></button>
    <button data-action="edit" class="font-control">edit text</button>
    <button data-action="front">bring to front</button>
    <button data-action="delete" title="Ctrl+Delete">delete</button>
  `;
  const widthInput = controls.querySelector<HTMLInputElement>("[name=width]")!;
  const rotationInput = controls.querySelector<HTMLInputElement>("[name=rotation]")!;
  const fontInput = controls.querySelector<HTMLInputElement>("[name=fontSize]")!;

  // The sheet: title on top, then the paper where text and photos go
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  const titleField = document.createElement("label");
  titleField.className = "title-field";
  titleField.innerHTML = `
    <input class="sheet-title" placeholder=" " aria-label="Letter title" />
    <span class="title-label">letter <b>title</b></span>
  `;
  const titleInput = titleField.querySelector("input")!;
  titleInput.value = draft?.title ?? "";

  const paper = createPaper();
  const verb = matchMedia("(pointer: coarse)").matches ? "Tap" : "Click";
  const placeholder = document.createElement("button");
  placeholder.className = "paper-placeholder";
  placeholder.textContent = `${verb} here to edit letter.`;
  placeholder.addEventListener("click", () => addText(10, 6));
  paper.append(placeholder);
  sheet.append(titleField, paper);

  // Corner dots for resizing the selected photo or text; drawn on top of everything
  const resizeBox = document.createElement("div");
  resizeBox.className = "resize-box";
  resizeBox.hidden = true;
  resizeBox.innerHTML = ["nw", "ne", "sw", "se"].map((corner) => `<span class="handle ${corner}"></span>`).join("");
  paper.append(resizeBox);

  page.append(header, sheet, controls);
  root.append(page);

  const selected = () => elements.find((el) => el.id === selectedId);
  const topZ = () => Math.max(0, ...elements.map((el) => el.z)) + 1;

  function select(id: string | null) {
    selectedId = id;
    for (const [nodeId, node] of nodes) node.classList.toggle("selected", nodeId === id);
    const el = selected();
    controls.hidden = !el;
    updateResizeBox();
    if (!el) return;
    widthInput.value = String(el.width);
    rotationInput.value = String(el.rotation);
    for (const node of controls.querySelectorAll<HTMLElement>(".font-control")) {
      node.hidden = el.kind !== "text";
    }
    updateStyleButtons();
    if (el.kind === "text") fontInput.value = String(el.fontSize);
  }

  function updateStyleButtons() {
    const el = selected();
    if (el?.kind !== "text") return;
    controls.querySelector("[data-action=bold]")!.setAttribute("aria-pressed", String(!!el.bold));
    controls.querySelector("[data-action=italic]")!.setAttribute("aria-pressed", String(!!el.italic));
  }

  // While typing: bold/italic the selected words (or what you type next).
  // Otherwise: bold/italic the whole text box.
  function toggleStyle(el: LetterElement, style: "bold" | "italic") {
    if (el.kind !== "text") return;
    const node = nodes.get(el.id)!;
    if (node.isContentEditable) {
      document.execCommand(style); // old but still the only built-in way to format a selection
      updateResizeBox();
      return;
    }
    el[style] = !el[style];
    styleText(nodes.get(el.id)!, el);
    updateStyleButtons();
    updateResizeBox(); // bold text takes up more room
  }

  // Keeps the corner dots lined up with the selected element
  function updateResizeBox() {
    const el = selected();
    const node = el && nodes.get(el.id);
    resizeBox.hidden = !node;
    if (!el || !node) return;
    resizeBox.style.left = `calc(${el.x}% - 4px)`;
    resizeBox.style.top = `calc(${el.y}% - 4px)`;
    resizeBox.style.width = `calc(${el.width}% + 8px)`;
    resizeBox.style.height = `${node.offsetHeight + 8}px`;
    resizeBox.style.transform = `rotate(${el.rotation}deg)`;
  }

  function addElement(el: LetterElement) {
    elements.push(el);
    const node = renderElement(el, photoUrls);
    nodes.set(el.id, node);
    attachInteractions(node, el);
    // A photo's height isn't known until it loads
    node.addEventListener("load", () => {
      if (selectedId === el.id) updateResizeBox();
    });
    paper.append(node);
    placeholder.hidden = true;
    return node;
  }

  function removeElement(el: LetterElement) {
    elements.splice(elements.indexOf(el), 1);
    nodes.get(el.id)?.remove();
    nodes.delete(el.id);
    placeholder.hidden = elements.length > 0;
    if (selectedId === el.id) select(null);
  }

  // x and y are where on the paper (in %) the text box starts
  function addText(x: number, y: number) {
    const el: LetterElement = {
      kind: "text", id: crypto.randomUUID(), content: "write something sweet…",
      x, y, width: Math.max(20, 90 - x), rotation: 0, z: topZ(), fontSize: 5,
    };
    const node = addElement(el);
    select(el.id);
    startEditing(node, el);
  }

  function startEditing(node: HTMLElement, el: LetterElement) {
    if (el.kind !== "text") return;
    node.contentEditable = "true";
    node.focus();
    node.oninput = updateResizeBox; // the box grows as you type more lines
    // Paste as plain text so formatting from other apps doesn't come along
    node.onpaste = (e) => {
      e.preventDefault();
      document.execCommand("insertText", false, e.clipboardData?.getData("text/plain") ?? "");
    };
    const range = document.createRange();
    range.selectNodeContents(node);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
    node.addEventListener("blur", () => {
      el.content = node.innerText;
      // Only keep the formatted version if some words are actually bold/italic
      const cleaned = document.createElement("div");
      cleaned.append(cleanHtml(node.innerHTML));
      if (cleaned.querySelector("b, strong, i, em")) el.html = cleaned.innerHTML;
      else delete el.html;
      node.contentEditable = "false";
      if (!el.content.trim()) removeElement(el); // don't leave empty boxes behind
    }, { once: true });
  }

  function attachInteractions(node: HTMLElement, el: LetterElement) {
    node.addEventListener("pointerdown", (e) => {
      if (node.isContentEditable) return; // let the user place the cursor while typing
      e.preventDefault();
      const wasSelected = selectedId === el.id;
      select(el.id);

      const rect = paper.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = el.x;
      const origY = el.y;
      node.setPointerCapture(e.pointerId);

      const move = (ev: PointerEvent) => {
        el.x = origX + ((ev.clientX - startX) / rect.width) * 100;
        el.y = origY + ((ev.clientY - startY) / rect.height) * 100;
        positionElement(node, el);
        updateResizeBox();
      };
      const stop = (ev: PointerEvent) => {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerup", stop);
        node.removeEventListener("pointercancel", stop);
        // Tapping text that's already selected (without dragging) starts editing.
        // Works on phones, where double-tap isn't reliable.
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY) > 5;
        if (ev.type === "pointerup" && wasSelected && !moved) startEditing(node, el);
      };
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", stop);
      node.addEventListener("pointercancel", stop);
    });
  }

  // Clicking empty paper deselects, or starts a new text box right there
  paper.addEventListener("click", (e) => {
    if (e.target !== paper) return;
    if (selectedId) return select(null);
    const rect = paper.getBoundingClientRect();
    addText(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100);
  });

  // Dragging a corner dot scales the element around its center, keeping its shape.
  // For text, the font grows with the box so the words wrap the same way.
  resizeBox.addEventListener("pointerdown", (e) => {
    const el = selected();
    const handle = (e.target as HTMLElement).closest<HTMLElement>(".handle");
    if (!el || !handle) return;
    e.preventDefault();
    const node = nodes.get(el.id)!;
    const paperRect = paper.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const cx = nodeRect.left + nodeRect.width / 2;
    const cy = nodeRect.top + nodeRect.height / 2;
    const startDistance = Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy));
    const origWidth = el.width;
    const origHeight = (node.offsetHeight / paperRect.height) * 100; // in % of paper height
    const centerX = el.x + origWidth / 2;
    const centerY = el.y + origHeight / 2;
    const origFont = el.kind === "text" ? el.fontSize : 0;
    // Stay within the slider ranges (size 5–100, text size 2–15)
    let minScale = 5 / origWidth;
    let maxScale = 100 / origWidth;
    if (el.kind === "text") {
      minScale = Math.max(minScale, 2 / origFont);
      maxScale = Math.min(maxScale, 15 / origFont);
    }
    handle.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      const raw = Math.hypot(ev.clientX - cx, ev.clientY - cy) / startDistance;
      const scale = Math.min(maxScale, Math.max(minScale, raw));
      el.width = origWidth * scale;
      el.x = centerX - el.width / 2;
      el.y = centerY - (origHeight * scale) / 2;
      if (el.kind === "text") {
        el.fontSize = origFont * scale;
        styleText(node, el);
        fontInput.value = String(el.fontSize);
      }
      positionElement(node, el);
      updateResizeBox();
      widthInput.value = String(el.width);
    };
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  });

  // The paper changes size with the window, so re-fit the dots
  new ResizeObserver(updateResizeBox).observe(paper);

  // Ctrl+Delete (or Cmd+Backspace on a Mac) removes the selected thing
  function onKeyDown(e: KeyboardEvent) {
    if (!page.isConnected) return document.removeEventListener("keydown", onKeyDown); // left the page
    const el = selected();
    const active = document.activeElement as HTMLElement | null;
    const typing = active?.isContentEditable || (active instanceof HTMLInputElement && active.type !== "range");
    if (!el) return;
    // Ctrl+B / Ctrl+I work while typing in a text box too, but not in the title
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (key === "b" || key === "i") && el.kind === "text" && active !== titleInput) {
      e.preventDefault();
      toggleStyle(el, key === "b" ? "bold" : "italic");
      return;
    }
    if (typing) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === "Delete" || e.key === "Backspace")) {
      e.preventDefault();
      removeElement(el);
    }
  }
  document.addEventListener("keydown", onKeyDown);

  fileInput.addEventListener("change", async () => {
    for (const file of fileInput.files ?? []) {
      try {
        const photo = await shrinkPhoto(file);
        const el: LetterElement = {
          kind: "image", id: crypto.randomUUID(), src: URL.createObjectURL(photo), // local preview until saved
          x: 30, y: 30, width: 40, rotation: 0, z: topZ(),
        };
        newPhotos.set(el.id, photo);
        addElement(el);
        select(el.id);
      } catch {
        alert(`Couldn't open "${file.name}". Try a JPG, PNG or HEIC.`);
      }
    }
    fileInput.value = ""; // allow picking the same file again
  });

  controls.addEventListener("input", (e) => {
    const el = selected();
    if (!el) return;
    const input = e.target as HTMLInputElement;
    const value = Number(input.value);
    if (input.name === "width") el.width = value;
    if (input.name === "rotation") el.rotation = value;
    if (input.name === "fontSize" && el.kind === "text") {
      el.fontSize = value;
      nodes.get(el.id)!.style.fontSize = `${value}cqw`;
    }
    positionElement(nodes.get(el.id)!, el);
    updateResizeBox();
  });

  // Clicking a button in the bar shouldn't end text editing
  controls.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest("button")) e.preventDefault();
  });

  controls.addEventListener("click", (e) => {
    const el = selected();
    const action = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (!el || !action) return;
    const node = nodes.get(el.id)!;
    if (action === "edit") startEditing(node, el);
    if (action === "bold" || action === "italic") toggleStyle(el, action);
    if (action === "front") {
      el.z = topZ();
      positionElement(node, el);
    }
    if (action === "front" || action === "edit") updateResizeBox();
    if (action === "delete") removeElement(el);
  });

  // Grey out the buttons while saving so nothing gets sent twice
  function setSaving(saving: boolean) {
    for (const button of header.querySelectorAll("button")) button.disabled = saving;
  }

  async function save(isDraft: boolean): Promise<Letter | null> {
    (document.activeElement as HTMLElement | null)?.blur(); // finish any text being edited
    const letter: Letter = {
      id: letterId,
      title: titleInput.value.trim(),
      from: me,
      createdAt: new Date().toISOString(),
      elements,
      draft: isDraft,
    };
    setSaving(true);
    try {
      await saveLetter(letter, newPhotos);
      return letter;
    } catch (err) {
      console.error(err);
      alert("Couldn't save your letter. Check your internet connection and try again.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  header.addEventListener("click", async (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action === "photo") fileInput.click();
    if (action === "draft") {
      if (elements.length === 0 && !titleInput.value.trim()) return;
      if (await save(true)) location.hash = "#/drafts";
    }
    if (action === "send") {
      if (elements.length === 0) {
        alert("Your letter is empty. Write something or add a photo first.");
        return;
      }
      const letter = await save(false);
      if (letter) location.hash = `#/letter/${letter.id}`;
    }
  });

  for (const el of draft?.elements ?? []) addElement(structuredClone(el));
  select(null);
}

// Shrinks big photos so they upload and load quickly.
async function shrinkPhoto(file: File, maxSize = 1600): Promise<Blob> {
  const bitmap = await decodeImage(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // webp keeps transparency and stays small (browsers that can't make webp give a png)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't shrink photo"))), "image/webp", 0.85)
  );
}

// Most browsers can't open iPhone HEIC photos, so convert those ourselves.
async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file); // works for JPG/PNG/etc, and HEIC in Safari
  } catch (err) {
    const looksLikeHeic = /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/.test(file.type);
    if (!looksLikeHeic) throw err;
    const { heicTo } = await import("heic-to"); // big library, so only load it when needed
    return heicTo({ blob: file, type: "bitmap" });
  }
}
