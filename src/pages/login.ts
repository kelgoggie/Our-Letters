import { logIn } from "../data/store";

export function renderLogin(root: HTMLElement) {
  const page = document.createElement("main");
  page.className = "login";

  // The placeholder-style labels ("user**name**") are real <span>s so they can mix
  // font weights; CSS hides them once something is typed.
  page.innerHTML = `
    <div class="flowers" aria-hidden="true"></div>
    <form>
      <div class="login-card">
        <h1>our <b>letters</b></h1>
        <label class="field">
          <img src="/icons/andrsrxn_user-heart.png" alt="" />
          <input name="username" placeholder=" " autocomplete="username" autocapitalize="none" required />
          <span class="field-label">user<b>name</b></span>
        </label>
        <label class="field">
          <img src="/icons/hugeicons_circle-password.png" alt="" />
          <input name="password" type="password" placeholder=" " autocomplete="current-password" required />
          <span class="field-label">pass<b>word</b></span>
        </label>
        <p class="error" role="alert" hidden>wrong username or password</p>
      </div>
      <button type="submit" class="login-button">
        <img src="/icons/basil_heart-solid.png" alt="" /> log <b>in</b>
      </button>
    </form>
  `;
  const form = page.querySelector("form")!;
  const error = page.querySelector<HTMLParagraphElement>(".error")!;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const ok = logIn(String(data.get("username")), String(data.get("password")));
    if (!ok) {
      error.hidden = false;
      form.querySelector<HTMLInputElement>("[name=password]")!.select();
      return;
    }
    location.hash = "#/";
  });

  root.append(page);
  form.querySelector("input")!.focus();
}
