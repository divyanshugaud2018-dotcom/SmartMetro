export type ThemeChoice = "light" | "dark" | "system";

export function applyTheme(theme: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("smf-theme", theme);
}

export function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const value = localStorage.getItem("smf-theme");
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function currentDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}
