"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Smartphone,
  Send,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSessions } from "@/lib/hooks/use-sessions";
import { useCampaigns } from "@/lib/hooks/use-campaigns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/sessions", label: "Oturumlar", icon: Smartphone },
  { href: "/campaigns", label: "Kampanyalar", icon: Send },
] as const;

const COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

export function SidebarNav() {
  const pathname = usePathname();
  const { data: sessions } = useSessions();
  const { data: campaigns } = useCampaigns();
  const [collapsed, setCollapsed] = useState(false);

  // Reads a purely-cosmetic, desktop-local UI preference after mount (no SSR
  // audience in this Electron app, so a one-frame default->stored flip here
  // is not a real hydration concern).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const connectedCount = sessions?.filter((s) => s.status === "connected").length ?? 0;
  const runningCount = campaigns?.filter((c) => c.status === "running").length ?? 0;

  const badgeByHref: Record<string, number> = {
    "/sessions": connectedCount,
    "/campaigns": runningCount,
  };

  return (
    <aside
      className={cn(
        "h-full shrink-0 bg-sidebar text-sidebar-foreground p-3 flex flex-col gap-5",
        "shadow-[4px_0_24px_-8px_rgba(0,0,0,0.25)] z-10 transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-2.5 py-2.5", collapsed ? "justify-center px-0" : "px-1.5")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_2px_8px_-2px_var(--sidebar-primary)]">
          <MessageCircle className="size-4.5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-none min-w-0">
            <span className="font-semibold text-sm truncate">WhatsApp Otomasyon</span>
            <span className="text-xs text-sidebar-foreground/50 truncate">Kontrol Paneli</span>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === href : pathname.startsWith(href);
          const badge = badgeByHref[href];

          const link = (
            <Link
              href={href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg py-2 text-sm transition-all duration-150",
                collapsed ? "justify-center px-0" : "px-2.5",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary transition-all duration-150",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                )}
              />
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground",
                )}
              />
              {!collapsed && (
                <>
                  <span className="truncate">{label}</span>
                  {badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary/20 px-1.5 text-xs font-medium text-sidebar-primary tabular-nums">
                      {badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge > 0 && (
                <span className="absolute right-1 top-1 size-1.5 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );

          if (!collapsed) return <div key={href}>{link}</div>;

          return (
            <Tooltip key={href}>
              <TooltipTrigger render={link} />
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {(() => {
        const toggleButton = (
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "mt-auto flex items-center gap-2.5 rounded-lg py-2 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors",
              collapsed ? "justify-center px-0" : "px-2.5",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" />
            )}
            {!collapsed && "Daralt"}
          </button>
        );

        if (!collapsed) return toggleButton;

        return (
          <Tooltip>
            <TooltipTrigger render={toggleButton} />
            <TooltipContent side="right">Genişlet</TooltipContent>
          </Tooltip>
        );
      })()}
    </aside>
  );
}
