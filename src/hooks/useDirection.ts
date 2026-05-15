import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

export function useDirection() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] ?? 'en';
  const dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language ?? 'en');
  }, [dir, i18n.language]);

  return dir;
}
