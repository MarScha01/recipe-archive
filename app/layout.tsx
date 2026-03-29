import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import TopNav from "./components/TopNav";
import CookieBanner from "./components/CookieBanner";
import Footer from "./components/Footer";
import AnalyticsLoader from './components/AnalyticsLoader';
import AuthListener from './components/AuthListener'
import { Analytics } from "@vercel/analytics/next"

export const metadata = {
  title: {
    default: 'Recipe Archive - Save, organize, and discover recipes',
    template: '%s - Recipe Archive' },
  description: 'Store your recipes, find meals by ingredient, and organize your cooking in one place.',
  verification: {
    google: 'DpKa9AGg1ACk-MQxi0hCP51381gkBBCGbaGgp6EJ7_8'
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