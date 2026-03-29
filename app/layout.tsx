import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import TopNav from "./components/TopNav";
import CookieBanner from "./components/CookieBanner";
import Footer from "./components/Footer";
import AnalyticsLoader from './components/AnalyticsLoader';
import AuthListener from './components/AuthListener'
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  metadataBase: new URL('https://my-recipe-archives.vercel.app'),

  title: {
    default: 'Recipe Archive - Save, organize, and discover recipes',
    template: '%s - Recipe Archive'
  },

  description: 'Store your recipes, find meals by ingredient, and organize your cooking in one place.',

  verification: {
    google: 'DpKa9AGg1ACk-MQxi0hCP51381gkBBCGbaGgp6EJ7_8'
  },

  openGraph: {
    title: 'Recipe Archive',
    description: 'Save, organize, and share your recipes.',
    url: 'https://my-recipe-archives.vercel.app/en',
    siteName: 'Recipe Archive',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Recipe Archive',
    description: 'Save, organize, and share your recipes.',
  }
};

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={plex.className} style={{ background: '#111', color: 'white', minHeight:'100vh' }}>
        <AuthListener />
        <AnalyticsLoader />
        {children}
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}