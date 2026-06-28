const fontLink = document.createElement("link");
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Nunito:wght@400;600;700;800&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);
localStorage.removeItem("theme");
document.body.classList.remove("dark-mode");
const CACHE_KEY = "genii_user_cache";
const CACHE_TTL = 5 * 60 * 1000;
function getCachedUser() {
  const cached = localStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : null;
}
function saveUserToCache(userData) {
  if (userData) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...userData, _cacheTimestamp: Date.now() }));
  }
}
function isCacheFresh(cachedUser) {
  if (!cachedUser || !cachedUser._cacheTimestamp) return false;
  return (Date.now() - cachedUser._cacheTimestamp) < CACHE_TTL;
}
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.body.classList.add("loaded");
    document.body.style.opacity = "1";
  }, 50);
});
document.addEventListener("click", (e) => {
  if (!e.target || typeof e.target.closest !== "function") return;
  const link = e.target.closest("a");
  if (link && link.href.includes(window.location.origin) && !link.target) {
    e.preventDefault();
    const targetUrl = link.href;
    document.body.style.opacity = "0";
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 300);
  }
});
(function initLinkPrefetch() {
  const prefetchedUrls = new Set();
  const origin = window.location.origin;
  function prefetchUrl(url) {
    if (prefetchedUrls.has(url)) return;
    prefetchedUrls.add(url);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    link.as = "document";
    document.head.appendChild(link);
  }
  document.addEventListener(
    "mouseenter",
    (e) => {
      if (!e.target || !e.target.closest) return;
      const anchor = e.target.closest("a");
      if (!anchor) return;
      const href = anchor.href;
      if (!href) return;
      if (!href.includes(origin)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (href === window.location.href) return;
      prefetchUrl(href);
    },
    true,
  );
  document.addEventListener(
    "touchstart",
    (e) => {
      const anchor = e.target.closest("a");
      if (!anchor || !anchor.href || !anchor.href.includes(origin)) return;
      if (anchor.target && anchor.target !== "_self") return;
      prefetchUrl(anchor.href);
    },
    { passive: true, capture: true },
  );
})();
export function renderLayout(activePage, userData = {}) {
  renderSidebar(activePage);
  renderUserHeader(userData);
}
function renderSidebar(activePage) {
  const sidebarContainer = document.getElementById("sidebar-container");
  if (!sidebarContainer) return;
  const colors = {
    teal: "#00cfc1",
    purple: "#a270f4",
    darkPurple: "#5649b8",
    gold: "#FFCE00",
    text: "#2d3436",
    textLight: "#636e72",
    bgHover: "#E0F7FA",
  };
  const styles = `
        <style>
            :root {
                --genii-sidebar-bg: var(--surface, white);
                --genii-sidebar-border: var(--border, #E5E7EB);
                --genii-sidebar-text: var(--dark, #2d3436);
                --genii-sidebar-text-muted: var(--grey, #636e72);
                --genii-sidebar-hover: #F0F2F5;
                --genii-sidebar-active: #E0F7FA;
                --genii-sidebar-active-border: #B2EBF2;
                --genii-drop-border: #F0F4F8;
            }
            [data-theme="dark"] {
                --genii-sidebar-bg: #222222;
                --genii-sidebar-border: #444444;
                --genii-sidebar-text: #ffffff;
                --genii-sidebar-text-muted: #b0b0b0;
                --genii-sidebar-hover: #1a1a1a;
                --genii-sidebar-active: #2a2a2a;
                --genii-sidebar-active-border: #444444;
                --genii-drop-border: #444444;
            }
            .genii-sidebar {
                font-family: 'Nunito', sans-serif;
                background: var(--genii-sidebar-bg);
                border-right: 2px solid var(--genii-sidebar-border);
                padding: 24px 16px;
                display: flex; flex-direction: column;
                height: 100vh; position: fixed; left: 0; top: 0; width: 260px; z-index: 100;
            }
            .genii-logo {
                font-family: 'Fredoka', sans-serif; font-size: 2.2rem; font-weight: 800;
                color: var(--primary, ${colors.teal}); text-decoration: none; margin-bottom: 30px;
                padding-left: 12px; display: flex; align-items: center; gap: 5px;
            }
            .genii-logo span { color: var(--purple, ${colors.purple}); }
            .genii-nav-item {
                display: flex; align-items: center; gap: 16px; padding: 12px 20px;
                margin-bottom: 8px; border-radius: 16px; color: var(--genii-sidebar-text-muted);
                font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
                text-decoration: none; transition: all 0.2s; border: 2px solid transparent; font-size: 0.9rem;
            }
            .genii-nav-item:hover {
                background-color: var(--genii-sidebar-hover); color: var(--genii-sidebar-text);
                border-color: var(--genii-sidebar-border); transform: translateX(4px);
            }
            .genii-nav-item.active {
                background-color: var(--genii-sidebar-active); color: var(--primary, ${colors.teal});
                border-color: var(--genii-sidebar-active-border); font-weight: 800;
            }
            .genii-help {
                margin-top: auto; padding: 16px; border-radius: 16px;
                color: var(--genii-sidebar-text-muted); font-weight: 700; cursor: pointer;
                transition: 0.2s; display: flex; align-items: center; gap: 10px; font-family: 'Nunito', sans-serif;
            }
            .genii-help:hover { color: var(--primary, ${colors.teal}); background: var(--genii-sidebar-active); }
            .blooket-widget {
                background-color: var(--purple, ${colors.purple});
                border-radius: 12px;
                display: flex; align-items: center;
                padding: 5px; padding-right: 15px;
                gap: 12px;
                cursor: pointer;
                box-shadow: 0 4px 0 var(--purple-dark, ${colors.darkPurple});
                transition: all 0.2s;
                position: fixed; top: 20px; right: 30px; z-index: 1000;
                font-family: 'Nunito', sans-serif; color: white;
            }
            .blooket-widget:hover { transform: translateY(2px); box-shadow: 0 2px 0 var(--purple-dark, ${colors.darkPurple}); }
            .blooket-widget:active { transform: translateY(4px); box-shadow: none; }
            .b-avatar-box {
                width: 42px; height: 42px;
                background-color: var(--genii-sidebar-bg);
                border-radius: 8px;
                overflow: hidden;
                position: relative;
                flex-shrink: 0;
            }
            .b-avatar-box img, .widget-photo {
                width: 100%; height: 100%; object-fit: contain; position: absolute; top: 0; left: 0;
            }
            .widget-photo { object-fit: cover; }
            .b-info { display: flex; align-items: center; gap: 8px; }
            .b-username {
                font-weight: 800; font-size: 1.1rem; letter-spacing: 0.3px;
                max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                color: white;
            }
            .b-arrow { font-size: 0.9rem; opacity: 0.8; color: white; }
            .genii-dropdown {
                position: absolute; top: 120%; right: 0;
                background: var(--genii-sidebar-bg); width: 200px;
                border-radius: 12px; padding: 8px;
                display: none; flex-direction: column; gap: 5px;
                border: 2px solid var(--genii-drop-border);
            }
            .genii-dropdown.show { display: flex; animation: slideDown 0.2s ease; }
            .g-drop-item {
                padding: 10px 15px; border-radius: 8px; color: var(--genii-sidebar-text);
                font-weight: 700; text-decoration: none; font-size: 0.95rem;
                display: flex; align-items: center; gap: 10px; transition: 0.2s; cursor: pointer;
            }
            .g-drop-item:hover { background: var(--genii-sidebar-hover); color: var(--purple, ${colors.purple}); }
            .g-drop-item.logout:hover { background: rgba(255, 107, 107, 0.1); color: var(--coral, #FF6B6B); }
            @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            .genii-mobile-header {
                display: none;
                position: fixed; top: 0; left: 0; right: 0;
                height: 60px; z-index: 200;
                background: var(--genii-sidebar-bg);
                border-bottom: 2px solid var(--genii-sidebar-border);
                align-items: center; justify-content: space-between;
                padding: 0 16px;
                font-family: 'Nunito', sans-serif;
            }
            .genii-mobile-header .mobile-left {
                display: flex; align-items: center; gap: 12px;
            }
            .genii-hamburger {
                width: 42px; height: 42px; border-radius: 12px;
                background: transparent; border: 2px solid var(--genii-sidebar-border);
                color: var(--genii-sidebar-text); font-size: 1.2rem;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.2s;
            }
            .genii-hamburger:hover { background: var(--genii-sidebar-hover); }
            .genii-hamburger:active { transform: scale(0.95); }
            .genii-mobile-logo {
                font-family: 'Fredoka', sans-serif; font-size: 1.5rem; font-weight: 800;
                color: var(--primary, ${colors.teal}); text-decoration: none;
                display: flex; align-items: center; gap: 4px;
            }
            .genii-mobile-widget {
                display: flex; align-items: center; gap: 8px;
                cursor: pointer; position: relative;
            }
            .genii-mobile-widget .b-avatar-box { width: 36px; height: 36px; border-radius: 10px; }
            .genii-mobile-widget .b-arrow { font-size: 0.8rem; color: var(--genii-sidebar-text-muted); }
            .genii-sidebar-backdrop {
                display: none;
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.5);
                z-index: 99;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .genii-sidebar-backdrop.show {
                opacity: 1;
            }
            @media (max-width: 900px) {
                .genii-mobile-header { display: flex; }
                .genii-sidebar {
                    transform: translateX(-100%);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 150;
                    width: 100%;
                    padding-top: 80px;
                    padding-left: 24px;
                    padding-right: 24px;
                }
                .genii-sidebar.open {
                    transform: translateX(0);
                }
                .genii-sidebar-backdrop {
                    display: none;
                }
                .genii-sidebar-backdrop.show {
                    display: block;
                }
                .blooket-widget {
                    display: none !important;
                }
                .main-content {
                    margin-left: 0 !important;
                    padding-top: 76px !important;
                }
                .main-content.has-banner {
                    padding-top: 0 !important;
                }
                .main-content.has-banner .profile-banner {
                    margin-top: 60px;
                }
            }
            .widget-credits {
                display: none; align-items: center; gap: 5px;
                font-weight: 800; font-size: 0.95rem; color: white;
                padding-left: 10px; margin-left: 4px;
                border-left: 2px solid rgba(255,255,255,0.3);
                white-space: nowrap;
            }
            body[data-page="studio"] .widget-credits { display: flex; }
            .widget-credits img { width: 18px; height: 18px; }
            .widget-credits.empty { color: var(--coral, #ff6b6b); }
            .mobile-credits {
                display: none; align-items: center; gap: 4px;
                font-weight: 800; font-size: 0.85rem; color: var(--purple, #a270f4);
                margin-right: 6px;
            }
            body[data-page="studio"] .mobile-credits { display: flex; }
            .mobile-credits img { width: 16px; height: 16px; }
            .mobile-credits.empty { color: var(--coral, #ff6b6b); }
            @keyframes creditsPulse {
                0% { transform: scale(1); }
                30% { transform: scale(1.25); filter: brightness(1.3); }
                100% { transform: scale(1); filter: brightness(1); }
            }
            .credits-spending { animation: creditsPulse 0.35s ease; }
        </style>
    `;
  sidebarContainer.innerHTML = `
    ${styles}
    <div class="genii-mobile-header">
        <div class="mobile-left">
            <button class="genii-hamburger" id="geniiHamburger" aria-label="Menu">
                <i class="fa-solid fa-bars"></i>
            </button>
        </div>
        <div class="genii-mobile-widget" id="geniiMobileWidget">
            <div class="mobile-credits" id="mobileCredits"><img src="static/img/icons/credit.png" alt="cr"/><span id="mobile-credits-count">100</span></div>
            <div class="b-avatar-box" id="geniiMobileAvatar"></div>
            <i class="fa-solid fa-caret-down b-arrow"></i>
            <div class="genii-dropdown" id="geniiMobileDropdown">
                <div class="g-drop-item" onclick="window.location.href='settings.html'"><img width="28" height="28" src="static/img/icons/gear.png" alt="gear"/> Definições</div>
                <div class="g-drop-item logout" id="geniiMobileLogout"><img width="28" height="28" src="static/img/icons/exit.png" alt="exit"/> Sair</div>
            </div>
        </div>
    </div>
    <div class="genii-sidebar-backdrop" id="geniiSidebarBackdrop"></div>
    <aside class="genii-sidebar" id="geniiSidebar">
        <a href="join.html" class="genii-logo">
            Genii
            <i class="fa-solid fa-crown" style="font-size: 1.2rem; color: ${colors.gold}; margin-left: 2px; transform: rotate(15deg);"></i>
        </a>
        <nav class="genii-menu">
            <a href="join.html" class="genii-nav-item ${activePage === "join" ? "active" : ""}"><img width="36" height="36" src="static/img/icons/home.png" alt="home"/> Início</a>
            <a href="my_profile.html" class="genii-nav-item ${activePage === "profile" ? "active" : ""}"><img width="36" height="36" src="static/img/icons/test-account.png" alt="test-account"/> Perfil</a>
            <a href="classes.html" class="genii-nav-item ${activePage === "classes" ? "active" : ""}"><img width="36" height="36" src="static/img/icons/school.png" alt="classes"/> Turmas</a>
            <a href="discover.html" class="genii-nav-item ${activePage === "discover" ? "active" : ""}"><img width="36" height="36" src="static/img/icons/compass.png" alt="compass"/> Descobrir</a>
            <a href="my_sets.html" class="genii-nav-item ${activePage === "my_sets" ? "active" : ""}"><img width="36" height="36" src="static/img/icons/courses.png" alt="library"/> Biblioteca</a>
            <a href="favorites.html" class="genii-nav-item ${activePage === "favorites" ? "active" : ""}"><img width="36" height="36" src="static/img/icons/star.png" alt="star"/> Favoritos</a>
        </nav>
        <div class="genii-help" onclick="alert('Ajuda em breve!')"><img width="36" height="36" src="static/img/icons/help.png" alt="help"/><span>Ajuda</span></div>
    </aside>
    `;
  const hamburger = document.getElementById("geniiHamburger");
  const sidebar = document.getElementById("geniiSidebar");
  const backdrop = document.getElementById("geniiSidebarBackdrop");
  const mobileWidget = document.getElementById("geniiMobileWidget");
  const mobileDropdown = document.getElementById("geniiMobileDropdown");
  const mobileLogout = document.getElementById("geniiMobileLogout");
  function openSidebar() {
    sidebar.classList.add("open");
    backdrop.classList.add("show");
    document.body.style.overflow = "hidden";
    hamburger.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  }
  function closeSidebar() {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
    document.body.style.overflow = "";
    hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
  }
  if (hamburger) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (sidebar.classList.contains("open")) closeSidebar();
      else openSidebar();
    });
  }
  if (backdrop) {
    backdrop.addEventListener("click", closeSidebar);
  }
  if (sidebar) {
    sidebar.querySelectorAll(".genii-nav-item").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 900) closeSidebar();
      });
    });
  }
  if (mobileWidget) {
    mobileWidget.addEventListener("click", (e) => {
      e.stopPropagation();
      mobileDropdown.classList.toggle("show");
    });
  }
  document.addEventListener("click", () => {
    if (mobileDropdown && mobileDropdown.classList.contains("show"))
      mobileDropdown.classList.remove("show");
  });
  if (mobileLogout) {
    mobileLogout.addEventListener("click", () => {
      document.dispatchEvent(new Event("app-logout"));
    });
  }
  import("./credits.js").then(({ refreshCredits }) => {
    refreshCredits();
  }).catch(() => {});
}
function renderUserHeader(data) {
  if (!data || Object.keys(data).length === 0) {
    const cached = getCachedUser();
    if (cached) data = cached;
  }
  let headerContainer = document.getElementById("user-header-container");
  if (!headerContainer) {
    headerContainer = document.createElement("div");
    headerContainer.id = "user-header-container";
    document.body.appendChild(headerContainer);
  }
  const name = data.displayName || data.username || "Utilizador";
  let avatarHTML = "";
  if (data.avatarRenderUrl) {
    avatarHTML = `<img src="${data.avatarRenderUrl}" alt="Avatar" class="widget-photo" style="object-fit:contain;object-position:center 35%;">`;
  } else if (data.profileType === "photo" && data.customPhotoUrl) {
    avatarHTML = `<img src="${data.customPhotoUrl}" alt="Avatar" class="widget-photo">`;
  } else {
    const skin = data.avatar?.skin || "001";
    const face = data.avatar?.face || "001";
    const hat = data.avatar?.hat || "none";
    avatarHTML = _buildAvatarLayers(skin, face, hat, "static/img/avatareditor");
  }
  headerContainer.innerHTML = `
        <div class="blooket-widget" id="userWidgetBtn">
            <div class="b-avatar-box">
                ${avatarHTML}
            </div>
            <div class="b-info">
                <span class="b-username">${name}</span>
                <div class="widget-credits" id="widgetCredits"><img src="static/img/icons/credit.png" alt="cr"/><span id="widget-credits-count">100</span></div>
                <i class="fa-solid fa-caret-down b-arrow"></i>
            </div>
            <div class="genii-dropdown" id="userDropdown">
                <div class="g-drop-item" onclick="window.location.href='settings.html'"><img width="36" height="36" src="static/img/icons/gear.png" alt="gear"/> Definições</div>
                <div class="g-drop-item logout" id="actionLogout"><img width="36" height="36" src="static/img/icons/exit.png" alt="exit"/> Sair</div>
            </div>
        </div>
    `;
  const mobileAvatarBox = document.getElementById("geniiMobileAvatar");
  if (mobileAvatarBox) {
    mobileAvatarBox.innerHTML = avatarHTML;
  }
  const widgetBtn = document.getElementById("userWidgetBtn");
  const dropdown = document.getElementById("userDropdown");
  const logoutBtn = document.getElementById("actionLogout");
  if (widgetBtn) {
    widgetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });
  }
  document.addEventListener("click", () => {
    if (dropdown && dropdown.classList.contains("show"))
      dropdown.classList.remove("show");
  });
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      document.dispatchEvent(new Event("app-logout"));
    });
  }
}
window.showGeniiToast = function (message, type = "success") {
  const existingToast = document.getElementById("genii-toast");
  if (existingToast) {
    if (existingToast._hide) existingToast._hide();
    else existingToast.remove();
  }
  const toast = document.createElement("div");
  toast.id = "genii-toast";
  let hideTimeout = null;
  let isHidden = false;
  const colorMap = { success: "#00cfc1", error: "#ff6b6b", ai: "#a270f4" };
  const iconMap = {
    success: "fa-check-circle",
    error: "fa-circle-exclamation",
    ai: "fa-wand-magic-sparkles",
  };
  const bgColor = colorMap[type] || colorMap.success;
  const icon = iconMap[type] || iconMap.success;
  toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-120%);
        background-color: ${bgColor};
        color: white;
        padding: 16px 28px;
        border-radius: 16px;
        font-family: 'Nunito', sans-serif;
        font-weight: 700;
        font-size: 1.05rem;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        max-width: 90vw;
        opacity: 0;
        transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        cursor: pointer;
        user-select: none;
        touch-action: none;
        text-align: center;
        justify-content: center;
    `;
  toast.innerHTML = `
        <i class="fa-solid ${icon}" style="flex-shrink:0;"></i>
        <span>${message}</span>
    `;
  document.body.appendChild(toast);
  const show = () => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  };
  const hide = () => {
    if (isHidden) return;
    isHidden = true;
    clearTimeout(hideTimeout);
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-120%)";
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
  };
  toast._hide = hide;
  requestAnimationFrame(show);
  hideTimeout = setTimeout(hide, 3500);
  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  let wasSwiped = false;
  const onStart = (y) => {
    if (isHidden) return;
    startY = y;
    currentY = y;
    isDragging = true;
    wasSwiped = false;
    toast.style.transition = "none";
    clearTimeout(hideTimeout);
  };
  const onMove = (y) => {
    if (!isDragging || isHidden) return;
    currentY = y;
    const dy = currentY - startY;
    if (dy < 0) {
      toast.style.opacity = `${Math.max(0, 1 + dy / 150)}`;
      toast.style.transform = `translateX(-50%) translateY(${dy}px)`;
    }
  };
  const onEnd = () => {
    if (!isDragging || isHidden) return;
    isDragging = false;
    const dy = currentY - startY;
    toast.style.transition = "opacity 0.25s ease, transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    if (dy < -60) {
      wasSwiped = true;
      hide();
    } else {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
      hideTimeout = setTimeout(hide, 3500);
    }
    startY = 0; currentY = 0;
  };
  toast.addEventListener("touchstart", (e) => { onStart(e.touches[0].clientY); }, { passive: true });
  toast.addEventListener("touchmove", (e) => { onMove(e.touches[0].clientY); }, { passive: true });
  toast.addEventListener("touchend", () => { onEnd(); }, { passive: true });
  toast.addEventListener("touchcancel", () => { onEnd(); }, { passive: true });
  toast.addEventListener("mousedown", (e) => { if (e.button === 0) onStart(e.clientY); });
  document.addEventListener("mousemove", (e) => { onMove(e.clientY); });
  document.addEventListener("mouseup", () => {
    onEnd();
    document.removeEventListener("mousemove", onMove);
  }, { once: true });
  toast.addEventListener("click", (e) => {
    if (wasSwiped) { wasSwiped = false; return; }
    hide();
  });
};
window.showGeniiConfirm = function (message, onConfirmCallback) {
  const existingModal = document.getElementById("genii-confirm-overlay");
  if (existingModal) {
    existingModal.remove();
  }
  const overlay = document.createElement("div");
  overlay.id = "genii-confirm-overlay";
  overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
        font-family: 'Nunito', sans-serif;
    `;
  const modal = document.createElement("div");
  modal.style.cssText = `
        background: var(--surface, white);
        padding: 30px 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        transform: scale(0.8);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border: 1px solid var(--border-dark, transparent);
    `;
  const messageEl = document.createElement("h3");
  messageEl.style.cssText = `
        font-family: 'Fredoka', sans-serif;
        color: var(--dark, #2d3436);
        font-size: 1.4rem;
        margin-bottom: 25px;
        margin-top: 0;
    `;
  messageEl.innerText = message;
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = `
        display: flex;
        gap: 15px;
        justify-content: center;
    `;
  const btnCancel = document.createElement("button");
  btnCancel.innerText = "Cancelar";
  btnCancel.style.cssText = `
        background: var(--bg-light, #E5E7EB);
        color: var(--dark, #4B5563);
        border: none;
        padding: 12px 24px;
        border-radius: 12px;
        font-family: 'Fredoka', sans-serif;
        font-size: 1.1rem;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 0 var(--border, #D1D5DB);
    `;
  btnCancel.onmouseover = () => {
    btnCancel.style.transform = "translateY(2px)";
    btnCancel.style.boxShadow = "0 2px 0 var(--border, #D1D5DB)";
  };
  btnCancel.onmouseout = () => {
    btnCancel.style.transform = "translateY(0)";
    btnCancel.style.boxShadow = "0 4px 0 var(--border, #D1D5DB)";
  };
  btnCancel.onclick = () => {
    overlay.style.opacity = "0";
    modal.style.transform = "scale(0.8)";
    setTimeout(() => {
      overlay.remove();
      if (onConfirmCallback) onConfirmCallback(false);
    }, 200);
  };
  const btnConfirm = document.createElement("button");
  btnConfirm.innerText = "Confirmar";
  btnConfirm.style.cssText = `
        background: var(--coral, #ff6b6b);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 12px;
        font-family: 'Nunito', sans-serif;
        font-weight: 800;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 0 var(--coral-dark, #d44343);
    `;
  btnConfirm.onmouseover = () => {
    btnConfirm.style.transform = "translateY(2px)";
    btnConfirm.style.boxShadow = "0 2px 0 var(--coral-dark, #d44343)";
  };
  btnConfirm.onmouseout = () => {
    btnConfirm.style.transform = "translateY(0)";
    btnConfirm.style.boxShadow = "0 4px 0 var(--coral-dark, #d44343)";
  };
  btnConfirm.onclick = () => {
    overlay.style.opacity = "0";
    modal.style.transform = "scale(0.8)";
    setTimeout(() => {
      overlay.remove();
      if (onConfirmCallback) onConfirmCallback(true);
    }, 200);
  };
  btnContainer.appendChild(btnCancel);
  btnContainer.appendChild(btnConfirm);
  modal.appendChild(messageEl);
  modal.appendChild(btnContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    modal.style.transform = "scale(1)";
  });
};
function _buildAvatarLayers(skin, face, hat, basePath) {
  const layerStyle = `position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;`;
  const hasHat = hat && hat !== "none";
  const innerScale = hasHat
    ? "transform:scale(0.75);transform-origin:center 58%;"
    : "transform:scale(0.88);transform-origin:center center;";
  let imgs = `
        <img src="${basePath}/skins/${skin}.png" style="${layerStyle}z-index:1;" onerror="this.style.display='none'">
        <img src="${basePath}/faces/${face}.png" style="${layerStyle}z-index:2;" onerror="this.style.display='none'">
    `;
  if (hasHat) {
    imgs += `<img src="${basePath}/hats/${hat}.png" style="${layerStyle}z-index:3;" onerror="this.style.display='none'">`;
  }
  return `<div style="position:absolute;inset:0;${innerScale}">${imgs}</div>`;
}
window.renderAvatarToCanvas = function (skin, face, hat, basePath) {
  return new Promise((resolve, reject) => {
    const skinImg = new Image();
    const faceImg = new Image();
    const hatImg = hat && hat !== "none" ? new Image() : null;
    let loaded = 0;
    const total = (hatImg ? 3 : 2);
    let iw, ih;
    function onLoad() {
      loaded++;
      if (loaded === total) {
        const MAX = 400;
        let W, H;
        if (iw > ih) { W = MAX; H = Math.round(MAX * ih / iw); }
        else { H = MAX; W = Math.round(MAX * iw / ih); }
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas 2D not supported")); return; }
        ctx.drawImage(skinImg, 0, 0, W, H);
        ctx.drawImage(faceImg, 0, 0, W, H);
        if (hatImg) ctx.drawImage(hatImg, 0, 0, W, H);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        }, "image/png");
      }
    }
    skinImg.onload = () => { iw = skinImg.naturalWidth; ih = skinImg.naturalHeight; onLoad(); };
    skinImg.onerror = () => reject(new Error("Failed to load skin"));
    skinImg.src = `${basePath}/skins/${skin}.png`;
    faceImg.onload = onLoad;
    faceImg.onerror = () => reject(new Error("Failed to load face"));
    faceImg.src = `${basePath}/faces/${face}.png`;
    if (hatImg) {
      hatImg.onload = onLoad;
      hatImg.onerror = () => reject(new Error("Failed to load hat"));
      hatImg.src = `${basePath}/hats/${hat}.png`;
    }
  });
};
window.renderGeniiAvatar = function (userData, size = "50px") {
  if (!userData) userData = {};
  const sizeNum = parseInt(size) || 50;
  const containerStyle = `width:${size};height:${size};border-radius:${sizeNum <= 50 ? "12px" : "16px"};flex-shrink:0;position:relative;overflow:hidden;`;
  if (userData.avatarRenderUrl) {
    const name = userData.displayName || userData.name || userData.nickname || "G";
    const initial = name.charAt(0).toUpperCase();
    const fallbackStyle = `${containerStyle}background:linear-gradient(135deg,#a270f4,#00cfc1);display:flex;align-items:center;justify-content:center;color:white;font-family:Fredoka,sans-serif;font-weight:700;font-size:${Math.round(sizeNum * 0.44)}px;`;
    return `<div style="${containerStyle}background:transparent;"><img src="${userData.avatarRenderUrl}" alt="${initial}" style="width:100%;height:100%;object-fit:contain;object-position:center 35%;" onerror="this.parentElement.outerHTML='<div style=\\'${fallbackStyle}\\'>${initial}</div>'"></div>`;
  }
  const photoUrl =
    userData.customPhotoUrl ||
    userData.photoURL ||
    userData.photo ||
    userData.photoUrl ||
    "";
  const hasCustomAvatar =
    userData.avatar &&
    typeof userData.avatar === "object" &&
    (userData.avatar.skin || userData.avatar.face);
  const isPhoto =
    (userData.profileType === "photo" && photoUrl) ||
    (!hasCustomAvatar &&
      userData.profileType !== "avatar" &&
      typeof photoUrl === "string" &&
      photoUrl.startsWith("http"));
  if (isPhoto) {
    const url = userData.customPhotoUrl || photoUrl;
    const name =
      userData.displayName || userData.name || userData.nickname || "G";
    const initial = name.charAt(0).toUpperCase();
    const fallbackStyle = `${containerStyle}background:linear-gradient(135deg,#a270f4,#00cfc1);display:flex;align-items:center;justify-content:center;color:white;font-family:Fredoka,sans-serif;font-weight:700;font-size:${Math.round(sizeNum * 0.44)}px;`;
    return `<div style="${containerStyle}background:#E0F7FA;"><img src="${url}" alt="${initial}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.outerHTML='<div style=\\'${fallbackStyle}\\'>${initial}</div>'"></div>`;
  }
  const avatar = userData.avatar || {};
  if (typeof avatar === "object" && (avatar.skin || avatar.face)) {
    const skin = avatar.skin || "001";
    const face = avatar.face || "001";
    const hat = avatar.hat || "none";
    const basePath = "/static/img/avatareditor";
    const layers = _buildAvatarLayers(skin, face, hat, basePath);
    return `<div style="${containerStyle}background:transparent;border:2px solid rgba(108,92,231,0.15);">${layers}</div>`;
  }
  if (typeof avatar === "string" && avatar.length > 0) {
    if (avatar.startsWith("http")) {
      return `<div style="${containerStyle}background:#E0F7FA;"><img src="${avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"></div>`;
    }
    const layers = _buildAvatarLayers(
      avatar,
      "001",
      "none",
      "/static/img/avatareditor",
    );
    return `<div style="${containerStyle}background:transparent;border:2px solid rgba(108,92,231,0.15);">${layers}</div>`;
  }
  const name =
    userData.displayName || userData.name || userData.nickname || "G";
  const initial = name.charAt(0).toUpperCase();
  const gradients = [
    "linear-gradient(135deg, #a270f4, #b794f4)",
    "linear-gradient(135deg, #00cfc1, #55efc4)",
    "linear-gradient(135deg, #FF4757, #ff6b81)",
    "linear-gradient(135deg, #FFA502, #ffeaa7)",
    "linear-gradient(135deg, #9B59B6, #be9fe1)",
  ];
  const gradientIdx = name.charCodeAt(0) % gradients.length;
  return `<div style="${containerStyle}background:${gradients[gradientIdx]};display:flex;align-items:center;justify-content:center;color:white;font-family:'Fredoka',sans-serif;font-weight:700;font-size:${Math.round(sizeNum * 0.44)}px;">${initial}</div>`;
};
window.uploadToCloudinary = async function (file, token, folder = 'genii_uploads') {
    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ image: base64, folder })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || 'Falha no upload');
    }
    const data = await res.json();
    return { url: data.url, publicId: data.publicId };
};
window.deleteFromCloudinary = async function (publicId, token) {
    const res = await fetch('/api/delete-image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ publicId })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || 'Falha ao apagar');
    }
    return true;
};
export { getCachedUser, saveUserToCache, isCacheFresh, CACHE_TTL };
