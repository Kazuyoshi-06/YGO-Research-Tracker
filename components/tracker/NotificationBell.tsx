"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, PackageCheck, ShoppingCart, Waves, Snowflake, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType =
  | "wave_open"
  | "wave_frozen"
  | "wave_ordered"
  | "wave_delivered"
  | "wave_reminder"
  | "submission_received";

interface NotifWave {
  id: number;
  name: string;
  status: string;
}

interface Notification {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  wave: NotifWave | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

const ICON: Record<NotifType, React.ReactNode> = {
  wave_open:            <Waves className="h-4 w-4 text-green-400" />,
  wave_frozen:          <Snowflake className="h-4 w-4 text-blue-400" />,
  wave_ordered:         <ShoppingCart className="h-4 w-4 text-gold" />,
  wave_delivered:       <PackageCheck className="h-4 w-4 text-emerald-400" />,
  wave_reminder:        <Bell className="h-4 w-4 text-amber-400" />,
  submission_received:  <Inbox className="h-4 w-4 text-violet-400" />,
};

// ── Composant ─────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silencieux — pas critique
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchNotifications]);

  // Marquer une notif comme lue
  async function markRead(notif: Notification) {
    if (notif.readAt) return;
    await fetch(`/api/notifications/${notif.id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  // Tout marquer comme lu
  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  // Quand on ouvre le panneau, marquer toutes comme lues après 1 s
  useEffect(() => {
    if (!open || unreadCount === 0) return;
    const t = setTimeout(markAllRead, 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground/80 transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex w-80 flex-col rounded-2xl border border-gold/10 bg-[linear-gradient(180deg,rgba(21,23,30,0.98),rgba(13,14,18,0.98))] p-0 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <span className="text-sm font-medium text-foreground/90">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              Tout marquer lu
            </button>
          )}
        </div>

        {/* Liste */}
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground/60">Aucune notification</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => markRead(notif)}
                className={cn(
                  "flex w-full gap-3 border-b border-border/30 px-4 py-3 text-left transition-colors last:border-0 hover:bg-card/60",
                  !notif.readAt && "bg-gold/4"
                )}
              >
                {/* Icône */}
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border/50 bg-card/80">
                  {ICON[notif.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                </div>

                {/* Texte */}
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "truncate text-xs font-medium",
                    notif.readAt ? "text-foreground/70" : "text-foreground"
                  )}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground/70">
                      {notif.body}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground/50">
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>

                {/* Point non lu */}
                {!notif.readAt && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
