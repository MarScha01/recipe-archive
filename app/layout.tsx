import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import TopNav from "./components/TopNav";
import CookieBanner from "./components/CookieBanner";
import Footer from ".//components/Footer";
import AnalyticsLoader from './components/AnalyticsLoader';
import AuthListener from './components/AuthListener'
import { Analytics } from "@vercel/analytics/next"

export const metadata = {
  title: {
    default: 'Rechipe Archives - Save, organize, and discover recipes',
    template: '%s - Recipes Archive' },
  description: 'Store your recipes, find meals by ingredient, and organize your cooking in one place.',
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
        <TopNav />
        <AuthListener />
        <AnalyticsLoader />
        {children}
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}