"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Gavel,
  DollarSign,
  Activity,
  Eye,
  MoreVertical,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

// Mock data for charts
const revenueData = [
  { month: "Oca", revenue: 450000, bids: 3200 },
  { month: "Sub", revenue: 580000, bids: 4100 },
  { month: "Mar", revenue: 620000, bids: 4500 },
  { month: "Nis", revenue: 540000, bids: 3800 },
  { month: "May", revenue: 710000, bids: 5200 },
  { month: "Haz", revenue: 680000, bids: 4800 },
  { month: "Tem", revenue: 750000, bids: 5600 },
  { month: "Agu", revenue: 820000, bids: 6100 },
  { month: "Eyl", revenue: 780000, bids: 5800 },
  { month: "Eki", revenue: 890000, bids: 6500 },
  { month: "Kas", revenue: 950000, bids: 7200 },
  { month: "Ara", revenue: 1100000, bids: 8400 },
];

const weeklyBidData = [
  { day: "Pzt", bids: 420 },
  { day: "Sal", bids: 380 },
  { day: "Car", bids: 510 },
  { day: "Per", bids: 450 },
  { day: "Cum", bids: 680 },
  { day: "Cmt", bids: 820 },
  { day: "Paz", bids: 750 },
];

const userGrowthData = [
  { month: "Oca", users: 42000 },
  { month: "Sub", users: 43500 },
  { month: "Mar", users: 44800 },
  { month: "Nis", users: 45200 },
  { month: "May", users: 46800 },
  { month: "Haz", users: 47500 },
  { month: "Tem", users: 48200 },
  { month: "Agu", users: 49100 },
  { month: "Eyl", users: 49800 },
  { month: "Eki", users: 50500 },
  { month: "Kas", users: 51200 },
  { month: "Ara", users: 52800 },
];

const categoryDistribution = [
  { name: "Mucevher", value: 28, color: "#D4A843" },
  { name: "Luks Saat", value: 22, color: "#F97316" },
  { name: "Sanat", value: 18, color: "#5E72F3" },
  { name: "Otomobil", value: 15, color: "#10B981" },
  { name: "Antika", value: 12, color: "#8B5CF6" },
  { name: "Diger", value: 5, color: "#6B7280" },
];

const recentAuctions = [
  {
    id: "1",
    title: "Osmanli Donemi Altin Kupe Seti",
    category: "Antika Taki",
    currentBid: 42500,
    bidCount: 28,
    endDate: "2026-03-05T22:00:00Z",
    status: "active" as const,
  },
  {
    id: "2",
    title: "1967 Ford Mustang Shelby GT500",
    category: "Klasik Otomobil",
    currentBid: 875000,
    bidCount: 15,
    endDate: "2026-03-02T20:00:00Z",
    status: "ending_soon" as const,
  },
  {
    id: "3",
    title: "Rolex Daytona 116500LN",
    category: "Luks Saat",
    currentBid: 1250000,
    bidCount: 12,
    endDate: "2026-03-08T18:00:00Z",
    status: "active" as const,
  },
  {
    id: "4",
    title: "Yagli Boya Tablo - Istanbul Bogazi",
    category: "Sanat",
    currentBid: 68000,
    bidCount: 19,
    endDate: "2026-03-10T22:00:00Z",
    status: "active" as const,
  },
  {
    id: "5",
    title: "Elmas Yuzuk - 3.5 Karat",
    category: "Mucevher",
    currentBid: 0,
    bidCount: 0,
    endDate: "2026-03-15T20:00:00Z",
    status: "upcoming" as const,
  },
];

const statusBadgeMap: Record<string, "live" | "warning" | "secondary" | "success"> = {
  active: "live",
  ending_soon: "warning",
  upcoming: "secondary",
  ended: "success",
};

const statusLabelMap: Record<string, string> = {
  active: "Aktif",
  ending_soon: "Bitiyor",
  upcoming: "Yakinda",
  ended: "Sona Erdi",
};

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
  const [chartPeriod, setChartPeriod] = useState<"weekly" | "monthly">("monthly");

  const statCards = [
    {
      title: t("totalRevenue"),
      value: formatCurrency(8870000),
      change: "+12.5%",
      changeType: "positive" as const,
      icon: DollarSign,
      description: t("thisMonth") + ": " + formatCurrency(1100000),
    },
    {
      title: t("totalAuctions"),
      value: "12,450",
      change: "+8.2%",
      changeType: "positive" as const,
      icon: Gavel,
      description: t("activeAuctions") + ": 342",
    },
    {
      title: t("totalUsers"),
      value: "52,800",
      change: "+15.3%",
      changeType: "positive" as const,
      icon: Users,
      description: t("thisMonth") + ": 1,600",
    },
    {
      title: t("totalBids"),
      value: "2.5M",
      change: "+22.1%",
      changeType: "positive" as const,
      icon: Activity,
      description: t("thisMonth") + ": 8,400",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("dashboard")}</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            {t("overview")} - {formatDate(new Date().toISOString(), "dd MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={chartPeriod === "weekly" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartPeriod("weekly")}
          >
            {t("weeklyStats")}
          </Button>
          <Button
            variant={chartPeriod === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartPeriod("monthly")}
          >
            {t("monthlyStats")}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                  <stat.icon className="h-5 w-5 text-primary-500" />
                </div>
                <Badge
                  variant={
                    stat.changeType === "positive" ? "success" : "destructive"
                  }
                  className="text-xs"
                >
                  {stat.changeType === "positive" ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {stat.change}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {stat.title}
                </p>
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("revenueChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A843" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4A843" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Ciro"]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#D4A843"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kategori Dagilimi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`%${value}`, "Oran"]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categoryDistribution.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </div>
                  <span className="font-medium">%{cat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bid Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("bidChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyBidData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [value, "Teklif"]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="bids"
                  fill="#D4A843"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("userChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    "Uye",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#5E72F3"
                  strokeWidth={2}
                  dot={{ fill: "#5E72F3", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Auctions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("recentAuctions")}</CardTitle>
          <Button variant="outline" size="sm">
            Tumunu Gor
            <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    {t("auctionTitle")}
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Kategori
                  </th>
                  <th className="pb-3 text-right font-medium text-[var(--muted-foreground)]">
                    {t("currentBid")}
                  </th>
                  <th className="pb-3 text-center font-medium text-[var(--muted-foreground)]">
                    {t("bidCount")}
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    {t("endDate")}
                  </th>
                  <th className="pb-3 text-center font-medium text-[var(--muted-foreground)]">
                    Durum
                  </th>
                  <th className="pb-3 text-right font-medium text-[var(--muted-foreground)]">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentAuctions.map((auction) => (
                  <tr
                    key={auction.id}
                    className="transition-colors hover:bg-[var(--muted)]/50"
                  >
                    <td className="py-3 pr-4">
                      <span className="font-medium">{auction.title}</span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted-foreground)]">
                      {auction.category}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums">
                      {auction.currentBid > 0
                        ? formatCurrency(auction.currentBid)
                        : "-"}
                    </td>
                    <td className="py-3 text-center tabular-nums">
                      {auction.bidCount}
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted-foreground)]">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(auction.endDate, "dd MMM HH:mm")}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <Badge variant={statusBadgeMap[auction.status]}>
                        {statusLabelMap[auction.status]}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">23</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("pendingApproval")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">342</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("activeAuctions")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Aktif Kullanicilar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">98.5%</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Sistem Uptime
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
