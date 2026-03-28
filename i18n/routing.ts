import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'nl', 'de', 'lt'],
  defaultLocale: 'en'
});