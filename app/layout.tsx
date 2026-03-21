import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import TopNav from "./components/TopNav";

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
      <body className={plex.className}>
        <TopNav />
        {children}
      </body>
    </html>
  );
}