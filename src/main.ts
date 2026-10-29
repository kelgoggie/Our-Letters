import "./style.css";
import { renderLogin } from "./pages/login";
import { renderGallery } from "./pages/gallery";
import { renderCraft } from "./pages/craft";
import { renderView } from "./pages/view";
import { renderDrafts } from "./pages/drafts";
import { getCurrentUser, initAuth } from "./data/store";

const app = document.querySelector<HTMLDivElement>("#app")!;

function router() {
  const path = location.hash.slice(1) || "/";

  // Everyone has to sign in first
  if (!getCurrentUser() && path !== "/login") {
    location.hash = "#/login";
    return;
  }
  if (getCurrentUser() && path === "/login") {
    location.hash = "#/";
    return;
  }

  // A fresh container per page, so a page still loading when you click away
  // finishes into nothing instead of showing up on the new page
  const view = document.createElement("div");
  app.replaceChildren(view);

  const edit = path.match(/^\/edit\/(.+)$/);
  const letter = path.match(/^\/letter\/(.+)$/);
  let page: void | Promise<void> = undefined;
  if (path === "/") page = renderGallery(view);
  else if (path === "/login") page = renderLogin(view);
  else if (path === "/new") page = renderCraft(view);
  else if (path === "/drafts") page = renderDrafts(view);
  else if (edit) page = renderCraft(view, edit[1]);
  else if (letter) page = renderView(view, letter[1]);
  else view.textContent = "Page not found";

  Promise.resolve(page).catch((err) => {
    console.error(err);
    view.innerHTML = `<p class="empty">Something went wrong loading this page. Check your internet connection and refresh.</p>`;
  });
}

// Check for an existing login before showing anything
initAuth().then(() => {
  window.addEventListener("hashchange", router);
  router();
});
