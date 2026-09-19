const root = document.documentElement;
const body = document.body;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

root.classList.add("js");

function setView(view) {
  const nextView = view === "explore" ? "explore" : "about";
  body.dataset.view = nextView;
  document.querySelectorAll("[data-screen]").forEach((screen) => {
    screen.hidden = screen.dataset.screen !== nextView;
  });
  document.querySelectorAll("[data-view-button]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.viewButton === nextView));
  });
  window.history.replaceState(null, "", `#${nextView}`);
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  window.requestAnimationFrame(observeReveals);
}

document.querySelectorAll("[data-view-button]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewButton));
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewTarget));
});

document.querySelector("[data-filter-bar]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  const filter = button.dataset.filter;
  let count = 0;

  document.querySelectorAll("[data-filter]").forEach((item) => {
    item.setAttribute("aria-pressed", String(item === button));
  });
  document.querySelectorAll("[data-kind]").forEach((row) => {
    const hidden = filter !== "all" && row.dataset.kind !== filter;
    row.classList.toggle("is-hidden", hidden);
    if (!hidden) count += 1;
  });
  const counter = document.querySelector("[data-visible-count]");
  if (counter) counter.textContent = String(count).padStart(2, "0");
});

const revealObserver = "IntersectionObserver" in window && !reducedMotion
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -5%" },
    )
  : null;

function observeReveals() {
  const active = document.querySelector(`[data-screen="${body.dataset.view}"]`);
  active?.querySelectorAll(".reveal").forEach((element) => {
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add("is-visible");
  });
}

window.addEventListener("hashchange", () => setView(window.location.hash.slice(1)));
setView(window.location.hash.slice(1));
