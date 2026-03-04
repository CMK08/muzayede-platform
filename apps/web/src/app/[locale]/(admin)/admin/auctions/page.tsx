"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import {
  Plus,
  Eye,
  Edit,
  Play,
  Square,
  Ban,
  Send,
  Gavel,
  Download,
  Search,
  X,
  Package,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useAdminAuctions,
  useProducts,
  useCreateAuction,
  usePublishAuction,
  useStartAuction,
  useEndAuction,
  useCancelAuction,
} from "@/hooks/use-dashboard";

interface Auction {
  id: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  currentPrice: number;
  startPrice: number;
  minIncrement: number;
  bidCount: number;
  lotCount: number;
  createdBy: string;
  [key: string]: unknown;
}

interface Product {
  id: string;
  title: string;
  shortDescription?: string;
  estimateLow?: number;
  estimateHigh?: number;
  category?: { name: string };
  seller?: { firstName: string; lastName: string };
  media?: { url: string; type: string }[];
  condition?: string;
}

interface LotItem {
  productId: string;
  product: Product;
  lotNumber: number;
  sortOrder: number;
}

// Backend uses uppercase statuses
const statusConfig: Record<
  string,
  { label: string; variant: "live" | "success" | "warning" | "secondary" | "destructive" | "default" }
> = {
  LIVE: { label: "Aktif", variant: "live" },
  PUBLISHED: { label: "Yayinda", variant: "secondary" },
  PRE_BID: { label: "On Teklif", variant: "warning" },
  COMPLETED: { label: "Sona Erdi", variant: "success" },
  CANCELLED: { label: "Iptal", variant: "destructive" },
  DRAFT: { label: "Taslak", variant: "default" },
};

const typeConfig: Record<string, { label: string; variant: "default" | "outline" | "secondary" }> = {
  ENGLISH: { label: "Ingiliz Artirma", variant: "default" },
  DUTCH: { label: "Hollanda Artirma", variant: "outline" },
  SEALED_BID: { label: "Kapali Zarf", variant: "secondary" },
  VICKREY: { label: "Vickrey", variant: "secondary" },
  TIMED: { label: "Zamanli", variant: "outline" },
  HYBRID: { label: "Hibrit", variant: "default" },
};

export default function AdminAuctionsPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Dialogs
  const [createDialog, setCreateDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    auctionId: string;
    auctionTitle: string;
  }>({ open: false, action: "", auctionId: "", auctionTitle: "" });

  // Mutations
  const createAuction = useCreateAuction();
  const publishAuction = usePublishAuction();
  const startAuction = useStartAuction();
  const endAuction = useEndAuction();
  const cancelAuction = useCancelAuction();

  // Fetch auctions
  const { data: auctionsResponse, isLoading } = useAdminAuctions({
    page: currentPage,
    limit: pageSize,
    search: search || "",
    status: statusFilter || "",
    type: typeFilter || "",
  });

  const allAuctions: Auction[] = (auctionsResponse?.data || []).map((a: Record<string, unknown>) => ({
    id: (a.id || "") as string,
    title: (a.title || "") as string,
    type: (a.type || "ENGLISH") as string,
    status: (a.status || "DRAFT") as string,
    startDate: (a.startDate || "") as string,
    endDate: (a.endDate || "") as string,
    currentPrice: (a.currentPrice || 0) as number,
    startPrice: (a.startPrice || 0) as number,
    minIncrement: (a.minIncrement || 0) as number,
    bidCount: (a.bidCount || 0) as number,
    lotCount: (Array.isArray(a.lots) ? (a.lots as unknown[]).length : 0) as number,
    createdBy: (a.createdBy || "") as string,
  }));

  const totalItems = auctionsResponse?.total || allAuctions.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Client-side type filtering (server may not support type filter)
  const filteredData = typeFilter
    ? allAuctions.filter((a) => a.type === typeFilter)
    : allAuctions;

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredData.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filteredData.map((_, i) => i)));
  };

  // Action handlers
  const handleAction = async (action: string, auction: Auction) => {
    if (action === "publish") {
      try {
        await publishAuction.mutateAsync(auction.id);
      } catch (err) {
        console.error("Publish failed:", err);
        alert("Yayinlama basarisiz oldu.");
      }
      return;
    }
    if (action === "start") {
      try {
        await startAuction.mutateAsync(auction.id);
      } catch (err) {
        console.error("Start failed:", err);
        alert("Baslatma basarisiz oldu.");
      }
      return;
    }
    // For destructive actions, show confirmation dialog
    if (["cancel", "end"].includes(action)) {
      setConfirmDialog({
        open: true,
        action,
        auctionId: auction.id,
        auctionTitle: auction.title,
      });
    }
  };

  const confirmAction = async () => {
    const { action, auctionId } = confirmDialog;
    try {
      if (action === "end") {
        await endAuction.mutateAsync(auctionId);
      } else if (action === "cancel") {
        await cancelAuction.mutateAsync(auctionId);
      }
    } catch (err) {
      console.error(`${action} failed:`, err);
      alert(`Islem basarisiz oldu.`);
    }
    setConfirmDialog({ open: false, action: "", auctionId: "", auctionTitle: "" });
  };

  const actionLabels: Record<string, string> = {
    cancel: "Iptal Et",
    end: "Sonlandir",
  };

  // Stats
  const statCounts = {
    total: totalItems,
    active: allAuctions.filter((a) => a.status === "LIVE").length,
    upcoming: allAuctions.filter((a) => a.status === "PUBLISHED" || a.status === "PRE_BID").length,
    draft: allAuctions.filter((a) => a.status === "DRAFT").length,
  };

  const columns: Column<Auction>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      className: "w-20",
      render: (item) => (
        <span className="font-mono text-xs text-[var(--muted-foreground)]">
          {item.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "title",
      header: t("auctionTitle"),
      sortable: true,
      render: (item) => (
        <div className="max-w-[220px]">
          <p className="truncate font-medium">{item.title}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {item.lotCount} lot
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tur",
      render: (item) => {
        const config = typeConfig[item.type] || typeConfig.ENGLISH;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "status",
      header: "Durum",
      render: (item) => {
        const config = statusConfig[item.status] || statusConfig.DRAFT;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "startDate",
      header: "Baslangic",
      sortable: true,
      render: (item) => (
        <span className="text-xs">
          {item.startDate ? formatDate(item.startDate, "dd MMM yyyy HH:mm") : "-"}
        </span>
      ),
    },
    {
      key: "endDate",
      header: t("endDate"),
      sortable: true,
      render: (item) => (
        <span className="text-xs">
          {item.endDate ? formatDate(item.endDate, "dd MMM yyyy HH:mm") : "-"}
        </span>
      ),
    },
    {
      key: "currentPrice",
      header: "Fiyat",
      sortable: true,
      className: "text-right",
      render: (item) => (
        <span className="font-medium tabular-nums">
          {item.currentPrice > 0
            ? formatCurrency(item.currentPrice)
            : formatCurrency(item.startPrice)}
        </span>
      ),
    },
    {
      key: "bidCount",
      header: t("bidCount"),
      sortable: true,
      className: "text-center",
      render: (item) => (
        <span className="tabular-nums">{item.bidCount}</span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "text-right w-44",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Goruntule"
            onClick={() => window.open(`/${locale}/auctions/${item.id}`, '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {item.status === "LIVE" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500"
              title="Canli Yayin"
              onClick={() => window.open(`/${locale}/admin/live-auction?auctionId=${item.id}`, '_blank')}
            >
              <Play className="h-4 w-4 fill-current" />
            </Button>
          )}
          {item.status === "DRAFT" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Duzenle"
                onClick={() => setCreateDialog(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-500"
                title="Yayinla"
                onClick={() => handleAction("publish", item)}
                disabled={publishAuction.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
          {item.status === "PUBLISHED" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-500"
              title="Baslat"
              onClick={() => handleAction("start", item)}
              disabled={startAuction.isPending}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {item.status === "LIVE" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-500"
              title="Sonlandir"
              onClick={() => handleAction("end", item)}
              disabled={endAuction.isPending}
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
          {(item.status === "LIVE" || item.status === "PUBLISHED" || item.status === "DRAFT") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500"
              title="Iptal Et"
              onClick={() => handleAction("cancel", item)}
              disabled={cancelAuction.isPending}
            >
              <Ban className="h-4 w-4" />
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
          <h1 className="font-display text-3xl font-bold">Muzayede Yonetimi</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Tum muzayedeleri goruntuleyebilir ve yonetebilirsiniz
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Disa Aktar
          </Button>
          <Button size="sm" onClick={() => setCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Muzayede
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold">{statCounts.total}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Toplam Muzayede</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-emerald-500">{statCounts.active}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Aktif</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-blue-500">{statCounts.upcoming}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Yakinda</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-amber-500">{statCounts.draft}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Taslak</p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder="Muzayede ara..."
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
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        selectedRows={selectedRows}
        onRowSelect={handleRowSelect}
        onSelectAll={handleSelectAll}
        emptyMessage={isLoading ? "Yukleniyor..." : "Muzayede bulunamadi"}
        filters={
          <>
            <Select
              options={[
                { value: "", label: "Tum Durumlar" },
                { value: "DRAFT", label: "Taslak" },
                { value: "PUBLISHED", label: "Yayinda" },
                { value: "LIVE", label: "Aktif" },
                { value: "COMPLETED", label: "Sona Erdi" },
                { value: "CANCELLED", label: "Iptal" },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-36"
            />
            <Select
              options={[
                { value: "", label: "Tum Turler" },
                { value: "ENGLISH", label: "Ingiliz" },
                { value: "DUTCH", label: "Hollanda" },
                { value: "SEALED_BID", label: "Kapali Zarf" },
                { value: "VICKREY", label: "Vickrey" },
                { value: "TIMED", label: "Zamanli" },
                { value: "HYBRID", label: "Hibrit" },
              ]}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-36"
            />
          </>
        }
      />

      {/* Confirm Action Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "cancel" && "Muzayedeyi Iptal Et"}
              {confirmDialog.action === "end" && "Muzayedeyi Sonlandir"}
            </DialogTitle>
            <DialogDescription>
              <strong>{confirmDialog.auctionTitle}</strong> muzayedesini{" "}
              {actionLabels[confirmDialog.action]?.toLowerCase() || "islem yapmak"}{" "}
              istediginizden emin misiniz? Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Vazgec
            </Button>
            <Button
              variant="destructive"
              onClick={confirmAction}
              disabled={endAuction.isPending || cancelAuction.isPending}
            >
              {endAuction.isPending || cancelAuction.isPending
                ? "Isleniyor..."
                : actionLabels[confirmDialog.action] || "Onayla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Auction Dialog */}
      <CreateAuctionDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        createAuction={createAuction}
      />
    </div>
  );
}

// ===================== Create Auction Dialog =====================

interface CreateAuctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createAuction: ReturnType<typeof useCreateAuction>;
}

function CreateAuctionDialog({ open, onOpenChange, createAuction }: CreateAuctionDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "ENGLISH",
    startPrice: "",
    minIncrement: "",
    reservePrice: "",
    startDate: "",
    endDate: "",
    buyNowPrice: "",
    buyNowEnabled: false,
    antiSnipeMinutes: "5",
    antiSnipeExtension: "3",
    buyerCommissionRate: "5",
    sellerCommissionRate: "10",
  });

  // Lot management
  const [lots, setLots] = useState<LotItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Product fetching
  const { data: productsResponse } = useProducts({
    page: 1,
    limit: 50,
    search: productSearch || "",
  });

  const products: Product[] = (productsResponse?.data || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    title: (p.title || "") as string,
    shortDescription: (p.shortDescription || "") as string,
    estimateLow: (p.estimateLow || 0) as number,
    estimateHigh: (p.estimateHigh || 0) as number,
    category: p.category as Product["category"],
    seller: p.seller as Product["seller"],
    media: p.media as Product["media"],
    condition: (p.condition || "USED") as string,
  }));

  // Filter products that are not already added as lots
  const availableProducts = products.filter(
    (p) => !lots.some((l) => l.productId === p.id)
  );

  const updateForm = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addLot = (product: Product) => {
    const nextLotNumber = lots.length + 1;
    setLots((prev) => [
      ...prev,
      {
        productId: product.id,
        product,
        lotNumber: nextLotNumber,
        sortOrder: nextLotNumber,
      },
    ]);
  };

  const removeLot = (productId: string) => {
    setLots((prev) => {
      const filtered = prev.filter((l) => l.productId !== productId);
      return filtered.map((l, i) => ({
        ...l,
        lotNumber: i + 1,
        sortOrder: i + 1,
      }));
    });
  };

  const moveLot = (index: number, direction: "up" | "down") => {
    const newLots = [...lots];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLots.length) return;
    [newLots[index], newLots[targetIndex]] = [newLots[targetIndex], newLots[index]];
    setLots(
      newLots.map((l, i) => ({ ...l, lotNumber: i + 1, sortOrder: i + 1 }))
    );
  };

  const handleSubmit = async (_asDraft: boolean) => {
    setError("");

    if (!form.title.trim()) {
      setError("Muzayede adi zorunludur.");
      setStep(1);
      return;
    }
    if (!form.startPrice || Number(form.startPrice) <= 0) {
      setError("Baslangic fiyati giriniz.");
      setStep(1);
      return;
    }
    if (!form.minIncrement || Number(form.minIncrement) <= 0) {
      setError("Minimum artis miktari giriniz.");
      setStep(1);
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError("Baslangic ve bitis tarihlerini giriniz.");
      setStep(1);
      return;
    }
    if (lots.length === 0) {
      setError("En az bir urun/lot eklemelisiniz.");
      setStep(2);
      return;
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      startPrice: Number(form.startPrice),
      minIncrement: Number(form.minIncrement),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      buyerCommissionRate: Number(form.buyerCommissionRate) / 100,
      sellerCommissionRate: Number(form.sellerCommissionRate) / 100,
      antiSnipeMinutes: Number(form.antiSnipeMinutes) || 5,
      antiSnipeExtension: Number(form.antiSnipeExtension) || 3,
      lots: lots.map((l) => ({
        productId: l.productId,
        lotNumber: l.lotNumber,
        sortOrder: l.sortOrder,
      })),
    };

    if (form.reservePrice && Number(form.reservePrice) > 0) {
      payload.reservePrice = Number(form.reservePrice);
    }
    if (form.buyNowEnabled && form.buyNowPrice && Number(form.buyNowPrice) > 0) {
      payload.buyNowEnabled = true;
      payload.buyNowPrice = Number(form.buyNowPrice);
    }

    try {
      await createAuction.mutateAsync(payload);

      // If not draft, publish is automatic on creation
      // Reset form
      setForm({
        title: "",
        description: "",
        type: "ENGLISH",
        startPrice: "",
        minIncrement: "",
        reservePrice: "",
        startDate: "",
        endDate: "",
        buyNowPrice: "",
        buyNowEnabled: false,
        antiSnipeMinutes: "5",
        antiSnipeExtension: "3",
        buyerCommissionRate: "5",
        sellerCommissionRate: "10",
      });
      setLots([]);
      setStep(1);
      onOpenChange(false);
    } catch (err) {
      console.error("Create auction failed:", err);
      setError("Muzayede olusturma basarisiz oldu. Lutfen tekrar deneyin.");
    }
  };

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setError("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Yeni Muzayede Olustur</DialogTitle>
          <DialogDescription>
            Muzayede bilgilerini doldurun, urunleri lot olarak ekleyin.
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="mt-2 flex items-center gap-2">
          {[
            { num: 1, label: "Temel Bilgiler" },
            { num: 2, label: "Urunler / Lotlar" },
            { num: 3, label: "Gelismis Ayarlar" },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num as 1 | 2 | 3)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                step === s.num
                  ? "bg-primary-500 text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === s.num
                    ? "bg-white text-primary-500"
                    : "bg-[var(--border)] text-[var(--muted-foreground)]"
                }`}
              >
                {s.num}
              </span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="mt-4 space-y-4">
            <Input
              label="Muzayede Adi *"
              placeholder="Ornek: Bahar Klasik Sanat Muzayedesi"
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Muzayede Turu *"
                options={[
                  { value: "ENGLISH", label: "Ingiliz Acik Artirma" },
                  { value: "DUTCH", label: "Hollanda Acik Artirma" },
                  { value: "SEALED_BID", label: "Kapali Zarf" },
                  { value: "VICKREY", label: "Vickrey (2. en yuksek)" },
                  { value: "TIMED", label: "Zamanli Online" },
                  { value: "HYBRID", label: "Hibrit (Online + Salon)" },
                ]}
                value={form.type}
                onChange={(e) => updateForm("type", e.target.value)}
              />
              <Input
                label="Baslangic Fiyati (TL) *"
                type="number"
                placeholder="0"
                value={form.startPrice}
                onChange={(e) => updateForm("startPrice", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Minimum Artis (TL) *"
                type="number"
                placeholder="100"
                value={form.minIncrement}
                onChange={(e) => updateForm("minIncrement", e.target.value)}
              />
              <Input
                label="Reserve Fiyat (TL)"
                type="number"
                placeholder="Opsiyonel"
                value={form.reservePrice}
                onChange={(e) => updateForm("reservePrice", e.target.value)}
              />
            </div>
            <Textarea
              label="Aciklama"
              placeholder="Muzayede aciklamasini yazin..."
              rows={3}
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Baslangic Tarihi *"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => updateForm("startDate", e.target.value)}
              />
              <Input
                label="Bitis Tarihi *"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => updateForm("endDate", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Product/Lot Selection */}
        {step === 2 && (
          <div className="mt-4 space-y-4">
            {/* Search products */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Urun ara... (isim, kategori)"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Available products */}
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
                Mevcut Urunler ({availableProducts.length})
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                {availableProducts.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
                    {products.length === 0 ? "Urun bulunamadi" : "Tum urunler eklendi"}
                  </p>
                ) : (
                  availableProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-[var(--accent)] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Package className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{product.title}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {product.category?.name || "Kategori yok"}
                            {product.estimateLow && product.estimateHigh
                              ? ` | ${formatCurrency(product.estimateLow)} - ${formatCurrency(product.estimateHigh)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 shrink-0 h-7 text-xs"
                        onClick={() => addLot(product)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Ekle
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Selected lots */}
            <div>
              <p className="mb-2 text-sm font-medium">
                Secilen Lotlar ({lots.length})
              </p>
              {lots.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-[var(--border)] p-8 text-center">
                  <Package className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    Henuz lot eklenmedi. Yukaridaki listeden urun ekleyin.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 rounded-lg border border-[var(--border)] p-2">
                  {lots.map((lot, index) => (
                    <div
                      key={lot.productId}
                      className="flex items-center gap-2 rounded-md bg-[var(--accent)]/50 px-3 py-2"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                        {lot.lotNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {lot.product.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveLot(index, "up")}
                          disabled={index === 0}
                          className="rounded p-1 hover:bg-[var(--border)] disabled:opacity-30"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveLot(index, "down")}
                          disabled={index === lots.length - 1}
                          className="rounded p-1 hover:bg-[var(--border)] disabled:opacity-30"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeLot(lot.productId)}
                          className="rounded p-1 text-red-500 hover:bg-red-500/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Advanced Settings */}
        {step === 3 && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Alici Komisyonu (%)"
                type="number"
                placeholder="5"
                value={form.buyerCommissionRate}
                onChange={(e) => updateForm("buyerCommissionRate", e.target.value)}
              />
              <Input
                label="Satici Komisyonu (%)"
                type="number"
                placeholder="10"
                value={form.sellerCommissionRate}
                onChange={(e) => updateForm("sellerCommissionRate", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Anti-Snipe Suresi (dk)"
                type="number"
                placeholder="5"
                value={form.antiSnipeMinutes}
                onChange={(e) => updateForm("antiSnipeMinutes", e.target.value)}
              />
              <Input
                label="Anti-Snipe Uzatma (dk)"
                type="number"
                placeholder="3"
                value={form.antiSnipeExtension}
                onChange={(e) => updateForm("antiSnipeExtension", e.target.value)}
              />
            </div>
            <div className="rounded-lg border border-[var(--border)] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.buyNowEnabled}
                  onChange={(e) => updateForm("buyNowEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-primary-500"
                />
                <div>
                  <p className="text-sm font-medium">Hemen Al Secenegi</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Kullanicilar belirlenen fiyattan dogrudan satin alabilir
                  </p>
                </div>
              </label>
              {form.buyNowEnabled && (
                <div className="mt-3">
                  <Input
                    label="Hemen Al Fiyati (TL)"
                    type="number"
                    placeholder="0"
                    value={form.buyNowPrice}
                    onChange={(e) => updateForm("buyNowPrice", e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>
              Geri
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgec
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((step + 1) as 1 | 2 | 3)}>
              Devam
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => handleSubmit(true)}
                disabled={createAuction.isPending}
              >
                {createAuction.isPending ? "Kaydediliyor..." : "Taslak Kaydet"}
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={createAuction.isPending}
              >
                <Gavel className="mr-2 h-4 w-4" />
                {createAuction.isPending ? "Olusturuluyor..." : "Olustur"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
