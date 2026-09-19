const root = document.documentElement;
const body = document.body;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

root.classList.add("js");

const validConcepts = new Set(["one", "two", "three"]);
const validViews = new Set(["about", "explore"]);

function readSaved(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The prototype works without persistence in private browsing modes.
  }
}

function readHash() {
  const [concept, view] = window.location.hash.replace(/^#/, "").split("/");
  return {
    concept: validConcepts.has(concept) ? concept : null,
    view: validViews.has(view) ? view : null,
  };
}

function setHash(concept, view) {
  const nextHash = `#${concept}/${view}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function resetFilters(panel) {
  panel.querySelectorAll("[data-filter-bar]").forEach((bar) => {
    bar.querySelectorAll("[data-filter]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === "all"));
    });
  });
  panel.querySelectorAll("[data-kind]").forEach((item) => item.classList.remove("is-hidden"));
}

function refreshReveal() {
  const activeScreen = document.querySelector(
    `[data-concept-panel="${body.dataset.concept}"] [data-screen="${body.dataset.view}"]`,
  );
  if (!activeScreen) return;

  activeScreen.querySelectorAll(".reveal").forEach((element) => {
    element.classList.remove("is-visible");
    revealObserver?.observe(element);
  });
}

function commitState(concept, view) {
  body.dataset.concept = concept;
  body.dataset.view = view;

  document.querySelectorAll("[data-concept-panel]").forEach((panel) => {
    const active = panel.dataset.conceptPanel === concept;
    panel.hidden = !active;
    panel.querySelectorAll("[data-screen]").forEach((screen) => {
      screen.hidden = !active || screen.dataset.screen !== view;
    });
    if (active) resetFilters(panel);
  });

  document.querySelectorAll("[data-concept-button]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.conceptButton === concept));
  });
  document.querySelectorAll("[data-view-button]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.viewButton === view));
  });

  save("sue-about-lab-concept", concept);
  save("sue-about-lab-view", view);
  setHash(concept, view);
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  window.requestAnimationFrame(refreshReveal);
}

function changeState(concept, view) {
  const update = () => commitState(concept, view);
  if (!reduceMotion.matches && document.startViewTransition) {
    document.startViewTransition(update);
  } else {
    update();
  }
}

document.querySelectorAll("[data-concept-button]").forEach((button) => {
  button.addEventListener("click", () => changeState(button.dataset.conceptButton, body.dataset.view));
});

document.querySelectorAll("[data-view-button]").forEach((button) => {
  button.addEventListener("click", () => changeState(body.dataset.concept, button.dataset.viewButton));
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => changeState(body.dataset.concept, button.dataset.viewTarget));
});

document.querySelectorAll("[data-filter-bar]").forEach((bar) => {
  bar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;

    const panel = bar.closest("[data-concept-panel]");
    const filter = button.dataset.filter;
    bar.querySelectorAll("[data-filter]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    panel.querySelectorAll("[data-kind]").forEach((item) => {
      item.classList.toggle("is-hidden", filter !== "all" && item.dataset.kind !== filter);
    });
  });
});

const revealObserver = "IntersectionObserver" in window && !reduceMotion.matches
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8%" },
    )
  : null;

if (!revealObserver) {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
}

const cursor = document.querySelector(".cursor");
if (cursor && window.matchMedia("(pointer: fine)").matches) {
  document.addEventListener("pointermove", (event) => {
    body.classList.add("has-pointer");
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });
  document.addEventListener("pointerover", (event) => {
    body.classList.toggle(
      "pointer-over-action",
      Boolean(event.target.closest("button, .one-card, .two-row, .field-card")),
    );
  });
  document.addEventListener("pointerleave", () => body.classList.remove("has-pointer"));
}

window.addEventListener("hashchange", () => {
  const hash = readHash();
  if (hash.concept || hash.view) {
    commitState(hash.concept ?? body.dataset.concept, hash.view ?? body.dataset.view);
  }
});

const initialHash = readHash();
const initialConcept = initialHash.concept ?? readSaved("sue-about-lab-concept") ?? "one";
const initialView = initialHash.view ?? readSaved("sue-about-lab-view") ?? "about";
commitState(
  validConcepts.has(initialConcept) ? initialConcept : "one",
  validViews.has(initialView) ? initialView : "about",
);
