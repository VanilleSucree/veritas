export const THEME_VARIABLES = {
  light: {
    "--bg-primary": "#ffffff",
    "--bg-secondary": "#f3f5f8",
    "--bg-tertiary": "#e8edf3",
    "--bg-sidebar": "#ffffff",
    "--text-primary": "#000000",
    "--text-secondary": "#000000",
    "--text-muted": "#4b5563",
    "--text-inverted": "#ffffff",
    "--border-primary": "#cfd6e0",
    "--border-secondary": "#b6c0ce",
    "--accent-primary": "#4f46e5",
    "--accent-secondary": "#6366f1",
    "--shadow-color": "rgba(0, 0, 0, 0.12)",
    "--msp-page-bg": "#b7c3d4",
    "--msp-surface": "#ffffff",
    "--msp-surface-2": "#eef3f8",
    "--msp-surface-3": "#e6edf5",
    "--msp-border": "#9aabc0",
    "--msp-border-light": "#b0bfd0",
    "--msp-text": "#0a1422",
    "--msp-muted": "#4a5a70",
    "--msp-muted-light": "#6e8098",
    "--msp-accent": "#2b5fab",
    "--msp-accent-soft": "rgba(43, 95, 171, 0.12)"
  },
  dark: {
    "--bg-primary": "#070b14",
    "--bg-secondary": "#11182a",
    "--bg-tertiary": "#162033",
    "--bg-sidebar": "#0c1220",
    "--text-primary": "#f3f6fb",
    "--text-secondary": "#d5dde8",
    "--text-muted": "#9aabbf",
    "--text-inverted": "#0a1018",
    "--border-primary": "#2a3a55",
    "--border-secondary": "#3a4f6e",
    "--accent-primary": "#6366f1",
    "--accent-secondary": "#818cf8",
    "--shadow-color": "rgba(0, 0, 0, 0.45)",
    "--msp-page-bg": "#02050a",
    "--msp-surface": "#1f2d4a",
    "--msp-surface-2": "#162338",
    "--msp-surface-3": "#283858",
    "--msp-border": "#3d5478",
    "--msp-border-light": "#2c3d5a",
    "--msp-text": "#f0f4fa",
    "--msp-muted": "#9bb0c9",
    "--msp-muted-light": "#7a93b0",
    "--msp-accent": "#5a9de0",
    "--msp-accent-soft": "rgba(90, 157, 224, 0.18)"
  }
};
export function applyThemeToRoot(theme) {
  const root = document.documentElement;
  const palette = THEME_VARIABLES[theme] || THEME_VARIABLES.light;
  const effective = theme === "dark" ? "dark" : "light";
  root.classList.remove("light", "dark");
  root.classList.add(effective);
  root.style.colorScheme = effective;
  Object.entries(palette).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", effective === "dark" ? "#02050a" : "#b7c3d4");
  }
}
