"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  FileText,
  Download,
  DollarSign,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  RotateCcw,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAdminOrders } from "@/hooks/use-dashboard";

interface Order {
  id: string;
  auctionTitle: string;
  buyer: string;
  seller: string;
  hammerPrice: number;
  commission: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  trackingNumber: string | null;
  [key: string]: unknown;
}

const mockOrders: Order[] = [
  {
    id: "ORD-2026-001",
    auctionTitle: "Osmanli Donemi Altin Kupe Seti",
    buyer: "Ahmet Yilmaz",
    seller: "Antika Dunyasi",
    hammerPrice: 42500,
    commission: 4250,
    totalAmount: 46750,
    status: "delivered",
    paymentStatus: "paid",
    createdAt: "2026-02-25T15:30:00Z",
    trackingNumber: "TR123456789",
  },
  {
    id: "ORD-2026-002",
    auctionTitle: "1967 Ford Mustang Shelby GT500",
    buyer: "Ali Arslan",
    seller: "Klasik Oto Galeri",
    hammerPrice: 875000,
    commission: 87500,
    totalAmount: 962500,
    status: "shipped",
    paymentStatus: "paid",
    createdAt: "2026-02-24T12:00:00Z",
    trackingNumber: "TR987654321",
  },
  {
    id: "ORD-2026-003",
    auctionTitle: "Rolex Daytona 116500LN",
    buyer: "Fatma Demir",
    seller: "Prestige Saat",
    hammerPrice: 1250000,
    commission: 125000,
    totalAmount: 1375000,
    status: "pending_payment",
    paymentStatus: "pending",
    createdAt: "2026-02-23T18:00:00Z",
    trackingNumber: null,
  },
  {
    id: "ORD-2026-004",
    auctionTitle: "Yagli Boya Tablo - Istanbul Bogazi",
    buyer: "Zeynep Sahin",
    seller: "Sanat Galerisi",
    hammerPrice: 68000,
    commission: 6800,
    totalAmount: 74800,
    status: "completed",
    paymentStatus: "paid",
    createdAt: "2026-02-20T10:00:00Z",
    trackingNumber: "TR111222333",
  },
  {
    id: "ORD-2026-005",
    auctionTitle: "Antika Osmanli Hancer",
    buyer: "Hasan Koc",
    seller: "Tarih Koleksiyonlari",
    hammerPrice: 35000,
    commission: 3500,
    totalAmount: 38500,
    status: "processing",
    paymentStatus: "paid",
    createdAt: "2026-02-22T14:30:00Z",
    trackingNumber: null,
  },
  {
    id: "ORD-2026-006",
    auctionTitle: "Patek Philippe Nautilus 5711/1A",
    buyer: "Merve Aksoy",
    seller: "Prestige Saat",
    hammerPrice: 2150000,
    commission: 215000,
    totalAmount: 2365000,
    status: "pending_payment",
    paymentStatus: "pending",
    createdAt: "2026-02-21T16:00:00Z",
    trackingNumber: null,
  },
  {
    id: "ORD-2026-007",
    auctionTitle: "Mercedes-Benz 300SL Gullwing",
    buyer: "Mustafa Celik",
    seller: "Klasik Oto Galeri",
    hammerPrice: 4250000,
    commission: 425000,
    totalAmount: 4675000,
    status: "refunded",
    paymentStatus: "refunded",
    createdAt: "2026-02-18T09:00:00Z",
    trackingNumber: null,
  },
  {
    id: "ORD-2026-008",
    auctionTitle: "Cartier Love Bileklik",
    buyer: "Elif Yildiz",
    seller: "Mucevherat Dunyasi",
    hammerPrice: 78000,
    commission: 7800,
    totalAmount: 85800,
    status: "shipped",
    paymentStatus: "paid",
    createdAt: "2026-02-19T11:30:00Z",
    trackingNumber: "TR444555666",
  },
];

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "default" | "secondary" | "destructive" | "live" }
> = {
  pending_payment: { label: "Odeme Bekliyor", variant: "warning" },
  processing: { label: "Hazirlaniyor", variant: "default" },
  shipped: { label: "Kargoda", variant: "live" },
  delivered: { label: "Teslim Edildi", variant: "success" },
  completed: { label: "Tamamlandi", variant: "success" },
  cancelled: { label: "Iptal", variant: "destructive" },
  refunded: { label: "Iade Edildi", variant: "destructive" },
};

const paymentConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  paid: { label: "Odendi", variant: "success" },
  pending: { label: "Beklemede", variant: "warning" },
  failed: { label: "Basarisiz", variant: "destructive" },
  refunded: { label: "Iade", variant: "secondary" },
};

export default function AdminOrdersPage() {
  const t = useTranslations("admin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    order: Order | null;
  }>({ open: false, order: null });
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    order: Order | null;
  }>({ open: false, order: null });
  const [refundReason, setRefundReason] = useState("");

  const { data: ordersResponse } = useAdminOrders({
    page: currentPage,
    limit: pageSize,
    search: search || "",
    status: statusFilter || "",
  });

  const apiOrders: Order[] = (ordersResponse?.data || []).map((o: Record<string, unknown>) => ({
    id: o.id as string,
    auctionTitle: (o.auctionTitle || o.title || "") as string,
    buyer: (o.buyer || o.buyerName || "") as string,
    seller: (o.seller || o.sellerName || "") as string,
    hammerPrice: (o.hammerPrice || o.price || 0) as number,
    commission: (o.commission || 0) as number,
    totalAmount: (o.totalAmount || o.total || 0) as number,
    status: (o.status || "processing") as string,
    paymentStatus: (o.paymentStatus || "pending") as string,
    paymentMethod: (o.paymentMethod || "") as string,
    orderDate: (o.orderDate || o.createdAt || "") as string,
  }));

  const allOrders: Order[] = apiOrders.length > 0 ? apiOrders : mockOrders;

  const filteredData = allOrders.filter((order: Order) => {
    const matchesSearch =
      !search ||
      order.auctionTitle.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.buyer.toLowerCase().includes(search.toLowerCase()) ||
      order.seller.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesPayment =
      !paymentFilter || order.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalRevenue = allOrders
    .filter((o: Order) => o.paymentStatus === "paid")
    .reduce((sum: number, o: Order) => sum + o.totalAmount, 0);
  const pendingPayments = allOrders
    .filter((o: Order) => o.paymentStatus === "pending")
    .reduce((sum: number, o: Order) => sum + o.totalAmount, 0);
  const completedOrders = allOrders.filter(
    (o: Order) => o.status === "completed" || o.status === "delivered"
  ).length;
  const totalCommission = allOrders
    .filter((o: Order) => o.paymentStatus === "paid")
    .reduce((sum: number, o: Order) => sum + o.commission, 0);

  const columns: Column<Order>[] = [
    {
      key: "id",
      header: "Siparis No",
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs font-medium">{item.id}</span>
      ),
    },
    {
      key: "auctionTitle",
      header: "Muzayede",
      sortable: true,
      render: (item) => (
        <div className="max-w-[180px]">
          <p className="truncate text-sm font-medium">{item.auctionTitle}</p>
        </div>
      ),
    },
    {
      key: "buyer",
      header: "Alici",
      render: (item) => <span className="text-sm">{item.buyer}</span>,
    },
    {
      key: "seller",
      header: "Satici",
      render: (item) => <span className="text-sm">{item.seller}</span>,
    },
    {
      key: "hammerPrice",
      header: "Satis Fiyati",
      sortable: true,
      className: "text-right",
      render: (item) => (
        <span className="tabular-nums">{formatCurrency(item.hammerPrice)}</span>
      ),
    },
    {
      key: "totalAmount",
      header: "Toplam",
      sortable: true,
      className: "text-right",
      render: (item) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(item.totalAmount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: (item) => {
        const config = statusConfig[item.status] || statusConfig.processing;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "paymentStatus",
      header: "Odeme",
      render: (item) => {
        const config =
          paymentConfig[item.paymentStatus] || paymentConfig.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Tarih",
      sortable: true,
      render: (item) => (
        <span className="text-xs">
          {formatDate(item.createdAt, "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "text-right w-40",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Detay"
            onClick={() => setDetailDialog({ open: true, order: item })}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Fatura">
            <FileText className="h-4 w-4" />
          </Button>
          {item.paymentStatus === "paid" && item.status !== "refunded" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-500"
              title="Iade"
              onClick={() => setRefundDialog({ open: true, order: item })}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Siparis Yonetimi</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Tum siparisleri takip edin ve yonetin
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Rapor Indir
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Siparis"
          value={String(allOrders.length)}
          change="+18%"
          changeType="positive"
          icon={Package}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatCard
          title="Bekleyen Odeme"
          value={formatCurrency(pendingPayments)}
          change={`${allOrders.filter((o: Order) => o.paymentStatus === "pending").length} siparis`}
          changeType="neutral"
          icon={Clock}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatCard
          title="Tamamlanan"
          value={String(completedOrders)}
          change="+12%"
          changeType="positive"
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
        <StatCard
          title="Toplam Gelir"
          value={formatCurrency(totalRevenue)}
          description={`Komisyon: ${formatCurrency(totalCommission)}`}
          icon={DollarSign}
          iconColor="text-primary-500"
          iconBgColor="bg-primary-500/10"
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={paginatedData}
        searchPlaceholder="Siparis ara..."
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        pageSize={pageSize}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredData.length}
        onPageChange={setCurrentPage}
        emptyMessage="Siparis bulunamadi"
        filters={
          <>
            <Select
              options={[
                { value: "", label: "Tum Durumlar" },
                { value: "pending_payment", label: "Odeme Bekliyor" },
                { value: "processing", label: "Hazirlaniyor" },
                { value: "shipped", label: "Kargoda" },
                { value: "delivered", label: "Teslim Edildi" },
                { value: "completed", label: "Tamamlandi" },
                { value: "refunded", label: "Iade Edildi" },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-40"
            />
            <Select
              options={[
                { value: "", label: "Tum Odemeler" },
                { value: "paid", label: "Odendi" },
                { value: "pending", label: "Beklemede" },
                { value: "refunded", label: "Iade" },
              ]}
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-36"
            />
          </>
        }
      />

      {/* Order Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Siparis Detayi</DialogTitle>
          </DialogHeader>
          {detailDialog.order && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[var(--muted-foreground)]">Siparis No</p>
                  <p className="font-mono font-medium">{detailDialog.order.id}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Tarih</p>
                  <p className="font-medium">
                    {formatDate(detailDialog.order.createdAt, "dd MMM yyyy HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Alici</p>
                  <p className="font-medium">{detailDialog.order.buyer}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Satici</p>
                  <p className="font-medium">{detailDialog.order.seller}</p>
                </div>
              </div>
              <div className="rounded-lg bg-[var(--muted)] p-4">
                <p className="font-medium">{detailDialog.order.auctionTitle}</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Satis Fiyati</span>
                    <span>{formatCurrency(detailDialog.order.hammerPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Komisyon</span>
                    <span>{formatCurrency(detailDialog.order.commission)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] pt-2 font-medium">
                    <span>Toplam</span>
                    <span>{formatCurrency(detailDialog.order.totalAmount)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-xs text-[var(--muted-foreground)]">Siparis Durumu</p>
                  <Badge
                    variant={
                      (statusConfig[detailDialog.order.status] || statusConfig.processing)
                        .variant
                    }
                    className="mt-1"
                  >
                    {(statusConfig[detailDialog.order.status] || statusConfig.processing).label}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[var(--muted-foreground)]">Odeme Durumu</p>
                  <Badge
                    variant={
                      (
                        paymentConfig[detailDialog.order.paymentStatus] ||
                        paymentConfig.pending
                      ).variant
                    }
                    className="mt-1"
                  >
                    {
                      (
                        paymentConfig[detailDialog.order.paymentStatus] ||
                        paymentConfig.pending
                      ).label
                    }
                  </Badge>
                </div>
              </div>
              {detailDialog.order.trackingNumber && (
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Takip Numarasi</p>
                  <p className="mt-1 font-mono text-sm font-medium">
                    {detailDialog.order.trackingNumber}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDetailDialog({ open: false, order: null })}
            >
              Kapat
            </Button>
            <Button variant="outline">
              <Truck className="mr-2 h-4 w-4" />
              Durumu Guncelle
            </Button>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Fatura Olustur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog
        open={refundDialog.open}
        onOpenChange={(open) => setRefundDialog({ ...refundDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iade Olustur</DialogTitle>
            <DialogDescription>
              <strong>{refundDialog.order?.auctionTitle}</strong> siparisi icin iade
              islemini baslatmak istediginizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {refundDialog.order && (
              <div className="rounded-lg bg-[var(--muted)] p-3 text-sm">
                <div className="flex justify-between">
                  <span>Iade Tutari</span>
                  <span className="font-medium">
                    {formatCurrency(refundDialog.order.totalAmount)}
                  </span>
                </div>
              </div>
            )}
            <Textarea
              label="Iade Sebebi"
              placeholder="Iade sebebini yazin..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setRefundDialog({ open: false, order: null });
                setRefundReason("");
              }}
            >
              Vazgec
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRefundDialog({ open: false, order: null });
                setRefundReason("");
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Iade Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
