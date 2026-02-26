"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  DollarSign,
  Clock,
  TrendingUp,
  RotateCcw,
  Download,
  Send,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

const revenueData = [
  { month: "Oca", revenue: 450000, commission: 45000, refunds: 12000 },
  { month: "Sub", revenue: 580000, commission: 58000, refunds: 8000 },
  { month: "Mar", revenue: 620000, commission: 62000, refunds: 15000 },
  { month: "Nis", revenue: 540000, commission: 54000, refunds: 5000 },
  { month: "May", revenue: 710000, commission: 71000, refunds: 22000 },
  { month: "Haz", revenue: 680000, commission: 68000, refunds: 10000 },
  { month: "Tem", revenue: 750000, commission: 75000, refunds: 18000 },
  { month: "Agu", revenue: 820000, commission: 82000, refunds: 7000 },
  { month: "Eyl", revenue: 780000, commission: 78000, refunds: 14000 },
  { month: "Eki", revenue: 890000, commission: 89000, refunds: 11000 },
  { month: "Kas", revenue: 950000, commission: 95000, refunds: 9000 },
  { month: "Ara", revenue: 1100000, commission: 110000, refunds: 20000 },
];

const commissionBreakdown = [
  { name: "Alici Komisyonu", value: 55, color: "#D4A843" },
  { name: "Satici Komisyonu", value: 35, color: "#5E72F3" },
  { name: "Islem Ucreti", value: 10, color: "#10B981" },
];

const recentTransactions = [
  {
    id: "TRX-001",
    description: "Osmanli Donemi Altin Kupe Seti - Alici Odemesi",
    amount: 46750,
    type: "income",
    date: "2026-02-26T10:30:00Z",
    status: "completed",
  },
  {
    id: "TRX-002",
    description: "Klasik Oto Galeri - Satici Odemesi",
    amount: -787500,
    type: "payout",
    date: "2026-02-25T14:00:00Z",
    status: "completed",
  },
  {
    id: "TRX-003",
    description: "Rolex Daytona Komisyon Geliri",
    amount: 125000,
    type: "commission",
    date: "2026-02-25T12:00:00Z",
    status: "pending",
  },
  {
    id: "TRX-004",
    description: "Mercedes-Benz 300SL - Iade",
    amount: -4675000,
    type: "refund",
    date: "2026-02-24T09:00:00Z",
    status: "completed",
  },
  {
    id: "TRX-005",
    description: "Patek Philippe Nautilus - Alici Odemesi",
    amount: 2365000,
    type: "income",
    date: "2026-02-23T16:30:00Z",
    status: "pending",
  },
  {
    id: "TRX-006",
    description: "Antika Dunyasi - Satici Odemesi",
    amount: -38250,
    type: "payout",
    date: "2026-02-23T11:00:00Z",
    status: "completed",
  },
  {
    id: "TRX-007",
    description: "Cartier Love Bileklik Komisyon",
    amount: 7800,
    type: "commission",
    date: "2026-02-22T15:45:00Z",
    status: "completed",
  },
];

const sellerPayouts = [
  {
    id: "PAY-001",
    seller: "Antika Dunyasi",
    amount: 38250,
    status: "completed",
    requestDate: "2026-02-20T10:00:00Z",
    processDate: "2026-02-23T11:00:00Z",
    bankAccount: "TR00 0001 2345 ****",
  },
  {
    id: "PAY-002",
    seller: "Klasik Oto Galeri",
    amount: 787500,
    status: "completed",
    requestDate: "2026-02-22T14:00:00Z",
    processDate: "2026-02-25T14:00:00Z",
    bankAccount: "TR00 0006 7890 ****",
  },
  {
    id: "PAY-003",
    seller: "Prestige Saat",
    amount: 1125000,
    status: "pending",
    requestDate: "2026-02-25T09:00:00Z",
    processDate: null,
    bankAccount: "TR00 0011 2233 ****",
  },
  {
    id: "PAY-004",
    seller: "Mucevherat Dunyasi",
    amount: 70200,
    status: "pending",
    requestDate: "2026-02-24T16:00:00Z",
    processDate: null,
    bankAccount: "TR00 0044 5566 ****",
  },
  {
    id: "PAY-005",
    seller: "Tarih Koleksiyonlari",
    amount: 31500,
    status: "processing",
    requestDate: "2026-02-23T08:30:00Z",
    processDate: null,
    bankAccount: "TR00 0077 8899 ****",
  },
];

const transactionTypeConfig: Record<
  string,
  { label: string; variant: "success" | "default" | "warning" | "destructive" }
> = {
  income: { label: "Gelir", variant: "success" },
  commission: { label: "Komisyon", variant: "default" },
  payout: { label: "Odeme", variant: "warning" },
  refund: { label: "Iade", variant: "destructive" },
};

export default function AdminFinancePage() {
  const t = useTranslations("admin");
  const [chartPeriod, setChartPeriod] = useState("monthly");
  const [payoutDialog, setPayoutDialog] = useState<{
    open: boolean;
    payout: (typeof sellerPayouts)[0] | null;
  }>({ open: false, payout: null });

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalCommission = revenueData.reduce((sum, d) => sum + d.commission, 0);
  const totalRefunds = revenueData.reduce((sum, d) => sum + d.refunds, 0);
  const pendingPayouts = sellerPayouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Finans Paneli</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Gelir, gider ve odemelerinizi takip edin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Gelir"
          value={formatCurrency(totalRevenue)}
          change="+22.5%"
          changeType="positive"
          icon={DollarSign}
          description={`Bu ay: ${formatCurrency(revenueData[revenueData.length - 1].revenue)}`}
        />
        <StatCard
          title="Bekleyen Odemeler"
          value={formatCurrency(pendingPayouts)}
          change={`${sellerPayouts.filter((p) => p.status === "pending").length} satici`}
          changeType="neutral"
          icon={Clock}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatCard
          title="Komisyon Geliri"
          value={formatCurrency(totalCommission)}
          change="+18.3%"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
        <StatCard
          title="Iadeler"
          value={formatCurrency(totalRefunds)}
          change="-5.2%"
          changeType="positive"
          icon={RotateCcw}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Chart */}
        <ChartCard
          title="Gelir Grafigi"
          className="lg:col-span-2"
          periods={[
            { label: "Haftalik", value: "weekly" },
            { label: "Aylik", value: "monthly" },
            { label: "Yillik", value: "yearly" },
          ]}
          activePeriod={chartPeriod}
          onPeriodChange={setChartPeriod}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4A843" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4A843" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5E72F3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5E72F3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "revenue" ? "Gelir" : name === "commission" ? "Komisyon" : "Iade",
                ]}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "revenue" ? "Gelir" : value === "commission" ? "Komisyon" : "Iade"
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#D4A843"
                strokeWidth={2}
                fill="url(#colorRev)"
              />
              <Area
                type="monotone"
                dataKey="commission"
                stroke="#5E72F3"
                strokeWidth={2}
                fill="url(#colorComm)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Commission Breakdown */}
        <ChartCard title="Komisyon Dagilimi">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={commissionBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {commissionBreakdown.map((entry, index) => (
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
          <div className="space-y-2">
            {commissionBreakdown.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
                <span className="font-medium">%{item.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Son Islemler</CardTitle>
          <Button variant="outline" size="sm">
            Tumunu Gor
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Islem No</TableHead>
                <TableHead>Aciklama</TableHead>
                <TableHead>Tur</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((trx) => {
                const config =
                  transactionTypeConfig[trx.type] || transactionTypeConfig.income;
                return (
                  <TableRow key={trx.id}>
                    <TableCell className="font-mono text-xs">
                      {trx.id}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{trx.description}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`tabular-nums font-medium ${
                          trx.amount >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {trx.amount >= 0 ? "+" : ""}
                        {formatCurrency(Math.abs(trx.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          trx.status === "completed" ? "success" : "warning"
                        }
                      >
                        {trx.status === "completed" ? "Tamamlandi" : "Beklemede"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(trx.date, "dd MMM HH:mm")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Seller Payouts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Satici Odemeleri</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Rapor
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Odeme No</TableHead>
                <TableHead>Satici</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Banka Hesabi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Talep Tarihi</TableHead>
                <TableHead className="text-right">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellerPayouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-mono text-xs">
                    {payout.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payout.seller}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrency(payout.amount)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {payout.bankAccount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        payout.status === "completed"
                          ? "success"
                          : payout.status === "processing"
                            ? "default"
                            : "warning"
                      }
                    >
                      {payout.status === "completed"
                        ? "Tamamlandi"
                        : payout.status === "processing"
                          ? "Isleniyor"
                          : "Beklemede"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(payout.requestDate, "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {payout.status === "pending" && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          setPayoutDialog({ open: true, payout })
                        }
                      >
                        <Send className="mr-1 h-3 w-3" />
                        Odeme Yap
                      </Button>
                    )}
                    {payout.status === "processing" && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Isleniyor...
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payout Confirmation Dialog */}
      <Dialog
        open={payoutDialog.open}
        onOpenChange={(open) => setPayoutDialog({ ...payoutDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odeme Onayi</DialogTitle>
            <DialogDescription>
              Asagidaki odeme islemini onaylamak istediginizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          {payoutDialog.payout && (
            <div className="mt-4 space-y-3 rounded-lg bg-[var(--muted)] p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Satici</span>
                <span className="font-medium">{payoutDialog.payout.seller}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Tutar</span>
                <span className="font-medium">
                  {formatCurrency(payoutDialog.payout.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Banka Hesabi</span>
                <span className="font-mono text-xs">
                  {payoutDialog.payout.bankAccount}
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setPayoutDialog({ open: false, payout: null })}
            >
              Vazgec
            </Button>
            <Button
              onClick={() => setPayoutDialog({ open: false, payout: null })}
            >
              <Send className="mr-2 h-4 w-4" />
              Odemeyi Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
