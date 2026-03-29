import type { Metadata } from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {hasLocale} from 'next-intl';
import {routing} from '@/i18n/routing';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  openGraph: {
    title: 'Recipe Archive',
    description: 'Save, organize, and share your recipes.',
    url: 'https://my-recipe-archives.vercel.app/en',
    siteName: 'Recipe Archive',
    type: 'website',
    images: [
      {
        url: 'https://my-recipe-archives.vercel.app/opengraph-image.png',
        width: 1536,
        height: 1024,
        alt: 'Recipe Archive preview'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recipe Archive',
    description: 'Save, organize, and share your recipes.',
    images: ['https://my-recipe-archives.vercel.app/opengraph-image.png']
  }
};

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