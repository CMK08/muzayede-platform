"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Gavel,
  Package,
  CreditCard,
  AlertCircle,
  Trophy,
  Check,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-dashboard";

interface Notification {
  id: string;
  type: "bid" | "auction" | "order" | "system" | "payment";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

const typeConfig: Record<
  string,
  { icon: typeof Bell; color: string; bgColor: string; label: string }
> = {
  bid: {
    icon: Gavel,
    color: "text-primary-500",
    bgColor: "bg-primary-500/10",
    label: "Teklifler",
  },
  auction: {
    icon: Trophy,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Muzayedeler",
  },
  order: {
    icon: Package,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    label: "Siparisler",
  },
  payment: {
    icon: CreditCard,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "Odemeler",
  },
  system: {
    icon: AlertCircle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    label: "Sistem",
  },
};

export default function NotificationsPage() {
  const t = useTranslations("common");
  void t; // TODO: replace hardcoded strings with t() calls
  const { data: notificationsData, isLoading } = useNotifications(1, 50);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const [typeFilter, setTypeFilter] = useState("");

  const apiNotifications: Notification[] = (notificationsData?.data || []).map((n: Record<string, unknown>) => ({
    id: n.id as string,
    type: (n.type || "system") as Notification["type"],
    title: (n.title || "") as string,
    body: (n.body || n.message || "") as string,
    timestamp: (n.timestamp || n.createdAt || "") as string,
    read: (n.read || n.isRead || false) as boolean,
    link: (n.link || undefined) as string | undefined,
  }));

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Sync API data
  React.useEffect(() => {
    if (apiNotifications.length > 0) {
      setNotifications(apiNotifications);
    }
  }, [notificationsData]);

  const filteredNotifications = notifications.filter(
    (n) => !typeFilter || n.type === typeFilter
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    markReadMutation.mutate(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    markAllReadMutation.mutate();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Group by date
  const grouped = filteredNotifications.reduce<
    Record<string, Notification[]>
  >((acc, notif) => {
    const date = new Date(notif.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = "Bugun";
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = "Dun";
    } else {
      key = date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (!acc[key]) acc[key] = [];
    acc[key].push(notif);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Bildirimler</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            {unreadCount > 0
              ? `${unreadCount} okunmamis bildirim`
              : "Tum bildirimler okundu"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            options={[
              { value: "", label: "Tum Bildirimler" },
              { value: "bid", label: "Teklifler" },
              { value: "auction", label: "Muzayedeler" },
              { value: "order", label: "Siparisler" },
              { value: "payment", label: "Odemeler" },
              { value: "system", label: "Sistem" },
            ]}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 w-44"
          />
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Tumunu Oku
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-16 w-16 text-[var(--muted-foreground)]" />
            <p className="mt-4 text-lg font-medium">Bildirim yok</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Yeni bildirimleriniz burada gorunecek
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <h3 className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">
                {dateLabel}
              </h3>
              <div className="space-y-2">
                {items.map((notif) => {
                  const config = typeConfig[notif.type] || typeConfig.system;
                  const Icon = config.icon;
                  return (
                    <Card
                      key={notif.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        !notif.read && "border-primary-500/30 bg-primary-500/5"
                      )}
                    >
                      <CardContent className="p-4">
                        <div
                          className="flex gap-3"
                          onClick={() => markAsRead(notif.id)}
                        >
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                              config.bgColor
                            )}
                          >
                            <Icon className={cn("h-5 w-5", config.color)} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p
                                  className={cn(
                                    "text-sm",
                                    !notif.read ? "font-semibold" : "font-medium"
                                  )}
                                >
                                  {notif.title}
                                </p>
                                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                                  {notif.body}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  {formatRelativeTime(notif.timestamp)}
                                </span>
                                {!notif.read && (
                                  <div className="h-2 w-2 rounded-full bg-primary-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
