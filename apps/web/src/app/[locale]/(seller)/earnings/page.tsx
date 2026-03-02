"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  DollarSign,
  Clock,
  ArrowDownToLine,
  Download,
  Send,
  Wallet,
  TrendingUp,
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
import { Input } from "@/components/ui/input";
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
import { useSellerEarnings, useRequestPayout } from "@/hooks/use-dashboard";

const earningsData = [
  { month: "Oca", earnings: 95000 },
  { month: "Sub", earnings: 142000 },
  { month: "Mar", earnings: 118000 },
  { month: "Nis", earnings: 175000 },
  { month: "May", earnings: 158000 },
  { month: "Haz", earnings: 232000 },
  { month: "Tem", earnings: 268000 },
  { month: "Agu", earnings: 235000 },
  { month: "Eyl", earnings: 295000 },
  { month: "Eki", earnings: 348000 },
  { month: "Kas", earnings: 320000 },
  { month: "Ara", earnings: 385000 },
];

const payoutHistory = [
  {
    id: "PAY-001",
    amount: 142000,
    status: "completed",
    requestDate: "2026-02-20T10:00:00Z",
    processDate: "2026-02-23T14:00:00Z",
    bankAccount: "Garanti BBVA ****5678",
    method: "Banka Havalesi",
  },
  {
    id: "PAY-002",
    amount: 95000,
    status: "completed",
    requestDate: "2026-01-25T09:00:00Z",
    processDate: "2026-01-28T11:00:00Z",
    bankAccount: "Garanti BBVA ****5678",
    method: "Banka Havalesi",
  },
  {
    id: "PAY-003",
    amount: 175000,
    status: "processing",
    requestDate: "2026-02-25T16:00:00Z",
    processDate: null,
    bankAccount: "Garanti BBVA ****5678",
    method: "Banka Havalesi",
  },
  {
    id: "PAY-004",
    amount: 85000,
    status: "completed",
    requestDate: "2025-12-28T10:00:00Z",
    processDate: "2025-12-31T15:00:00Z",
    bankAccount: "Garanti BBVA ****5678",
    method: "Banka Havalesi",
  },
  {
    id: "PAY-005",
    amount: 210000,
    status: "completed",
    requestDate: "2025-11-22T08:00:00Z",
    processDate: "2025-11-25T12:00:00Z",
    bankAccount: "Garanti BBVA ****5678",
    method: "Banka Havalesi",
  },
];

export default function EarningsPage() {
  const t = useTranslations("common");
  void t; // TODO: replace hardcoded strings with t() calls
  const [chartPeriod, setChartPeriod] = useState("monthly");
  const [payoutDialog, setPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");

  const { data: earningsApiData } = useSellerEarnings();
  void earningsApiData; // TODO: use API data when backend is ready
  const requestPayoutMutation = useRequestPayout();

  const totalEarned = earningsData.reduce((sum, d) => sum + d.earnings, 0);
  const pendingAmount = 175000;
  const processingAmount = payoutHistory
    .filter((p) => p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);
  const availableBalance = 285000;
  const minPayout = 1000;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Kazanclarim</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Kazanc ve odeme gecmisinizi takip edin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Rapor Indir
          </Button>
          <Button
            size="sm"
            onClick={() => setPayoutDialog(true)}
            disabled={availableBalance < minPayout}
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Odeme Talep Et
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Kazanc"
          value={formatCurrency(totalEarned)}
          change="+18.5%"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Bekleyen"
          value={formatCurrency(pendingAmount)}
          description="Onay bekleyen satislar"
          icon={Clock}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatCard
          title="Isleniyor"
          value={formatCurrency(processingAmount)}
          description="Odeme isleniyor"
          icon={TrendingUp}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <Card className="border-primary-500/30 bg-gradient-to-br from-primary-500/10 to-primary-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20">
                <Wallet className="h-5 w-5 text-primary-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{formatCurrency(availableBalance)}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Cekilebilir Bakiye
              </p>
            </div>
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={() => setPayoutDialog(true)}
              disabled={availableBalance < minPayout}
            >
              <ArrowDownToLine className="mr-2 h-3.5 w-3.5" />
              Odeme Talep Et
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      <ChartCard
        title="Kazanc Grafigi"
        periods={[
          { label: "Haftalik", value: "weekly" },
          { label: "Aylik", value: "monthly" },
          { label: "Yillik", value: "yearly" },
        ]}
        activePeriod={chartPeriod}
        onPeriodChange={setChartPeriod}
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={earningsData}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis
              fontSize={12}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Kazanc"]}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#colorEarnings)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Payout History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Odeme Gecmisi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Odeme No</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Yontem</TableHead>
                <TableHead>Hesap</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Talep Tarihi</TableHead>
                <TableHead>Islem Tarihi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutHistory.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-mono text-xs">
                    {payout.id}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrency(payout.amount)}
                  </TableCell>
                  <TableCell className="text-sm">{payout.method}</TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
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
                  <TableCell className="text-xs">
                    {payout.processDate
                      ? formatDate(payout.processDate, "dd MMM yyyy")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payout Request Dialog */}
      <Dialog open={payoutDialog} onOpenChange={setPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odeme Talep Et</DialogTitle>
            <DialogDescription>
              Cekilebilir bakiyenizden odeme talebinde bulunun
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-[var(--muted)] p-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Cekilebilir Bakiye</span>
                <span className="font-bold text-primary-500">
                  {formatCurrency(availableBalance)}
                </span>
              </div>
            </div>
            <Input
              label="Cekim Tutari (TL)"
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder={String(availableBalance)}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Minimum cekim tutari: {formatCurrency(minPayout)}. Odeme 1-3 is gunu icerisinde hesabiniza aktarilir.
            </p>
            <div className="rounded-lg border border-[var(--border)] p-3 text-sm">
              <p className="font-medium">Banka Hesabi</p>
              <p className="mt-1 text-[var(--muted-foreground)]">
                Garanti BBVA - TR00 0006 2000 0000 0012 345678
              </p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setPayoutDialog(false);
                setPayoutAmount("");
              }}
            >
              Vazgec
            </Button>
            <Button
              onClick={async () => {
                try {
                  await requestPayoutMutation.mutateAsync({ amount: Number(payoutAmount) });
                } catch {
                  // Error handled by mutation
                }
                setPayoutDialog(false);
                setPayoutAmount("");
              }}
              disabled={
                !payoutAmount ||
                Number(payoutAmount) < minPayout ||
                Number(payoutAmount) > availableBalance ||
                requestPayoutMutation.isPending
              }
              loading={requestPayoutMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Odeme Talep Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
