(function () {
  const cookieKey = "eu-ai-site-cookie-choice-v1";

  function track(name, props) {
    if (typeof window.plausible === "function") {
      window.plausible(name, props ? { props: props } : undefined);
    }
  }

  function initCookieBanner() {
    const banner = document.querySelector("[data-cookie-banner]");
    if (!banner) return;
    if (window.localStorage.getItem(cookieKey)) return;
    banner.classList.add("is-visible");
    const buttons = banner.querySelectorAll("[data-cookie-choice]");
    buttons.forEach((button) => {
      button.addEventListener("click", function () {
        const choice = button.getAttribute("data-cookie-choice");
        window.localStorage.setItem(cookieKey, choice || "essential");
        banner.classList.remove("is-visible");
        track("cookie_choice", { choice: choice || "essential" });
      });
    });
  }

  function initLocaleSwitcher() {
    const switchers = document.querySelectorAll("[data-locale-switcher]");
    switchers.forEach((switcher) => {
      switcher.addEventListener("change", function () {
        const href = switcher.value;
        if (href) window.location.href = href;
      });
    });
  }

  function initTrackedClicks() {
    document.querySelectorAll("[data-track-event]").forEach((node) => {
      node.addEventListener("click", function () {
        track(node.getAttribute("data-track-event"), {
          source: node.getAttribute("data-track-source") || "site",
        });
      });
    });
  }

  function initFadeUps() {
    const items = Array.from(document.querySelectorAll(".fade-up"));
    if (items.length === 0 || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    items.forEach((item) => observer.observe(item));
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.EUAI_SITE = { track: track };
    initCookieBanner();
    initLocaleSwitcher();
    initTrackedClicks();
    initFadeUps();
  });
})();
