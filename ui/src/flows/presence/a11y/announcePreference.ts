import { useEffect, useState } from 'react';

const KEY = 'gratia:announce-enabled';

export function getAnnounceEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return true; // default ON
    return raw === '1';
  } catch {
    return true; // fail open
  }
}

export function setAnnounceEnabled(v: boolean) {
  try {
    window.localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* ignore quota / privacy errors */
  }
  window.dispatchEvent(new CustomEvent('gratia:announce-pref', { detail: v }));
}

export function useAnnouncePreference(): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState(getAnnounceEnabled);

  useEffect(() => {
    const fn = (e: any) => setVal(e.detail);
    window.addEventListener('gratia:announce-pref', fn);
    return () => window.removeEventListener('gratia:announce-pref', fn);
  }, []);

  return [val, setAnnounceEnabled];
}
