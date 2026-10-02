"use strict";

(() => {
  const SITE_CONFIG = Object.freeze({ email: "baselahmad@vt.edu" });
  const body = document.body;
  const header = document.getElementById("site-header");
  const navMenu = document.getElementById("nav-menu");
  const navLinks = [...navMenu.querySelectorAll("a")];
  const mobileQuery = window.matchMedia("(max-width: 860px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Storage restrictions must not prevent the rest of the page from working.
  function initializeTheme() {
    const toggle = document.getElementById("theme-toggle");
    const icon = document.getElementById("theme-icon");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    let savedTheme;

    try {
      savedTheme = localStorage.getItem("basel-site-theme");
    } catch {
      // Use the system preference when browser storage is unavailable.
    }

    function applyTheme(theme) {
      const isDark = theme === "dark";
      body.classList.toggle("dark-theme", isDark);
      toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
      icon.innerHTML = isDark
        ? '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"></path>'
        : `<circle cx="12" cy="12" r="4"></circle>
           <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.42"></path>`;
    }

    applyTheme(savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : systemTheme.matches ? "dark" : "light");

    toggle.addEventListener("click", () => {
      savedTheme = body.classList.contains("dark-theme") ? "light" : "dark";
      applyTheme(savedTheme);
      try {
        localStorage.setItem("basel-site-theme", savedTheme);
      } catch {
        // The selected theme still applies for the current visit.
      }
    });
    toggle.hidden = false;

    systemTheme.addEventListener("change", () => {
      if (savedTheme !== "dark" && savedTheme !== "light") {
        applyTheme(systemTheme.matches ? "dark" : "light");
      }
    });
  }

  function initializeNavigation() {
    const toggle = document.getElementById("menu-toggle");
    const icon = document.getElementById("menu-icon");
    const background = [document.querySelector("main"), document.querySelector("footer")];
    let menuOpen = false;

    function setMenuState(open, restoreFocus = false) {
      menuOpen = open && mobileQuery.matches;
      navMenu.classList.toggle("open", menuOpen);
      header.classList.toggle("menu-active", menuOpen);
      body.classList.toggle("menu-open", menuOpen);
      toggle.setAttribute("aria-expanded", String(menuOpen));
      toggle.setAttribute("aria-label", menuOpen ? "Close navigation menu" : "Open navigation menu");
      icon.innerHTML = menuOpen
        ? '<path d="M6 6l12 12M18 6 6 18"></path>'
        : '<path d="M4 7h16M4 12h16M4 17h16"></path>';

      if (restoreFocus) toggle.focus();
      navMenu.toggleAttribute("inert", mobileQuery.matches && !menuOpen);
      if (mobileQuery.matches && !menuOpen) {
        navMenu.setAttribute("aria-hidden", "true");
      } else {
        navMenu.removeAttribute("aria-hidden");
      }
      background.forEach((element) => element.toggleAttribute("inert", menuOpen));
      if (menuOpen) navLinks[0].focus();
    }

    toggle.addEventListener("click", () => setMenuState(!menuOpen, menuOpen));
    [...navLinks, header.querySelector(".brand")].forEach((link) => {
      link.addEventListener("click", () => {
        if (!menuOpen) return;
        setMenuState(false);
        const target = document.querySelector(link.getAttribute("href"));
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
      });
    });

    document.addEventListener("keydown", (event) => {
      if (!menuOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuState(false, true);
      } else if (event.key === "Tab") {
        const controls = [...header.querySelectorAll("a, button:not([hidden])")];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    mobileQuery.addEventListener("change", () => {
      const focusInMenu = navMenu.contains(document.activeElement);
      setMenuState(false, mobileQuery.matches && focusInMenu);
      if (!mobileQuery.matches && document.activeElement === toggle) navLinks[0].focus();
    });
    setMenuState(false);
    body.classList.add("navigation-ready");
  }

  // Track section positions directly, including very tall research sections.
  function initializeScrollState() {
    const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
    let framePending = false;

    function update() {
      framePending = false;
      header.classList.toggle("scrolled", window.scrollY > 24);
      const marker = header.offsetHeight + 32;
      let activeId = "";
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= marker) activeId = section.id;
      });
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${activeId}`;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }

    function scheduleUpdate() {
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    window.addEventListener("load", scheduleUpdate);
    if ("ResizeObserver" in window) {
      new ResizeObserver(scheduleUpdate).observe(document.querySelector("main"));
    }
    update();
  }

  function initializePublications() {
    const tabs = [...document.querySelectorAll("[data-publication-tab]")];
    const panels = [...document.querySelectorAll("[data-publication-panel]")];

    function activate(category) {
      tabs.forEach((tab) => {
        const active = tab.dataset.publicationTab === category;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => {
        const active = panel.dataset.publicationPanel === category;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
      });
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(tab.dataset.publicationTab));
      tab.addEventListener("keydown", (event) => {
        let nextIndex;
        switch (event.key) {
          case "ArrowRight": nextIndex = (index + 1) % tabs.length; break;
          case "ArrowLeft": nextIndex = (index - 1 + tabs.length) % tabs.length; break;
          case "Home": nextIndex = 0; break;
          case "End": nextIndex = tabs.length - 1; break;
          default: return;
        }
        event.preventDefault();
        activate(tabs[nextIndex].dataset.publicationTab);
        tabs[nextIndex].focus();
      });
    });
    activate("journal");
    document.querySelector(".publication-tabs__buttons").hidden = false;
  }

  function initializeCopyEmail() {
    const button = document.getElementById("copy-email");
    const status = document.getElementById("copy-email-status");
    const fallback = document.getElementById("copy-email-fallback");
    const address = document.getElementById("email-address");

    button.addEventListener("click", async () => {
      button.disabled = true;
      status.textContent = "";
      try {
        await navigator.clipboard.writeText(SITE_CONFIG.email);
        fallback.hidden = true;
        status.textContent = "Email address copied.";
      } catch {
        fallback.hidden = false;
        address.focus();
        address.select();
        status.textContent = "Automatic copying is unavailable. Copy the selected address below.";
      } finally {
        button.disabled = false;
      }
    });
    button.hidden = false;
  }

  // Prepare a draft in the visitor's email application; no backend is required.
  function initializeContactForm() {
    const form = document.getElementById("contact-form");
    const status = document.getElementById("form-status");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const senderEmail = String(data.get("email") || "").trim();
      const organization = String(data.get("organization") || "").trim();
      const message = String(data.get("message") || "").trim();
      if (!name || !senderEmail || !message) {
        status.textContent = "Please complete your name, email, and message.";
        status.classList.add("visible");
        return;
      }
      const subject = encodeURIComponent(`Website inquiry from ${name}`);
      const bodyText = [
        `Name: ${name}`,
        `Email: ${senderEmail}`,
        `Organization: ${organization || "Not provided"}`,
        "",
        "Message:",
        message,
      ].join("\n");
      status.textContent = "Opening an email draft. Review and send it in your email application. If it does not open, use the email address above.";
      status.classList.add("visible");
      window.location.href = `mailto:${SITE_CONFIG.email}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    });
    form.hidden = false;
  }

  // Content stays visible unless an observer can safely reveal it on scroll.
  function initializeReveal() {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
    const elements = [...document.querySelectorAll(".reveal")];
    let observer;
    try {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("reveal-pending");
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0, rootMargin: "0px 0px -60px 0px" });
      elements.forEach((element) => {
        // Never conceal content that is already visible on a deep-linked page.
        if (element.getBoundingClientRect().top >= window.innerHeight) {
          element.classList.add("reveal-pending");
          observer.observe(element);
        }
      });
      reducedMotion.addEventListener("change", (event) => {
        if (!event.matches) return;
        observer.disconnect();
        elements.forEach((element) => element.classList.remove("reveal-pending"));
      });
    } catch {
      if (observer) observer.disconnect();
      elements.forEach((element) => element.classList.remove("reveal-pending"));
    }
  }

  initializeTheme();
  initializeNavigation();
  initializePublications();
  initializeCopyEmail();
  initializeContactForm();
  initializeScrollState();
  document.getElementById("current-year").textContent = new Date().getFullYear();
  initializeReveal();
})();
