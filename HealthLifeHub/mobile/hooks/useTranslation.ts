/**
 * useTranslation — i18n hook using the user's preferred language
 */
import { useCallback } from 'react';
import * as Localization from 'expo-localization';
import { translations } from '../services/i18n';
import { useUserStore } from '../store/userStore';

export function useTranslation() {
  const { profile } = useUserStore();

  // Prefer user's saved language, fall back to device locale, then English
  const lang = profile?.language || Localization.locale.split('-')[0] || 'en';
  const dict = (translations as any)[lang] || translations.en;

  const t = useCallback((key: string, vars?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = dict;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to English
        value = translations.en;
        for (const k2 of keys) value = value?.[k2];
        break;
      }
    }
    if (typeof value !== 'string') return key;
    if (!vars) return value;
    return Object.entries(vars).reduce(
      (str, [varKey, varVal]) => str.replace(new RegExp(`{{${varKey}}}`, 'g'), String(varVal)),
      value
    );
  }, [lang]);

  return { t, lang };
}
