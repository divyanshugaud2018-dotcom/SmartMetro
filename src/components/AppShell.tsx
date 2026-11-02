"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IconBell, IconGear, IconMap, IconMoon, IconRoundel, IconStar, IconSun } from "@/components/Icons";
import { api } from "@/lib/client";
import { applyTheme, currentDark, readStoredTheme } from "@/lib/theme";
import type { AppNotification } from "@/lib/types";

const NAV = [
  { href: "/", label: "Map", icon: IconMap },
  { href: "/saved", label: "Saved", icon: IconStar },
  { href: "/alerts", label: "Alerts", icon: IconBell },
  { href: "/settings", label: "Settings", icon: IconGear },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(currentDark());
    const theme = readStoredTheme();
    applyTheme(theme);
    setDark(currentDark());
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ notifications: AppNotification[] }>("/api/notifications")
      .then((data) => {
        if (!cancelled) setUnread(data.notifications.filter((item) => !item.read).length);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function toggleTheme() {
    const next = currentDark() ? "light" : "dark";
    applyTheme(next);
    setDark(next === "dark");
    void api("/api/preferences", {
      method: "PUT",
      body: JSON.stringify({ theme: next }),
    }).catch(() => undefined);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="app-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <IconRoundel className="h-6 w-6" />
          </span>
          <span>
            <span className="brand-kicker">Live location · Official sources</span>
            <span className="brand-title">Smart Metro Finder</span>
          </span>
        </Link>
        <div className="header-actions">
          <Link href="/guide" className="ghost-btn hidden sm:inline-flex">
            Setup &amp; privacy
          </Link>
          <Link href="/alerts" className="icon-btn" aria-label="Open alerts">
            <IconBell className="h-5 w-5" />
            {unread > 0 ? <span className="badge">{unread > 9 ? "9+" : unread}</span> : null}
          </Link>
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle color theme">
            {dark ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
          </button>
        </div>
      </header>
      <main className="app-main" id="main-content">{children}</main>
      <nav className="bottom-nav" aria-label="Primary">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={active ? "nav-item is-active" : "nav-item"}>
              <span className="relative">
                <Icon className="h-5 w-5" />
                {item.href === "/alerts" && unread > 0 ? <span className="nav-dot" /> : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
