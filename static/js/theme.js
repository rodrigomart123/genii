(function () {
  function applyTheme(theme) {
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.style.backgroundColor = "#121212";
    } else {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.style.backgroundColor = "#f7f9fa";
    }
  }
  const currentTheme = localStorage.getItem("genii_theme") || "system";
  applyTheme(currentTheme);
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      const theme = localStorage.getItem("genii_theme") || "system";
      if (theme === "system") {
        applyTheme("system");
      }
    });
  const style = document.createElement("style");
  style.textContent = `
        html {
            background-color: var(--bg-light, var(--light-blue-bg, var(--surface, #f7f9fa)));
        }
        html[data-theme="dark"] {
            background-color: var(--bg-light, var(--light-blue-bg, var(--surface, #121212)));
        }
    `;
  document.head.appendChild(style);
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      window.location.reload();
    }
  });
})();
