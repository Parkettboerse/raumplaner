import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Raumplaner | Parkettbörse Augsburg",
  description: "Laden Sie ein Foto hoch und sehen Sie verschiedene Bodenbeläge in Ihrem Raum.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={outfit.variable}>
      <body className="font-[family-name:var(--font-outfit)] antialiased">{children}</body>
    </html>
  );
}
