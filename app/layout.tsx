import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import TopNav from "./components/TopNav";
import CookieBanner from "./components/CookieBanner";
import Footer from ".//components/Footer";
import AnalyticsLoader from './components/AnalyticsLoader';
import AuthListener from './components/AuthListener'

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Recipe Archive",
    template: "%s | Recipe Archive",
  },
  description: "Save, organize, and share your favorite recipes."
};

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