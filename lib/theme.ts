export const THEME_STORAGE_KEY = "task-todo-theme";

export type Theme = "light" | "dark";

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function resolveTheme(stored: Theme | null): Theme {
  return stored ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function persistTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function persistThemeCookie(theme: Theme): void {
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/** Runs before paint to avoid theme flash. */
export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
