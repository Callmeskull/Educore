// EDUCORE — Fixed app.js
// Google Identity Services + scripted chatbot
// All fake 2FA and email/password systems removed.

// ----------------------------------
// GOOGLE OAUTH CONFIGURATION
// ----------------------------------

const GOOGLE_CLIENT_ID = "492142189028-ga4vo4h73vj6lgpjnfl1rge1j8g44vj1.apps.googleusercontent.com"; // Google OAuth Client ID

const USERS_KEY = "educore-users";
const SESSION_KEY = "educore-session";

// Default Google account shown before anyone signs in.
const DEFAULT_GOOGLE_ACCOUNT = {
  name: "Skull",
  email: "skullblaster80888@gmail.com",
  provider: "google"
};

// ----------------------------------
// DOM ELEMENTS
// ----------------------------------

const openAuthBtn = document.getElementById("openAuthBtn");
const authBtnLabel = document.getElementById("authBtnLabel");
const profileAvatar = document.getElementById("profileAvatar");
const authModal = document.getElementById("authModal");
const closeAuthModal = document.getElementById("closeAuthBtn");

const signedInPanel = document.getElementById("signedInPanel");
const authChoicePanel = document.getElementById("authChoicePanel");
const googleModal = document.getElementById("googleModal");
const closeGoogleModal = document.getElementById("closeGoogleModal");

const summaryAvatar = document.getElementById("summaryAvatar");
const summaryName = document.getElementById("summaryName");
const summaryEmail = document.getElementById("summaryEmail");
const summaryProvider = document.getElementById("summaryProvider");
const logoutBtn = document.getElementById("logoutBtn");

const googleContinueBtn = document.getElementById("googleContinueBtn");
const googleRenderedBtn = document.getElementById("googleRenderedBtn");
const googleOneTap = document.getElementById("googleOneTap");
const googleOneTapAvatar = document.getElementById("googleOneTapAvatar");
const googleOneTapText = document.getElementById("googleOneTapText");
const googleOneTapContinue = document.getElementById("googleOneTapContinue");

// ----------------------------------
// USER SESSION (localStorage)
// ----------------------------------

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch (_) {
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (_) {}
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function setSession(user) {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (_) {}
  renderAuthUI();
}

// ----------------------------------
// AUTH UI — update topbar based on sign-in state
// ----------------------------------

function renderAuthUI() {
  const user = getSession();

  if (user) {
    googleOneTap?.classList.remove("show");
    googleOneTap?.setAttribute("aria-hidden", "true");

    const initial = (user.name || user.email || "U").trim()[0].toUpperCase();

    if (authBtnLabel) authBtnLabel.textContent = (user.name || "Account").trim().split(" ")[0];
    if (openAuthBtn) openAuthBtn.classList.add("signed-in");

    if (profileAvatar) {
      profileAvatar.title = `${user.name} (${user.email})`;
      if (user.picture) {
        profileAvatar.innerHTML = `<img src="${user.picture}" alt="${user.name}">`;
      } else {
        profileAvatar.textContent = initial;
      }
    }

    if (summaryAvatar) {
      if (user.picture) {
        summaryAvatar.innerHTML = `<img src="${user.picture}" alt="${user.name}">`;
      } else {
        summaryAvatar.textContent = initial;
      }
    }
    if (summaryName) summaryName.textContent = user.name || user.email;
    if (summaryEmail) summaryEmail.textContent = user.email;
    if (summaryProvider) {
      summaryProvider.textContent = "GOOGLE CONNECTED";
    }
  } else {
    if (authBtnLabel) authBtnLabel.textContent = "Sign in";
    if (openAuthBtn) openAuthBtn.classList.remove("signed-in");
    if (profileAvatar) {
      profileAvatar.textContent = "S";
      profileAvatar.title = "Guest";
    }
  }
}

// ----------------------------------
// GOOGLE ONE TAP — appears top-right after 2s
// ----------------------------------

function showOneTap() {
  if (getSession()) return;
  try {
    if (sessionStorage.getItem("educore-onetap-dismissed") === "1") return;
  } catch (_) {}

  const account = getOneTapAccount();

  if (googleOneTapAvatar) {
    googleOneTapAvatar.innerHTML = account.picture
      ? `<img src="${account.picture}" alt="">`
      : `S`;
  }
  if (googleOneTapContinue) {
    googleOneTapContinue.textContent = `Continue as ${(account.name || account.email).split(" ")[0]}`;
  }
  googleOneTap?.classList.add("show");
  googleOneTap?.setAttribute("aria-hidden", "false");
}

function hideOneTap() {
  googleOneTap?.classList.remove("show");
  googleOneTap?.setAttribute("aria-hidden", "true");
}

function getOneTapAccount() {
  const savedGoogleUsers = getUsers().filter(user => user.provider === "google");
  return savedGoogleUsers[0] || DEFAULT_GOOGLE_ACCOUNT;
}

// ----------------------------------
// REAL GOOGLE CREDENTIAL RESPONSE HANDLER
// ----------------------------------

function decodeJwtPayload(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(decodeURIComponent(escape(atob(base64))));
}

function handleGoogleCredentialResponse(response) {
  try {
    const payload = decodeJwtPayload(response.credential);
    const googleUser = {
      name: payload.name || payload.email.split("@")[0],
      email: payload.email,
      picture: payload.picture || "",
      provider: "google"
    };

    const users = getUsers();
    const idx = users.findIndex(u => u.email === googleUser.email);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...googleUser };
    } else {
      users.push(googleUser);
    }
    saveUsers(users);

    setSession(googleUser);
    authModal?.classList.remove("open");
    googleModal?.classList.remove("open");
    hideOneTap();
  } catch (_) {}
}

// Initialize Google SDK and render the sign-in button
window.addEventListener("load", () => {
  if (GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse
    });
    if (googleRenderedBtn) {
      window.google.accounts.id.renderButton(googleRenderedBtn, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: 350,
        text: "continue_with"
      });
      googleContinueBtn?.classList.add("hidden");
    }
  }
});

// Logout
logoutBtn?.addEventListener("click", () => {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  setSession(null);
  authModal?.classList.remove("open");
});

// Open auth modal
function openAuthModal() {
  const user = getSession();
  hideOneTap();
  googleModal?.classList.remove("open");
  authModal?.classList.add("open");

  if (user) {
    if (authChoicePanel) authChoicePanel.hidden = true;
    if (signedInPanel) signedInPanel.hidden = false;
  } else {
    if (authChoicePanel) authChoicePanel.hidden = false;
    if (signedInPanel) signedInPanel.hidden = true;
  }
}

openAuthBtn?.addEventListener("click", openAuthModal);
profileAvatar?.addEventListener("click", openAuthModal);
closeAuthModal?.addEventListener("click", () => authModal?.classList.remove("open"));

authModal?.addEventListener("click", event => {
  if (event.target === authModal) authModal.classList.remove("open");
});

closeGoogleModal?.addEventListener("click", () => googleModal?.classList.remove("open"));

googleModal?.addEventListener("click", event => {
  if (event.target === googleModal) googleModal.classList.remove("open");
});

// Show One Tap after 2 seconds
window.setTimeout(showOneTap, 1600);

// ----------------------------------
// CREDITS MODAL
// ----------------------------------

const creditsModal = document.getElementById("creditsModal");
const openCreditsBtn = document.getElementById("openCreditsBtn");
const openCreditsFooterBtn = document.getElementById("openCreditsFooterBtn");
const closeCreditsModal = document.getElementById("closeCreditsBtn");

function openCredits() {
  creditsModal?.classList.add("open");
}

function closeCredits() {
  creditsModal?.classList.remove("open");
}

openCreditsBtn?.addEventListener("click", openCredits);
openCreditsFooterBtn?.addEventListener("click", openCredits);
closeCreditsModal?.addEventListener("click", closeCredits);

creditsModal?.addEventListener("click", event => {
  if (event.target === creditsModal) closeCredits();
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  authModal?.classList.remove("open");
  googleModal?.classList.remove("open");
  creditsModal?.classList.remove("open");
});

// ----------------------------------
// SCRIPTED CHATBOT + EVERYDAY KNOWLEDGE
// ----------------------------------

const views = document.querySelectorAll(".view");
const navItems = document.querySelectorAll(".nav-item");
const pageName = document.getElementById("pageName");

const SUBJECT_LABELS = {
  maths: "Mathematics",
  science: "Science",
  english: "English"
};

let currentSubject = "maths";

// ----------------------------------
// NAVIGATION + VIEW SWITCHING
// ----------------------------------

function openView(viewName) {
  // Hide all views
  views.forEach(view => {
    view.classList.remove("active");
  });

  // Show the selected view
  const selectedView = document.getElementById(viewName);
  if (selectedView) {
    selectedView.classList.add("active");
  }

  // Update navigation buttons
  navItems.forEach(item => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  // Update page title
  const pageTitles = {
    dashboard: "Overview",
    assistant: "Learning assistant",
    subjects: "Subjects",
    quiz: "Practice & quizzes"
  };

  if (pageName) {
    pageName.textContent = pageTitles[viewName] || "Overview";
  }

  // Switch background based on view
  const backgroundEffects = document.querySelector('.background-effects');
  if (backgroundEffects) {
    // Remove any existing view background class
    backgroundEffects.classList.remove('bg-dashboard', 'bg-assistant', 'bg-subjects', 'bg-quiz');
    
    // Add the appropriate view background class
    if (viewName === 'dashboard') {
      backgroundEffects.classList.add('bg-dashboard');
    } else if (viewName === 'assistant') {
      backgroundEffects.classList.add('bg-assistant');
    } else if (viewName === 'subjects') {
      backgroundEffects.classList.add('bg-subjects');
    } else if (viewName === 'quiz') {
      backgroundEffects.classList.add('bg-quiz');
    } else if (viewName === 'progress') {
      backgroundEffects.classList.add('bg-progress');
    } else if (viewName === 'settings') {
      backgroundEffects.classList.add('bg-settings');
    }
  }

  // Video background: play only while Assistant is active (paused elsewhere)
  const bgVideo = document.getElementById('bgVideo');
  if (bgVideo) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (viewName === 'assistant' && !reduceMotion) {
      bgVideo.classList.add('visible');
      const playPromise = bgVideo.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay blocked or decode error — gradient fallback stays visible
          bgVideo.classList.remove('visible');
        });
      }
    } else {
      bgVideo.classList.remove('visible');
      bgVideo.pause();
    }
  }

  // Load profile data when entering profile view
  if (viewName === 'profile' && typeof loadProfileData === 'function') {
    loadProfileData();
  }
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", event => {
    if (button.tagName === "A") event.preventDefault();
    openView(button.dataset.view);
  });
});

// ----------------------------------
// THEME TOGGLE
// ----------------------------------

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

// Theme settings controls from Settings page
const themeChoiceDark = document.querySelector('button[data-theme-choice="dark"]');
const themeChoiceLight = document.querySelector('button[data-theme-choice="light"]');

// Settings switches
const settingAnimations = document.getElementById("settingAnimations");
const settingReducedMotion = document.getElementById("settingReducedMotion");
const settingShowSuggestions = document.getElementById("settingShowSuggestions");
const settingNotifications = document.getElementById("settingNotifications");

// Reduced motion media query
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function setTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-theme", isLight);

  if (themeIcon) themeIcon.textContent = isLight ? "☾" : "☼";
  if (themeLabel) {
    themeLabel.textContent = isLight ? "Dark appearance" : "Light appearance";
  }

  try {
    localStorage.setItem("educore-theme", theme);
  } catch (_) {}

  // Persist switch states
  try {
    const switches = {
      "educore-animations": settingAnimations?.ariaChecked || "true",
      "educore-reduced-motion": prefersReducedMotion.matches,
      "educore-suggestions": settingShowSuggestions?.ariaChecked || "true",
      "educore-notifications": settingNotifications?.ariaChecked || "true",
    };
    localStorage.setItem("educore-settings", JSON.stringify(switches));
  } catch (_) {}
}

function getSavedTheme() {
  try {
    return localStorage.getItem("educore-theme") || "dark";
  } catch (_) {
    return "dark";
  }
}

function getSavedSettings() {
  try {
    const raw = localStorage.getItem("educore-settings");
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function applySavedSettings() {
  const saved = getSavedSettings();
  if (!saved) return;

  // Animations switch
  if (settingAnimations) {
    const enabled = saved["educore-animations"] !== false;
    settingAnimations.setAttribute("aria-checked", enabled);
    settingAnimations.classList.toggle("active", enabled);
    if (settingAnimations.classList.contains("switch")) {
      settingAnimations.style.background = enabled
        ? "linear-gradient(135deg, var(--purple), var(--purple-mid))"
        : "rgba(255, 255, 255, 0.4)";
      const thumb = settingAnimations.querySelector(".switch-thumb");
      if (thumb) {
        thumb.style.background = enabled ? "white" : "var(--muted)";
        thumb.style.transform = enabled ? "translateX(20px)" : "translateX(0)";
      }
    }
  }

  // Reduced motion
  if (settingReducedMotion) {
    const matches = saved["educore-reduced-motion"] === true;
    settingReducedMotion.setAttribute("aria-checked", matches);
    settingReducedMotion.classList.toggle("active", matches);
    if (prefersReducedMotion.matches !== matches) {
      prefersReducedMotion.matches = matches;
    }
  }

  // Suggestions
  if (settingShowSuggestions) {
    const shown = saved["educore-suggestions"] !== false;
    settingShowSuggestions.setAttribute("aria-checked", shown);
    settingShowSuggestions.classList.toggle("active", shown);
  }

  // Notifications
  if (settingNotifications) {
    const on = saved["educore-notifications"] !== false;
    settingNotifications.setAttribute("aria-checked", on);
    settingNotifications.classList.toggle("active", on);
  }
}

// Initialize theme
let savedTheme = getSavedTheme();
setTheme(savedTheme);

// Apply saved settings
applySavedSettings();

// Set active state on theme choice buttons based on saved preference
if (themeChoiceDark) {
  themeChoiceDark.classList.toggle("active", savedTheme === "dark");
  themeChoiceDark.classList.remove("inactive");
}
if (themeChoiceLight) {
  themeChoiceLight.classList.toggle("active", savedTheme === "light");
  themeChoiceLight.classList.remove("inactive");
}

// Theme toggle
themeToggle?.addEventListener("click", () => {
  const isLight = document.body.classList.contains("light-theme");
  setTheme(isLight ? "dark" : "light");
});

// Settings theme buttons
if (themeChoiceDark) {
  themeChoiceDark.addEventListener("click", () => {
    themeChoiceDark.classList.add("active");
    themeChoiceLight.classList.remove("active");
    setTheme("dark");
    // Update theme toggle icon/label
    if (themeIcon) themeIcon.textContent = "☾";
    if (themeLabel) themeLabel.textContent = "Dark appearance";
  });
}

if (themeChoiceLight) {
  themeChoiceLight.addEventListener("click", () => {
    themeChoiceLight.classList.add("active");
    themeChoiceDark.classList.remove("active");
    setTheme("light");
    // Update theme toggle icon/label
    if (themeIcon) themeIcon.textContent = "☼";
    if (themeLabel) themeLabel.textContent = "Light appearance";
  });
}

// Accent color swatches
document.querySelectorAll(".accent-swatch").forEach(swatch => {
  swatch.addEventListener("click", () => {
    const accent = swatch.dataset.accent;
    document.querySelectorAll(".accent-swatch").forEach(s => s.classList.remove("active"));
    swatch.classList.add("active");
    document.body.dataset.accent = accent;
  });
});

// Settings credits button
const settingsCreditsBtn = document.getElementById("settingsCreditsBtn");
if (settingsCreditsBtn) {
  settingsCreditsBtn.addEventListener("click", () => {
    creditsModal?.classList.add("open");
  });
}

// Profile form handler
const profileForm = document.getElementById("profileForm");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");
const profileBioCount = document.getElementById("profileBioCount");
const profileFormStatus = document.getElementById("profileFormStatus");
const profileResetBtn = document.getElementById("profileResetBtn");

// Load saved profile data on view entry
function loadProfileData() {
  try {
    const saved = JSON.parse(localStorage.getItem("educore-profile") || "{}");
    if (profileDisplayName) profileDisplayName.value = saved.displayName || "";
    if (profileUsername) profileUsername.value = saved.username || "";
    if (profileBio) profileBio.value = saved.bio || "";
    if (profileBioCount) profileBioCount.textContent = (saved.bio || "").length;
  } catch (_) {}
}

// Update bio count on input
if (profileBio) {
  profileBio.addEventListener("input", () => {
    if (profileBioCount) profileBioCount.textContent = profileBio.value.length;
  });
}

// Handle form submission (Save changes)
if (profileForm) {
  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      displayName: profileDisplayName?.value || "",
      username: profileUsername?.value || "",
      bio: profileBio?.value || ""
    };
    try {
      localStorage.setItem("educore-profile", JSON.stringify(data));
      if (profileFormStatus) {
        profileFormStatus.textContent = "Profile saved successfully.";
        profileFormStatus.style.color = "var(--green)";
      }
      // Update the sidebar/profile UI
      const sidebarProfileName = document.getElementById("sidebarProfileName");
      if (sidebarProfileName && data.displayName) {
        sidebarProfileName.textContent = data.displayName;
      }
    } catch (_) {
      if (profileFormStatus) {
        profileFormStatus.textContent = "Failed to save profile.";
        profileFormStatus.style.color = "var(--red)";
      }
    }
  });
}

// Handle reset button
if (profileResetBtn) {
  profileResetBtn.addEventListener("click", () => {
    if (profileDisplayName) profileDisplayName.value = "";
    if (profileUsername) profileUsername.value = "";
    if (profileBio) profileBio.value = "";
    if (profileBioCount) profileBioCount.textContent = "0";
    try {
      localStorage.removeItem("educore-profile");
      if (profileFormStatus) {
        profileFormStatus.textContent = "Profile reset.";
        profileFormStatus.style.color = "var(--muted)";
      }
    } catch (_) {}
  });
}

// Load profile data when entering profile view
const originalOpenView = typeof openView === "function" ? openView : null;

// Settings edit profile button
const settingsEditProfileBtn = document.getElementById("settingsEditProfileBtn");
if (settingsEditProfileBtn) {
  settingsEditProfileBtn.addEventListener("click", () => {
    openView("profile");
  });
}

// Switch event listeners
if (settingAnimations) {
  settingAnimations.addEventListener("click", () => {
    const isActive = settingAnimations.getAttribute("aria-checked") === "false";
    settingAnimations.setAttribute("aria-checked", isActive);
    settingAnimations.classList.toggle("active", isActive);
    settingAnimations.style.background = isActive
      ? "linear-gradient(135deg, var(--purple), var(--purple-mid))"
      : "rgba(255, 255, 255, 0.4)";
    const thumb = settingAnimations.querySelector(".switch-thumb");
    if (thumb) {
      thumb.style.background = isActive ? "white" : "var(--muted)";
      thumb.style.transform = isActive ? "translateX(20px)" : "translateX(0)";
    }
    // Apply no-animations class to body when animations are disabled
    document.body.classList.toggle("no-animations", !isActive);
  });
}

if (settingReducedMotion) {
  settingReducedMotion.addEventListener("click", () => {
    const isActive = settingReducedMotion.getAttribute("aria-checked") === "false";
    settingReducedMotion.setAttribute("aria-checked", isActive);
    settingReducedMotion.classList.toggle("active", isActive);
    // Apply reduced motion via media query state
    if (isActive) {
      document.body.classList.add("reduce-motion");
    } else {
      document.body.classList.remove("reduce-motion");
    }
  });
}

if (settingShowSuggestions) {
  settingShowSuggestions.addEventListener("click", () => {
    const isActive = settingShowSuggestions.getAttribute("aria-checked") === "false";
    settingShowSuggestions.setAttribute("aria-checked", isActive);
    settingShowSuggestions.classList.toggle("active", isActive);
    // Toggle suggestions visibility in chat
    const suggestions = document.getElementById("suggestions");
    if (suggestions) {
      suggestions.style.display = isActive ? "grid" : "none";
    }
  });
}

if (settingNotifications) {
  settingNotifications.addEventListener("click", () => {
    const isActive = settingNotifications.getAttribute("aria-checked") === "false";
    settingNotifications.setAttribute("aria-checked", isActive);
    settingNotifications.classList.toggle("active", isActive);
    // Could integrate with actual notification system
    if (isActive) {
      showSystemMessage("Notifications enabled");
    } else {
      showSystemMessage("Notifications disabled");
    }
  });
}

// System message helper
function showSystemMessage(text) {
  // Simple inline feedback
  const existing = document.querySelector(".system-message");
  if (existing) existing.remove();

  const msg = document.createElement("div");
  msg.className = "system-message";
  msg.textContent = text;
  msg.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    border-radius: 100px;
    background: rgba(121, 228, 176, 0.9);
    color: #05030a;
    font-size: 12px;
    font-weight: 600;
    z-index: 9999;
    animation: fade-in 0.3s ease;
  `;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ----------------------------------
// SCRIPTED CHATBOT RESPONSES
// ----------------------------------

const projectKnowledge = [
  {
    keywords: [
      "who created the game", "who made the game", "game creator",
      "who is skull", "skull", "about the game"
    ],
    answer:
      "The game was created by Skull."
  },
  {
    keywords: [
      "who created educore", "who made educore", "who built educore",
      "who created this website", "who made this website", "who built this website",
      "who developed this website", "who developed educore", "creator of educore",
      "website developer", "site creator", "who made this site", "who built this site",
      "who created this", "who made this", "owner of educore"
    ],
    answer:
      "EDUCORE was built by its core crew — Avinash, Shubham, Shoaib, Uday and Gagan."
  },
  {
    keywords: [
      "credits", "credit", "team", "crew", "contributors", "developers",
      "who works on educore", "who is the team", "avinash", "shubham",
      "shoaib", "uday", "gagan"
    ],
    answer:
      "The EDUCORE credits list five names: Avinash, Shubham, Shoaib, Uday and Gagan. You can open the full Credits panel from the sidebar or the footer."
  },
  {
    keywords: [
      "i built this website", "i made this website", "i built this site",
      "i made this site", "i created this website", "i designed this website"
    ],
    answer:
      "Then big respect — the EDUCORE site credits go to Avinash, Shubham, Shoaib, Uday and Gagan."
  },
  {
    keywords: [
      "who are you", "what are you", "your name", "about you", "about educore",
      "what is educore", "are you a bot", "are you an ai", "are you real",
      "scripted bot", "how do you work"
    ],
    answer:
      "I'm the EDUCORE assistant — a scripted study bot for Class IX Maths, Science and English. I run on predefined responses, so I'm fast and predictable. EDUCORE is built by Avinash, Shubham, Shoaib, Uday and Gagan."
  },
  {
    keywords: [
      "what can you do", "how can you help", "what do you know",
      "what topics", "which topics", "help", "help me", "i need help", "capabilities"
    ],
    answer:
      "I can explain Class IX Maths (polynomials, geometry, mensuration, statistics, probability), Science (matter, atoms, cells, motion, force, gravitation, sound), and English (grammar, tenses, voice, speech, writing). I also handle quick facts like time, date, planets and study tips — plus EDUCORE credits."
  }
];

const commonKnowledge = [
  {
    keywords: ["time", "what time", "clock", "current time"],
    answer: () => {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      return `Current local time on your device is ${now}.`;
    }
  },
  {
    keywords: ["date", "today", "day is it", "what day", "todays date"],
    answer: () => {
      const today = new Date().toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });
      return `Today is ${today}.`;
    }
  },
  {
    keywords: ["planet", "planets", "solar system", "largest planet", "earth", "jupiter", "mars"],
    answer:
      "There are 8 planets in our solar system (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune). Jupiter is the largest, and Earth is the third from the Sun."
  },
  {
    keywords: ["continent", "continents", "ocean", "oceans", "largest ocean"],
    answer:
      "There are 7 continents (Asia, Africa, North America, South America, Antarctica, Europe, Australia) and 5 major oceans (Pacific, Atlantic, Indian, Southern, Arctic). The Pacific is the largest and deepest ocean."
  },
  {
    keywords: ["boiling point", "boil water", "freezing point", "water boils", "melting point of ice"],
    answer:
      "At standard sea-level pressure, pure water boils at 100°C (212°F) and freezes at 0°C (32°F). Ice melts at 0°C as well."
  },
  {
    keywords: ["capital of india", "india capital", "capital city"],
    answer:
      "New Delhi is the capital of India. India has 28 states and 8 union territories."
  },
  {
    keywords: ["how many states", "states in india", "union territories"],
    answer:
      "India has 28 states and 8 union territories. New Delhi is the capital."
  },
  {
    keywords: ["percentage", "percent", "how to calculate percentage"],
    answer:
      "Percentage means 'per hundred'. To find x% of a number, multiply the number by x and divide by 100.\n\nExample: 20% of 250 = (20 × 250) ÷ 100 = 50."
  },
  {
    keywords: ["square root", "square roots", "perfect square"],
    answer:
      "A square root is a number that, multiplied by itself, gives the original number.\n\nExample: √81 = 9 because 9 × 9 = 81. Perfect squares include 1, 4, 9, 16, 25, 36, 49, 64, 81 and 100."
  },
  {
    keywords: ["speed of light", "light speed"],
    answer:
      "Light travels at about 3 × 10⁸ metres per second (roughly 299,792,458 m/s) in a vacuum. That is the fastest speed possible in the universe."
  },
  {
    keywords: ["joke", "tell me a joke", "make me laugh", "funny"],
    answer:
      "Why did the maths book look so sad? Because it had too many problems. ...I'll keep my day job."
  },
  {
    keywords: ["motivate me", "motivation", "give up", "i cant do this", "im tired"],
    answer:
      "You don't need a perfect day — you need one honest step. Pick the smallest useful thing (one formula, one paragraph, five questions), finish it, then decide what's next. Momentum beats mood."
  }
];

const responses = {
  maths: [
    // Polynomials
    {
      keywords: ["polynomial", "polynomials", "degree of a polynomial", "zero of a polynomial"],
      question: "What is a polynomial?",
      answer:
        "A polynomial is an algebraic expression made of variables and coefficients combined using addition, subtraction and non-negative integer powers.\n\nExample: 3x² + 2x + 5\n• Degree = highest power (2 here)\n• A zero of a polynomial is the value of x that makes it equal to 0."
    },
    {
      keywords: ["linear equation", "linear equations", "equation", "solve for x", "one variable"],
      question: "What is a linear equation?",
      answer:
        "A linear equation has a highest variable power of 1.\n\nExample: 2x + 3 = 7\n• Subtract 3: 2x = 4\n• Divide by 2: x = 2\n\nWhatever you do to one side, do to the other."
    },
    {
      keywords: ["pythagoras", "pythagorean", "hypotenuse", "right angled triangle"],
      question: "What is the Pythagoras theorem?",
      answer:
        "In a right-angled triangle, the square of the hypotenuse equals the sum of the squares of the other two sides.\n\na² + b² = c²\n\nExample: if a = 3 and b = 4, then c² = 9 + 16 = 25, so c = 5."
    },
    {
      keywords: ["identity", "identities", "algebraic identity", "a plus b whole square", "a minus b whole square"],
      question: "Tell me an algebraic identity.",
      answer:
        "Key Class 9 algebraic identities:\n\n1. (a + b)² = a² + 2ab + b²\n2. (a - b)² = a² - 2ab + b²\n3. a² - b² = (a - b)(a + b)\n4. (a + b)³ = a³ + 3a²b + 3ab² + b³\n5. a³ + b³ = (a + b)(a² - ab + b²)"
    },
    {
      keywords: ["number system", "rational", "irrational", "real number", "decimal expansion", "surds", "integers"],
      question: "What is a rational number?",
      answer:
        "A rational number can be written as p/q, where p and q are integers and q ≠ 0.\n\n• Rational: 1/2 = 0.5, 22/7, 0.75\n• Irrational: √2, √3, π — they cannot be written as a simple fraction.\n\nEvery rational number has either a terminating or a repeating decimal expansion."
    },
    {
      keywords: ["coordinate geometry", "cartesian plane", "quadrant", "abscissa", "ordinate", "x axis", "y axis"],
      question: "What is coordinate geometry?",
      answer:
        "Coordinate geometry uses two perpendicular number lines (the x-axis and y-axis) to locate points.\n\n• A point is written as (x, y)\n• x = abscissa (horizontal), y = ordinate (vertical)\n• The axes divide the plane into four quadrants."
    },
    {
      keywords: ["lines and angles", "parallel lines", "transversal", "complementary", "supplementary", "vertically opposite"],
      question: "What are lines and angles?",
      answer:
        "When two lines meet, they form angles.\n\n• Complementary angles add to 90°\n• Supplementary angles add to 180°\n• Vertically opposite angles are equal\n• A transversal cutting parallel lines creates equal alternate and corresponding angles."
    },
    {
      keywords: ["triangle", "triangles", "congruent", "congruence", "sas", "asa", "rhs", "sss", "isosceles"],
      question: "What are congruence rules for triangles?",
      answer:
        "Two triangles are congruent if their sides and angles match exactly. The main rules are:\n\n• SSS — three sides equal\n• SAS — two sides and the included angle\n• ASA — two angles and the included side\n• AAS — two angles and a non-included side\n• RHS — right angle, hypotenuse and one side\n\nNote: AAA and SSA do not prove congruence."
    },
    {
      keywords: ["quadrilateral", "quadrilaterals", "parallelogram", "rhombus", "trapezium", "rectangle", "square"],
      question: "What is a parallelogram?",
      answer:
        "A parallelogram is a quadrilateral with both pairs of opposite sides parallel.\n\n• Opposite sides and angles are equal\n• Diagonals bisect each other\n\nA rectangle, rhombus and square are special parallelograms. In a rectangle, diagonals are equal; in a rhombus, diagonals bisect at 90°."
    },
    {
      keywords: ["circle", "circles", "chord", "arc", "cyclic quadrilateral", "semicircle", "tangent"],
      question: "What are the key circle theorems?",
      answer:
        "Class 9 circle facts:\n\n• A chord is a line segment joining two points on a circle.\n• The angle in a semicircle is 90°.\n• Angles in the same segment are equal.\n• Opposite angles of a cyclic quadrilateral add to 180°.\n• The perpendicular from the centre to a chord bisects the chord."
    },
    {
      keywords: ["heron", "heron's formula", "area of a triangle", "semi perimeter"],
      question: "What is Heron's formula?",
      answer:
        "Heron's formula finds the area of a triangle when all three sides are known.\n\ns = (a + b + c) / 2\nArea = √[s(s - a)(s - b)(s - c)]\n\nExample: sides 3, 4, 5 → s = 6, area = √(6×3×2×1) = 6 square units."
    },
    {
      keywords: ["surface area", "volume", "cuboid", "cylinder", "cone", "sphere", "hemisphere", "mensuration"],
      question: "Give me mensuration formulas.",
      answer:
        "Class 9 mensuration essentials:\n\n• Cuboid: SA = 2(lb + bh + hl), V = lbh\n• Cube: SA = 6a², V = a³\n• Cylinder: CSA = 2πrh, TSA = 2πr(r + h), V = πr²h\n• Cone: CSA = πrl, V = ⅓πr²h\n• Sphere: SA = 4πr², V = 4/3πr³\n• Hemisphere: TSA = 3πr², V = ⅔πr³"
    },
    {
      keywords: ["statistics", "mean median mode", "arithmetic mean", "median", "histogram", "frequency", "average"],
      question: "What are mean, median and mode?",
      answer:
        "• Mean = sum of all values ÷ number of values\n• Median = middle value when data is arranged in order\n• Mode = value that appears most often\n\nExample: 2, 4, 4, 6, 9 → mean = 5, median = 4, mode = 4."
    },
    {
      keywords: ["probability", "chance", "dice", "coin toss"],
      question: "What is probability?",
      answer:
        "Probability measures how likely an event is.\n\nP(event) = favourable outcomes ÷ total outcomes\n\nExample: probability of getting heads on a fair coin = 1/2. Probability always lies between 0 and 1."
    },
    {
      keywords: ["euclid", "axiom", "postulate", "euclidean geometry"],
      question: "What is Euclid's geometry?",
      answer:
        "Euclid's geometry is built from definitions, axioms and postulates.\n\n• Axioms are common assumptions (e.g. things equal to the same thing are equal).\n• Postulates are geometry-specific assumptions, such as 'a straight line can be drawn between any two points'."
    },
    {
      keywords: ["remainder theorem", "factor theorem"],
      question: "What is the remainder theorem?",
      answer:
        "Remainder theorem: if p(x) is divided by (x - a), the remainder is p(a).\n\nFactor theorem: (x - a) is a factor of p(x) exactly when p(a) = 0.\n\nExample: p(x) = x² - 4, p(2) = 0, so (x - 2) is a factor."
    },
    {
      keywords: ["algebra", "algebraic expression", "variable", "coefficient", "constant term"],
      question: "What is algebra?",
      answer:
        "Algebra uses letters (variables) to represent unknown numbers and express patterns.\n\nIn 5x + 3:\n• 5 is the coefficient\n• x is the variable\n• 3 is the constant\n\nExpressions can be simplified, factorised or solved when they contain an equals sign."
    },

    // NEW: Class 9 Maths extra topics
    {
      keywords: ["linear equations in two variables", "two variables", "x y equation", "graph of linear equation"],
      question: "What is a linear equation in two variables?",
      answer:
        "A linear equation in two variables is of the form ax + by + c = 0, where a, b and c are real numbers and a and b are not both zero.\n\nIts graph is a straight line on the Cartesian plane.\n\nExample: 2x + 3y = 6\n• If x = 0, y = 2 → point (0, 2)\n• If x = 3, y = 0 → point (3, 0)\n• Plot both points and join them to get the line."
    },
    {
      keywords: ["quadratic equation", "quadratic", "x squared", "bhaskara", "factorisation"],
      question: "What is a quadratic equation?",
      answer:
        "A quadratic equation is of the form ax² + bx + c = 0, where a ≠ 0.\n\nSolutions (roots) can be found by:\n• Factorisation: splitting the middle term\n• Quadratic formula: x = (−b ± √(b² − 4ac)) / 2a\n• Completing the square\n\nExample: x² − 5x + 6 = 0 → (x − 2)(x − 3) = 0 → x = 2 or x = 3."
    },
    {
      keywords: ["arithmetic progression", "ap", "common difference", "nth term", "sum of terms"],
      question: "What is an arithmetic progression?",
      answer:
        "An arithmetic progression (AP) is a sequence where each term after the first is obtained by adding a fixed number (common difference d).\n\nnth term: aₙ = a + (n − 1)d\nSum of first n terms: Sₙ = n/2 [2a + (n − 1)d]\n\nExample: 2, 5, 8, 11, ... → a = 2, d = 3."
    },
    {
      keywords: ["similar triangles", "triangle similarity", "aa sas sss similarity"],
      question: "What makes triangles similar?",
      answer:
        "Triangles are similar if:\n• AA (Angle-Angle): two angles of one triangle equal two angles of another\n• SAS (Side-Angle-Side): two sides are proportional and the included angle is equal\n• SSS (Side-Side-Side): all three sides are proportional\n\nSimilar triangles have equal corresponding angles and proportional corresponding sides."
    },
    {
      keywords: ["circle theorem", "tangent radius perpendicular", "tangent from external point"],
      question: "What is the tangent-radius theorem?",
      answer:
        "The tangent at any point of a circle is perpendicular to the radius through the point of contact.\n\nIf a tangent PT is drawn from external point P to circle with centre O and radius OT, then ∠OTP = 90°.\n\nFurther: lengths of two tangents drawn from the same external point are equal: PA = PB."
    },
    {
      keywords: ["area of triangle", "using base height", "Heron's formula revisited"],
      question: "How do I find the area of a triangle?",
      answer:
        "Area = ½ × base × height (when base and corresponding height are known).\n\nWhen only sides are known, use Heron's formula:\n\ns = (a + b + c) / 2\nArea = √[s(s − a)(s − b)(s - c)]"
    },
    {
      keywords: ["surface area volume cylinder cone sphere", "class 9 mensuration extra"],
      question: "Extra mensuration formulas for Class 9.",
      answer:
        "Total Surface Area & Volume quick reference:\n\n• Cuboid: TSA = 2(lb + bh + hl), V = lbh\n• Cube: TSA = 6a², V = a³\n• Cylinder: Curved SA = 2πrh, TSA = 2πr(r + h), V = πr²h\n• Cone: Curved SA = πrl, TSA = πr(r + l), V = ⅓πr²h\n• Sphere: SA = 4πr², V = 4/3πr³\n• Hemisphere: TSA = 3πr², V = ⅔πr³\n\nAlways use π ≈ 22/7 or π ≈ 3.14 as instructed."
    },
    {
      keywords: ["probability dice coins cards", "class 9 probability extra examples"],
      question: "More probability examples.",
      answer:
        "• A die has 6 faces → P(getting a 4) = 1/6\n• A coin has 2 faces → P(head) = 1/2\n• A deck has 52 cards → P(ace) = 4/52 = 1/13\n• Probability always lies between 0 and 1 (impossible to certain).\n• Sum of probabilities of all possible outcomes = 1."
    },
    {
      keywords: ["frequency distribution", "ungrouped data", "grouped data", "class interval", "class mark"],
      question: "What is frequency distribution in statistics?",
      answer:
        "Frequency distribution shows how often each value (or range of values) occurs in a data set.\n\nUngrouped: each distinct value and its count.\nGrouped: data arranged into class intervals (e.g. 0−10, 10−20) with their frequencies.\n\nClass mark = (upper limit + lower limit) / 2."
    },
    {
      keywords: ["histogram", "bar graph", "difference bar vs histogram"],
      question: "What is a histogram and how is it different from a bar graph?",
      answer:
        "Histogram: used for continuous data; bars touch each other; width represents class intervals; height represents frequency.\n\nBar graph: used for categorical data; bars are separate; width is uniform; height represents value or frequency.\n\nBoth use rectangular bars but serve different data types."
    },
    {
      keywords: ["quadrilateral properties", "parallelogram rectangle rhombus square", "class 9 quadrilateral extra"],
      question: "Properties of special quadrilaterals.",
      answer:
        "• Parallelogram: opposite sides parallel; opposite sides equal; opposite angles equal; diagonals bisect each other.\n\n• Rectangle: parallelogram with one right angle; diagonals equal.\n\n• Rhombus: parallelogram with all sides equal; diagonals bisect at right angles.\n\n• Square: rectangle + rhombus; all sides equal; all angles 90°; diagonals equal bisect at 90°."
    },
    {
      keywords: ["congruent triangles proofs", "cpct", "corresponding parts congruent triangles"],
      question: "What is CPCT in triangle congruence?",
      answer:
        "CPCT = Corresponding Parts of Congruent Triangles.\n\nIf two triangles are proved congruent (by SSS, SAS, ASA, AAS, RHS), then their corresponding sides and corresponding angles are equal.\n\nExample: ΔABC ≅ ΔDEF → AB = DE, BC = EF, ∠A = ∠D, etc."
    },
    {
      keywords: ["some important algebra identities", "a cubed b cubed", "a cubed plus b cubed"],
      question: "Important algebraic identities for Class 9.",
      answer:
        "Key identities to memorise:\n\n1. (a + b)² = a² + 2ab + b²\n2. (a - b)² = a² - 2ab + b²\n3. a² - b² = (a - b)(a + b)  (difference of squares)\n4. (a + b)³ = a³ + 3a²b + 3ab² + b³\n5. (a - b)³ = a³ - 3a²b + 3ab² - b³\n6. a³ + b³ = (a + b)(a² - ab + b²)\n7. a³ - b³ = (a - b)(a² + ab + b²)\n\nThese appear in almost every Class 9 algebra exercise."
    },
    {
      keywords: ["exponents powers", "laws of exponents", "powers zero negative"],
      question: "Laws of exponents (class 9).",
      answer:
        "For any non-zero base a and integers m, n:\n\n• aᵐ × aⁿ = a^(m+n)\n• aᵐ ÷ aⁿ = a^(m−n)\n• (aᵐ)ⁿ = a^(m×n)\n• a⁰ = 1 (a ≠ 0)\n• a^(−n) = 1 / aⁿ\n• (ab)ⁿ = aⁿbⁿ\n• (a / b)ⁿ = aⁿ / bⁿ (b ≠ 0)\n\nThese rules simplify very large or very small expressions."
    },
    {
      keywords: ["sample space probability", "event equally likely", "probability experimental"],
      question: "Experimental vs theoretical probability.",
      answer:
        "Theoretical probability: based on reasoning, e.g. P(head) = 1/2 when flipping a fair coin.\n\nExperimental (empirical) probability: based on actual experiments, e.g. flipping a coin 100 times and getting 55 heads → P(head) ≈ 55/100 = 0.55.\n\nAs trials increase, experimental probability approaches theoretical probability (Law of Large Numbers)."
    },
    {
      keywords: ["volume cylinder cone sphere real life", "class 9 mensuration real life examples"],
      answer:
        "Real-life uses of mensuration:\n• Cylinder: water in a cylindrical bottle, pencil shape\n• Cone: ice-cream cone, traffic cone, party hat\n• Sphere: football, cricket ball, planetary approximations\n• Cuboid: matchbox, brick, room dimensions\n• Always match units (cm, m, km) and convert if needed before calculating."
    },

    // Gen Z slang section
    {
      keywords: ["no cap", "cap", "fr", "lowkey", "highkey", "bet", "sus", "capcut", "ratio", "drip", "stan", "ate", "slay", "yeet", "lit", "ghost", "simp", "valid", "mid", "based", "cringe"],
      answer:
        "Gen Z slang quick guide:\n\n• **No cap** — ‘for real’, not lying. Example: ‘That's no cap, fire.’\n• **Cap** — a lie / exaggeration. Example: ‘That's cap.’\n• **Fr** — short for 'for real'. Example: 'Fr?'\n• **Lowkey** — secretly, quietly, or soft. Example: 'I'm lowkey tired.'\n• **Highkey** — openly, obviously. Example: 'I highkey like this.'\n• **Bet** — agreement, 'okay', 'sure thing'. Example: 'You coming? — Bet.'\n• **Sus** — suspicious / suspicious person. Example: 'He's acting sus.'\n• **Drip** — great style / fashion. Example: 'Nice drip.'\n• **Stan** — obsessive fan. Example: 'I stan that artist.'\n• **Ate** / **Slay** — did an amazing job. Example: 'She ate that performance.'\n• **Yeet** — to throw something energetically, or an expression of excitement.\n• **Lit** — awesome, exciting, or drunk.\n• **Ghost** — to suddenly cut off contact without explanation.\n• **Simp** — someone who does too much for a person they like.\n• **Mid** — average, nothing special. Example: 'That movie was mid.'\n• **Based** — original, true, or having one's own mind.\n• **Cringe** — embarrassing, making you cringe.\n\nUsage tip: Slang changes fast — keep it light and don't overdo it!"
    },

    // Greetings and small talk
    {
      keywords: ["hi", "hello", "hey", "yo", "hola", "good morning", "good afternoon", "good evening", "good night", "g'day", "howdy"],
      answer:
        "Hey there! ✧ Set to " + SUBJECT_LABELS[currentSubject] + " right now — what are we going over today? I can help with Maths, Science or English. Or type a topic you want to learn."
    },

    // General knowledge common
    {
      keywords: ["time", "what time", "clock", "current time"],
      answer: () => {
        const now = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });
        return `Current local time on your device is ${now}.`;
      }
    },
    {
      keywords: ["date", "today", "day is it", "what day", "todays date"],
      answer: () => {
        const today = new Date().toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        });
        return `Today is ${today}.`;
      }
    },
    {
      keywords: ["planet", "planets", "solar system", "largest planet", "earth", "jupiter", "mars"],
      answer:
        "There are 8 planets in our solar system (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune). Jupiter is the largest, and Earth is the third from the Sun."
    },
    {
      keywords: ["continent", "continents", "ocean", "oceans", "largest ocean"],
      answer:
        "There are 7 continents (Asia, Africa, North America, South America, Antarctica, Europe, Australia) and 5 major oceans (Pacific, Atlantic, Indian, Southern, Arctic). The Pacific is the largest and deepest ocean."
    },
    {
      keywords: ["boiling point", "boil water", "freezing point", "water boils", "melting point of ice"],
      answer:
        "At standard sea-level pressure, pure water boils at 100°C (212°F) and freezes at 0°C (32°F). Ice melts at 0°C as well."
    },
    {
      keywords: ["capital of india", "india capital", "capital city"],
      answer:
        "New Delhi is the capital of India. India has 28 states and 8 union territories."
    },
    {
      keywords: ["how many states", "states in india", "union territories"],
      answer:
        "India has 28 states and 8 union territories. New Delhi is the capital."
    },
    {
      keywords: ["percentage", "percent", "how to calculate percentage"],
      answer:
        "Percentage means 'per hundred'. To find x% of a number, multiply the number by x and divide by 100.\n\nExample: 20% of 250 = (20 × 250) ÷ 100 = 50."
    },
    {
      keywords: ["square root", "square roots", "perfect square"],
      answer:
        "A square root is a number that, multiplied by itself, gives the original number.\n\nExample: √81 = 9 because 9 × 9 = 81. Perfect squares include 1, 4, 9, 16, 25, 36, 49, 64, 81 and 100."
    }
  ],

  // English responses (sample)
  english: [
    {
      keywords: ["noun", "nouns"],
      question: "What is a noun?",
      answer:
        "A noun is a word that names a person, place, thing, or idea. Examples: dog, city, happiness, John."
    },
    {
      keywords: ["verb", "verbs"],
      question: "What is a verb?",
      answer:
        "A verb is a word that shows an action or state of being. Examples: run, is, happen, have."
    },
    {
      keywords: ["adjective", "adjectives"],
      question: "What is an adjective?",
      answer:
        "An adjective is a word that describes or modifies a noun. Examples: beautiful, tall, quick, fun."
    },
    {
      keywords: ["adverb", "adverbs"],
      question: "What is an adverb?",
      answer:
        "An adverb is a word that modifies a verb, adjective, or other adverb. Examples: quickly, very, really, silently."
    },
    {
      keywords: ["tense", "tenses"],
      question: "What are verb tenses?",
      answer:
        "Verb tenses show when an action happens: present (I eat), past (I ate), future (I will eat)."
    },
    {
      keywords: ["active voice", "passive voice"],
      question: "What is active and passive voice?",
      answer:
        "Active: The subject does the action. Passive: The subject receives the action. Example: 'She wrote the letter' (active) / 'The letter was written by her' (passive)."
    },
    {
      keywords: ["synonym", "synonyms"],
      question: "What is a synonym?",
      answer:
        "A synonym is a word that means the same or nearly the same as another word. Example: 'happy' and 'joyful' are synonyms."
    },
    {
      keywords: ["antonym", "antonyms"],
      question: "What is an antonym?",
      answer:
        "An antonym is a word that means the opposite of another word. Example: 'hot' and 'cold' are antonyms."
    }
  ],

  // Science responses (sample)
  science: [
    {
      keywords: ["mixture", "solutions", "homogeneous", "heterogeneous"],
      question: "What is a mixture?",
      answer:
        "A mixture is when two or more substances mix together but keep their own properties. Example: salt water, salad."
    },
    {
      keywords: ["solubility", "saturated", "unsaturated"],
      question: "What is solubility?",
      answer:
        "Solubility is how much of a substance can dissolve in a liquid. Saturated means the maximum amount is dissolved. Unsaturated means more can still dissolve."
    },
    {
      keywords: ["tyndall effect", "colloid", "suspension"],
      question: "What is the Tyndall effect?",
      answer:
        "The Tyndall effect is when light scattering makes a beam visible in a colloid or suspension. Example: sunlight through dusty air."
    },
    {
      keywords: ["matter", "atoms and molecules"],
      question: "What is matter?",
      answer:
        "Matter is anything that has mass and takes up space. It's made of atoms and molecules."
    },
    {
      keywords: ["photosynthesis"],
      question: "What is photosynthesis?",
      answer:
        "Photosynthesis is how plants use sunlight to turn water and carbon dioxide into oxygen and glucose (food)."
    },
    {
      keywords: ["motion", "force", "speed", "velocity", "acceleration", "gravity"],
      question: "What is force and motion?",
      answer:
        "Force is a push or pull on an object. Motion is when an object changes position. Speed is how fast something moves. Velocity includes direction. Acceleration is change in velocity. Gravity pulls objects toward each other."
    },
    {
      keywords: ["work", "energy"],
      question: "What is work and energy?",
      answer:
        "Work is when a force moves an object. Energy is the capacity to do work. Kinetic energy is moving energy. Potential energy is stored energy."
    },
    {
      keywords: ["sound"],
      question: "What is sound?",
      answer:
        "Sound is a vibration that travels as a wave through a medium (air, water, solids). It can be heard when it reaches a person's or animal's ear."
    }
  ]
};

// Helper: find a response by matching keywords
function findResponse(keywords, inputText) {
  const lower = inputText.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      return kw; // match found
    }
  }
  return null;
}

// Main chatbot response function
function getBotResponse(input) {
  const lower = input.toLowerCase().trim();

  // 1. Try project knowledge
  for (const entry of projectKnowledge) {
    const match = findResponse(entry.keywords, lower);
    if (match) {
      return entry.answer;
    }
  }

  // 2. Try common knowledge
  for (const entry of commonKnowledge) {
    const match = findResponse(entry.keywords, lower);
    if (match) {
      if (typeof entry.answer === "function") {
        return entry.answer();
      }
      return entry.answer;
    }
  }

  // 3. Try subject-specific responses
  for (const [subject, rspList] of Object.entries(responses)) {
    for (const entry of rspList) {
      const match = findResponse(entry.keywords, lower);
      if (match) {
        if (typeof entry === "object" && entry.question) {
          // This is a structured response with question/answer
          return entry.question + "\n\n" + entry.answer;
        }
        return entry.answer;
      }
    }
  }

  // 4. Try subject-specific knowledge (maths, science, english)
  // Check if any subject-specific entry matched
  for (const [subject, rspList] of Object.entries(responses)) {
    for (const entry of rspList) {
      const match = findResponse(entry.keywords, lower);
      if (match) {
        if (typeof entry.answer === "string") {
          return "[" + subject.toUpperCase() + "] " + entry.answer;
        }
      }
    }
  }

  // 5. Fallback
  return "I'm not sure about that. You can ask me about Class IX Maths, Science, English, or try a quick fact like 'time', 'date', or 'percentage'.";
}

// ----------------------------------
// CHAT INPUT HANDLING
// ----------------------------------

const chatForm = document.getElementById("chatForm");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const suggestions = document.getElementById("suggestions");

function addMessage(text, isUser) {
  const div = document.createElement("div");
  div.className = "message " + (isUser ? "user-message" : "bot-message");

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = isUser ? "U" : "E";
  avatar.style.width = "31px";
  avatar.style.height = "31px";

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = "<p>" + text + "</p>";

  const small = document.createElement("small");
  small.textContent = isUser
    ? "You"
    : "EDUCORE · " + (SUBJECT_LABELS[currentSubject] || "MATHS").toUpperCase();
  content.prepend(small);

  div.appendChild(avatar);
  div.appendChild(content);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
  const input = chatInput.value.trim();
  if (!input) return;

  addMessage(input, true);
  chatInput.value = "";

  // Bot response (with slight delay)
  setTimeout(() => {
    const response = getBotResponse(input);
    addMessage(response, false);
  }, 500);
}

// Form submit
chatForm?.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage();
});

// Suggestion buttons
document.querySelectorAll(".suggestion").forEach(btn => {
  btn.addEventListener("click", () => {
    const question = btn.dataset.question;
    chatInput.value = question;
    chatForm.requestSubmit();
  });
});

// ----------------------------------
// SUBJECT CARD + OPEN SUBJECT NAVIGATION
// ----------------------------------

// Dashboard subject cards → navigate to Subjects view
document.querySelectorAll(".subject-card[data-subject]").forEach(card => {
  card.addEventListener("click", () => {
    openView("subjects");
  });
});

// Subjects view "Open subject" buttons → navigate to Assistant + pre-select subject
document.querySelectorAll("[data-chat-subject]").forEach(btn => {
  // Skip the chat subject selector buttons (already handled above)
  if (btn.classList.contains("chat-subject-button")) return;

  btn.addEventListener("click", () => {
    const subject = btn.dataset.chatSubject || "maths";

    // Select the subject in the chat selector
    document.querySelectorAll(".chat-subject-button").forEach(b => {
      b.classList.toggle("active", b.dataset.chatSubject === subject);
    });
    currentSubject = subject;

    // Navigate to assistant view
    openView("assistant");
  });
});

// ----------------------------------
// QUIZ SYSTEM
// ----------------------------------

const quizQuestions = [
  {
    question: "Which of these is an algebraic identity?",
    options: [
      "(a + b)² = a² + 2ab + b²",
      "a + b = ab",
      "a² + b² = (a + b)²",
      "a - b = 0"
    ],
    correct: 0,
    explanation: "(a + b)² expands to a² + 2ab + b². This is one of the fundamental Class 9 algebraic identities."
  },
  {
    question: "What is the value of √144?",
    options: [
      "10",
      "11",
      "12",
      "14"
    ],
    correct: 2,
    explanation: "√144 = 12 because 12 × 12 = 144. 144 is a perfect square."
  },
  {
    question: "Which gas is released during photosynthesis?",
    options: [
      "Carbon dioxide",
      "Oxygen",
      "Nitrogen",
      "Hydrogen"
    ],
    correct: 1,
    explanation: "During photosynthesis, plants take in carbon dioxide and water, and release oxygen as a by-product."
  }
];

let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

const quizProgressEl = document.getElementById("quizProgress");
const quizProgressBar = document.getElementById("quizProgressBar");
const quizQuestionEl = document.getElementById("quizQuestion");
const quizOptionsEl = document.getElementById("quizOptions");
const quizFeedbackEl = document.getElementById("quizFeedback");
const nextQuestionBtn = document.getElementById("nextQuestion");

function renderQuizQuestion() {
  if (quizIndex >= quizQuestions.length) return;

  const q = quizQuestions[quizIndex];
  quizAnswered = false;

  // Update progress
  if (quizProgressEl) {
    const num = String(quizIndex + 1).padStart(2, "0");
    const total = String(quizQuestions.length).padStart(2, "0");
    quizProgressEl.textContent = `QUESTION ${num} / ${total}`;
  }

  if (quizProgressBar) {
    const pct = ((quizIndex + 1) / quizQuestions.length) * 100;
    quizProgressBar.style.width = pct + "%";
  }

  // Set question text
  if (quizQuestionEl) {
    quizQuestionEl.textContent = q.question;
  }

  // Build options
  if (quizOptionsEl) {
    quizOptionsEl.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.type = "button";
      btn.textContent = opt;
      btn.style.animationDelay = (i * 0.06) + "s";
      btn.addEventListener("click", () => handleQuizAnswer(i));
      quizOptionsEl.appendChild(btn);
    });
  }

  // Clear feedback
  if (quizFeedbackEl) quizFeedbackEl.textContent = "";

  // Disable next button
  if (nextQuestionBtn) nextQuestionBtn.disabled = true;
}

function handleQuizAnswer(selectedIndex) {
  if (quizAnswered) return;
  quizAnswered = true;

  const q = quizQuestions[quizIndex];
  const buttons = quizOptionsEl.querySelectorAll(".quiz-option");

  // Disable all options
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add("correct");
    if (i === selectedIndex && selectedIndex !== q.correct) btn.classList.add("wrong");
  });

  // Score
  if (selectedIndex === q.correct) {
    quizScore++;
    if (quizFeedbackEl) {
      quizFeedbackEl.innerHTML = `<span style="color: var(--green); font-weight: 600;">✓ Correct!</span> ${q.explanation}`;
    }
  } else {
    if (quizFeedbackEl) {
      quizFeedbackEl.innerHTML = `<span style="color: var(--red); font-weight: 600;">✗ Not quite.</span> ${q.explanation}`;
    }
  }

  // Enable next button
  if (nextQuestionBtn) nextQuestionBtn.disabled = false;
}

function nextQuizQuestion() {
  quizIndex++;

  if (quizIndex >= quizQuestions.length) {
    // Quiz complete — show results
    if (quizQuestionEl) {
      quizQuestionEl.textContent = "Quiz complete!";
    }
    if (quizOptionsEl) {
      quizOptionsEl.innerHTML = "";
    }
    if (quizFeedbackEl) {
      const pct = Math.round((quizScore / quizQuestions.length) * 100);
      let msg = "";
      if (pct === 100) msg = "Perfect score! 🌟";
      else if (pct >= 66) msg = "Great work! Keep it up.";
      else msg = "Good effort — review the topics and try again.";

      quizFeedbackEl.innerHTML = `
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 42px; font-family: var(--font-display); font-weight: 700; color: var(--purple-light);">${quizScore}/${quizQuestions.length}</div>
          <div style="margin-top: 8px; color: var(--muted); font-size: 12px;">${msg}</div>
        </div>
      `;
    }
    if (quizProgressBar) {
      quizProgressBar.style.width = "100%";
    }
    if (quizProgressEl) {
      quizProgressEl.textContent = "COMPLETE";
    }
    if (nextQuestionBtn) {
      nextQuestionBtn.textContent = "Restart quiz ↻";
      nextQuestionBtn.disabled = false;
      nextQuestionBtn.onclick = restartQuiz;
    }
    return;
  }

  renderQuizQuestion();
}

function restartQuiz() {
  quizIndex = 0;
  quizScore = 0;
  if (nextQuestionBtn) {
    nextQuestionBtn.textContent = "Next question →";
    nextQuestionBtn.onclick = nextQuizQuestion;
  }
  renderQuizQuestion();
}

// Bind next button
if (nextQuestionBtn) {
  nextQuestionBtn.onclick = nextQuizQuestion;
}

// Initialize quiz
renderQuizQuestion();

// ----------------------------------
// INITIALISATION
// ----------------------------------

renderAuthUI();

// Set initial subject selector
document.querySelectorAll(".chat-subject-button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chat-subject-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentSubject = btn.dataset.chatSubject || "maths";
  });
});

// Set maths as active by default
document.querySelector(".chat-subject-button[data-chat-subject='maths']").classList.add("active");

// Type a welcome message after a short delay
setTimeout(() => {
  const welcome = "Hey there! ✧ Set to " + SUBJECT_LABELS[currentSubject] + " right now — what are we going over today? I can help with Maths, Science or English. Or type a topic you want to learn.";
  addMessage(welcome, false);
}, 600);