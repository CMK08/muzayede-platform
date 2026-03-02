"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  DollarSign,
  Gavel,
  Clock,
  TrendingUp,
  Plus,
  Package,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/admin/stat-card";
import { ChartCard } from "@/components/admin/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSellerDashboard } from "@/hooks/use-dashboard";

const salesData = [
  { month: "Oca", sales: 125000 },
  { month: "Sub", sales: 180000 },
  { month: "Mar", sales: 145000 },
  { month: "Nis", sales: 210000 },
  { month: "May", sales: 190000 },
  { month: "Haz", sales: 275000 },
  { month: "Tem", sales: 320000 },
  { month: "Agu", sales: 280000 },
  { month: "Eyl", sales: 350000 },
  { month: "Eki", sales: 410000 },
  { month: "Kas", sales: 385000 },
  { month: "Ara", sales: 450000 },
];

const recentOrders = [
  {
    id: "ORD-2026-001",
    product: "Osmanli Donemi Altin Kupe Seti",
    buyer: "Ahmet Y.",
    amount: 42500,
    status: "shipped",
    date: "2026-02-25T15:30:00Z",
  },
  {
    id: "ORD-2026-002",
    product: "Antika Osmanli Hancer",
    buyer: "Hasan K.",
    amount: 35000,
    status: "processing",
    date: "2026-02-24T12:00:00Z",
  },
  {
    id: "ORD-2026-003",
    product: "Iznik Cinisi Tabak Koleksiyonu",
    buyer: "Fatma D.",
    amount: 55000,
    status: "pending_payment",
    date: "2026-02-23T18:00:00Z",
  },
  {
    id: "ORD-2026-004",
    product: "Hereke Ipek Hali",
    buyer: "Zeynep S.",
    amount: 45000,
    status: "completed",
    date: "2026-02-20T10:00:00Z",
  },
  {
    id: "ORD-2026-005",
    product: "Yagli Boya Tablo",
    buyer: "Ali A.",
    amount: 68000,
    status: "completed",
    date: "2026-02-15T22:00:00Z",
  },
];

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "default" | "live" }
> = {
  pending_payment: { label: "Odeme Bekliyor", variant: "warning" },
  processing: { label: "Hazirlaniyor", variant: "default" },
  shipped: { label: "Kargoda", variant: "live" },
  completed: { label: "Tamamlandi", variant: "success" },
};

export default function SellerDashboardPage() {
  const t = useTranslations("common");
  void t; // TODO: replace hardcoded strings with t() calls
  const locale = useLocale();
  const [chartPeriod, setChartPeriod] = useState("monthly");
  const { data: dashboardData } = useSellerDashboard();
  // Use API data for stats when available
  const stats = dashboardData?.stats;
  void stats; // TODO: use API stats when backend is ready

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Satici Paneli</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Satislarinizi ve performansinizi takip edin
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/my-products`}>
            <Button variant="outline" size="sm">
              <Package className="mr-2 h-4 w-4" />
              Urun Ekle
            </Button>
          </Link>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Muzayede Olustur
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Satis"
          value={formatCurrency(3320000)}
          change="+15.2%"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Aktif Muzayede"
          value="8"
          change="+2"
          changeType="positive"
          icon={Gavel}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatCard
          title="Bekleyen Siparis"
          value="3"
          changeType="neutral"
          icon={Clock}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatCard
          title="Bu Ay Kazanc"
          value={formatCurrency(450000)}
          change="+22.8%"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
      </div>

      {/* Sales Chart */}
      <ChartCard
        title="Satis Grafigi"
        periods={[
          { label: "Haftalik", value: "weekly" },
          { label: "Aylik", value: "monthly" },
        ]}
        activePeriod={chartPeriod}
        onPeriodChange={setChartPeriod}
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={salesData}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4A843" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#D4A843" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis
              fontSize={12}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Satis"]}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#D4A843"
              strokeWidth={2}
              fill="url(#colorSales)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Son Siparisler</CardTitle>
          <Button variant="outline" size="sm">
            Tumunu Gor
            <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siparis No</TableHead>
                <TableHead>Urun</TableHead>
                <TableHead>Alici</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => {
                const config =
                  statusConfig[order.status] || statusConfig.processing;
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.id}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {order.product}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{order.buyer}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(order.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(order.date, "dd MMM")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          hover
          className="cursor-pointer border-dashed border-primary-500/30 bg-primary-500/5"
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10">
              <Gavel className="h-6 w-6 text-primary-500" />
            </div>
            <p className="mt-3 font-medium">Muzayede Olustur</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Yeni bir muzayede baslatin
            </p>
          </CardContent>
        </Card>
        <Card hover className="cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Package className="h-6 w-6 text-blue-500" />
            </div>
            <p className="mt-3 font-medium">Urun Ekle</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Yeni urun kaydedin
            </p>
          </CardContent>
        </Card>
        <Link href={`/${locale}/earnings`}>
          <Card hover className="cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="mt-3 font-medium">Odemeleri Gor</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Kazanc ve odeme gecmisiniz
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
