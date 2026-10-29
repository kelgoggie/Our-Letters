import "./style.css";
import { renderLogin } from "./pages/login";
import { renderGallery } from "./pages/gallery";
import { renderCraft } from "./pages/craft";
import { renderView } from "./pages/view";
import { renderDrafts } from "./pages/drafts";
import { getCurrentUser } from "./data/store";

const app = document.querySelector<HTMLDivElement>("#app")!;

function router() {
  const path = location.hash.slice(1) || "/";
  app.innerHTML = ""; // clear the previous page

  // Everyone has to sign in first
  if (!getCurrentUser() && path !== "/login") {
    location.hash = "#/login";
    return;
  }
  if (getCurrentUser() && path === "/login") {
    location.hash = "#/";
    return;
  }

  if (path === "/") return renderGallery(app);
  if (path === "/login") return renderLogin(app);
  if (path === "/new") return renderCraft(app);
  if (path === "/drafts") return renderDrafts(app);

  const edit = path.match(/^\/edit\/(.+)$/);
  if (edit) return renderCraft(app, edit[1]);

  const match = path.match(/^\/letter\/(.+)$/);
  if (match) return renderView(app, match[1]);

  app.textContent = "Page not found";
}

window.addEventListener("hashchange", router);
router(); // run once on first load