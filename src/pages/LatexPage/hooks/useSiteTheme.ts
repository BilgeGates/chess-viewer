import { useEffect, useState } from 'react';

export type SiteTheme = 'light' | 'dark';

function readTheme(): SiteTheme {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark';
}

export function useSiteTheme(): SiteTheme {
  const [theme, setTheme] = useState<SiteTheme>(readTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
