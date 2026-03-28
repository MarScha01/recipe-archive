import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {hasLocale} from 'next-intl';
import {routing} from '@/i18n/routing';
import TopNav from '../components/TopNav'
import Footer from '../components/Footer'

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const currentLocale = await getLocale();

  return (
    <NextIntlClientProvider locale={currentLocale} messages={messages}>
      <TopNav />
      {children}
      <Footer />
    </NextIntlClientProvider>
  );
}