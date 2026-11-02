import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Smart Metro Finder",
    template: "%s · Smart Metro Finder",
  },
  description:
    "Locate nearby metro stations, view them on a map, get walking or transit directions, and manage privacy-first travel alerts.",
  applicationName: "Smart Metro Finder",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "Smart Metro Finder",
    description: "Find nearby metro stations, get directions, and receive location-aware reminders.",
    images: ["/images/hero-metro.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3f8" },
    { media: "(prefers-color-scheme: dark)", color: "#07111f" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `
try {
  const t = localStorage.getItem("smf-theme") || "system";
  const d = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  if (d) document.documentElement.classList.add("dark");
} catch {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
