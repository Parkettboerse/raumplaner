import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Raumplaner | Parkettbörse Augsburg",
  description: "Laden Sie ein Foto hoch und sehen Sie verschiedene Bodenbeläge in Ihrem Raum.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={dmSans.variable}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
