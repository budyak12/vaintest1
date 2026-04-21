import { useEffect, useState } from "react";

const KEY = "blog-theme";
type Theme = "light" | "dark";

function getInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getInitial());

  useEffect(() => {
    apply(theme);
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    setTheme,
  };
}

/** Inline script content to set theme before paint and prevent FOUC. */
export const themeBootstrap = `
(function(){try{var t=localStorage.getItem('blog-theme');if(!t){t='dark';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();
`;
