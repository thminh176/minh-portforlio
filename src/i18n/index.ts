import type { Dictionary, Locale } from './types';
import { viDictionary } from './vi';
import { enDictionary } from './en';

export * from './types';

export function getDictionary(locale: Locale | string): Dictionary {
  if (locale === 'vi') {
    return viDictionary;
  }
  return enDictionary;
}
