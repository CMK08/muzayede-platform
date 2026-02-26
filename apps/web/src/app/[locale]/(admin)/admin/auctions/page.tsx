"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Eye,
  Edit,
  Play,
  Square,
  Ban,
  Send,
  MoreVertical,
  Gavel,
  Download,
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

interface Auction {
  id: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  currentPrice: number;
  startingPrice: number;
  bidCount: number;
  seller: string;
  category: string;
  [key: string]: unknown;
}

const mockAuctions: Auction[] = [
  {
    id: "AUC-001",
    title: "Osmanli Donemi Altin Kupe Seti",
    type: "english",
    status: "active",
    startDate: "2026-02-15T10:00:00Z",
    endDate: "2026-03-05T22:00:00Z",
    currentPrice: 42500,
    startingPrice: 15000,
    bidCount: 28,
    seller: "Antika Dunyasi",
    category: "Antika Taki",
  },
  {
    id: "AUC-002",
    title: "1967 Ford Mustang Shelby GT500",
    type: "english",
    status: "active",
    startDate: "2026-02-20T10:00:00Z",
    endDate: "2026-03-02T20:00:00Z",
    currentPrice: 875000,
    startingPrice: 500000,
    bidCount: 15,
    seller: "Klasik Oto Galeri",
    category: "Klasik Otomobil",
  },
  {
    id: "AUC-003",
    title: "Rolex Daytona 116500LN Sifir",
    type: "english",
    status: "upcoming",
    startDate: "2026-03-10T14:00:00Z",
    endDate: "2026-03-20T22:00:00Z",
    currentPrice: 0,
    startingPrice: 850000,
    bidCount: 0,
    seller: "Prestige Saat",
    category: "Luks Saat",
  },
  {
    id: "AUC-004",
    title: "Yagli Boya Tablo - Istanbul Bogazi Manzarasi",
    type: "sealed",
    status: "ended",
    startDate: "2026-01-15T10:00:00Z",
    endDate: "2026-02-15T22:00:00Z",
    currentPrice: 68000,
    startingPrice: 25000,
    bidCount: 19,
    seller: "Sanat Galerisi",
    category: "Sanat",
  },
  {
    id: "AUC-005",
    title: "Elmas Yuzuk - 3.5 Karat VVS1",
    type: "dutch",
    status: "draft",
    startDate: "2026-03-15T10:00:00Z",
    endDate: "2026-03-25T22:00:00Z",
    currentPrice: 0,
    startingPrice: 120000,
    bidCount: 0,
    seller: "Mucevherat Dunyasi",
    category: "Mucevher",
  },
  {
    id: "AUC-006",
    title: "Antika Osmanli Hancer - 18. Yuzyil",
    type: "english",
    status: "active",
    startDate: "2026-02-18T12:00:00Z",
    endDate: "2026-03-08T20:00:00Z",
    currentPrice: 35000,
    startingPrice: 10000,
    bidCount: 22,
    seller: "Tarih Koleksiyonlari",
    category: "Antika",
  },
  {
    id: "AUC-007",
    title: "Hereke Ipek Hali - El Dokuma",
    type: "english",
    status: "cancelled",
    startDate: "2026-02-01T10:00:00Z",
    endDate: "2026-02-20T22:00:00Z",
    currentPrice: 0,
    startingPrice: 45000,
    bidCount: 0,
    seller: "Anadolu El Sanatlari",
    category: "Hali & Kilim",
  },
  {
    id: "AUC-008",
    title: "Patek Philippe Nautilus 5711/1A",
    type: "english",
    status: "active",
    startDate: "2026-02-22T14:00:00Z",
    endDate: "2026-03-12T22:00:00Z",
    currentPrice: 2150000,
    startingPrice: 1500000,
    bidCount: 8,
    seller: "Prestige Saat",
    category: "Luks Saat",
  },
  {
    id: "AUC-009",
    title: "Iznik Cinisi Tabak Koleksiyonu (6 Adet)",
    type: "sealed",
    status: "upcoming",
    startDate: "2026-03-05T10:00:00Z",
    endDate: "2026-03-15T22:00:00Z",
    currentPrice: 0,
    startingPrice: 55000,
    bidCount: 0,
    seller: "Osmanlica Antik",
    category: "Antika",
  },
  {
    id: "AUC-010",
    title: "Mercedes-Benz 300SL Gullwing 1955",
    type: "english",
    status: "ended",
    startDate: "2026-01-10T10:00:00Z",
    endDate: "2026-02-10T22:00:00Z",
    currentPrice: 4250000,
    startingPrice: 3000000,
    bidCount: 34,
    seller: "Klasik Oto Galeri",
    category: "Klasik Otomobil",
  },
  {
    id: "AUC-011",
    title: "Cartier Love Bileklik - Altin",
    type: "english",
    status: "active",
    startDate: "2026-02-25T10:00:00Z",
    endDate: "2026-03-07T22:00:00Z",
    currentPrice: 78000,
    startingPrice: 50000,
    bidCount: 11,
    seller: "Mucevherat Dunyasi",
    category: "Mucevher",
  },
  {
    id: "AUC-012",
    title: "Osmanlica El Yazmasi Kuran-i Kerim",
    type: "sealed",
    status: "draft",
    startDate: "2026-03-20T10:00:00Z",
    endDate: "2026-04-05T22:00:00Z",
    currentPrice: 0,
    startingPrice: 200000,
    bidCount: 0,
    seller: "Tarih Koleksiyonlari",
    category: "El Yazmasi",
  },
];

const statusConfig: Record<
  string,
  { label: string; variant: "live" | "success" | "warning" | "secondary" | "destructive" | "default" }
> = {
  active: { label: "Aktif", variant: "live" },
  upcoming: { label: "Yakinda", variant: "secondary" },
  ended: { label: "Sona Erdi", variant: "success" },
  cancelled: { label: "Iptal", variant: "destructive" },
  draft: { label: "Taslak", variant: "default" },
};

const typeConfig: Record<string, { label: string; variant: "default" | "outline" | "secondary" }> = {
  english: { label: "Ingiliz Acik Artirma", variant: "default" },
  dutch: { label: "Hollanda Acik Artirma", variant: "outline" },
  sealed: { label: "Kapali Zarf", variant: "secondary" },
};

export default function AdminAuctionsPage() {
  const t = useTranslations("admin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    auctionId: string;
    auctionTitle: string;
  }>({ open: false, action: "", auctionId: "", auctionTitle: "" });
  const [createDialog, setCreateDialog] = useState(false);

  const filteredData = mockAuctions.filter((auction) => {
    const matchesSearch =
      !search ||
      auction.title.toLowerCase().includes(search.toLowerCase()) ||
      auction.id.toLowerCase().includes(search.toLowerCase()) ||
      auction.seller.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || auction.status === statusFilter;
    const matchesType = !typeFilter || auction.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((_, i) => i)));
    }
  };

  const handleAction = (action: string, auction: Auction) => {
    if (["cancel", "end", "delete"].includes(action)) {
      setConfirmDialog({
        open: true,
        action,
        auctionId: auction.id,
        auctionTitle: auction.title,
      });
    }
  };

  const confirmAction = () => {
    setConfirmDialog({ open: false, action: "", auctionId: "", auctionTitle: "" });
  };

  const actionLabels: Record<string, string> = {
    cancel: "Iptal Et",
    end: "Sonlandir",
    delete: "Sil",
  };

  const columns: Column<Auction>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      className: "w-28",
      render: (item) => (
        <span className="font-mono text-xs text-[var(--muted-foreground)]">
          {item.id}
        </span>
      ),
    },
    {
      key: "title",
      header: t("auctionTitle"),
      sortable: true,
      render: (item) => (
        <div className="max-w-[200px]">
          <p className="truncate font-medium">{item.title}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {item.category} - {item.seller}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tur",
      render: (item) => {
        const config = typeConfig[item.type] || typeConfig.english;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "status",
      header: "Durum",
      render: (item) => {
        const config = statusConfig[item.status] || statusConfig.draft;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "startDate",
      header: "Baslangic",
      sortable: true,
      render: (item) => (
        <span className="text-xs">
          {formatDate(item.startDate, "dd MMM yyyy HH:mm")}
        </span>
      ),
    },
    {
      key: "endDate",
      header: t("endDate"),
      sortable: true,
      render: (item) => (
        <span className="text-xs">
          {formatDate(item.endDate, "dd MMM yyyy HH:mm")}
        </span>
      ),
    },
    {
      key: "currentPrice",
      header: "Guncel Fiyat",
      sortable: true,
      className: "text-right",
      render: (item) => (
        <span className="font-medium tabular-nums">
          {item.currentPrice > 0
            ? formatCurrency(item.currentPrice)
            : formatCurrency(item.startingPrice)}
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
      className: "text-right w-40",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Goruntule">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Duzenle">
            <Edit className="h-4 w-4" />
          </Button>
          {item.status === "draft" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-500"
              title="Yayinla"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
          {item.status === "upcoming" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-500"
              title="Baslat"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {item.status === "active" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-500"
              title="Sonlandir"
              onClick={() => handleAction("end", item)}
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
          {(item.status === "active" || item.status === "upcoming") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500"
              title="Iptal Et"
              onClick={() => handleAction("cancel", item)}
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
          <p className="text-2xl font-bold">{mockAuctions.length}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Toplam Muzayede</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-emerald-500">
            {mockAuctions.filter((a) => a.status === "active").length}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Aktif</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-blue-500">
            {mockAuctions.filter((a) => a.status === "upcoming").length}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Yakinda</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-amber-500">
            {mockAuctions.filter((a) => a.status === "draft").length}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Taslak</p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={paginatedData}
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
        totalItems={filteredData.length}
        onPageChange={setCurrentPage}
        selectedRows={selectedRows}
        onRowSelect={handleRowSelect}
        onSelectAll={handleSelectAll}
        emptyMessage="Muzayede bulunamadi"
        filters={
          <>
            <Select
              options={[
                { value: "", label: "Tum Durumlar" },
                { value: "active", label: "Aktif" },
                { value: "upcoming", label: "Yakinda" },
                { value: "ended", label: "Sona Erdi" },
                { value: "cancelled", label: "Iptal" },
                { value: "draft", label: "Taslak" },
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
                { value: "english", label: "Ingiliz" },
                { value: "dutch", label: "Hollanda" },
                { value: "sealed", label: "Kapali Zarf" },
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
        bulkActions={
          <Button variant="destructive" size="sm" className="h-7 text-xs">
            Secilenleri Iptal Et
          </Button>
        }
      />

      {/* Confirm Action Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "cancel" && "Muzayedeyi Iptal Et"}
              {confirmDialog.action === "end" && "Muzayedeyi Sonlandir"}
              {confirmDialog.action === "delete" && "Muzayedeyi Sil"}
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
              onClick={() =>
                setConfirmDialog({ ...confirmDialog, open: false })
              }
            >
              Vazgec
            </Button>
            <Button variant="destructive" onClick={confirmAction}>
              {actionLabels[confirmDialog.action] || "Onayla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Auction Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Muzayede Olustur</DialogTitle>
            <DialogDescription>
              Muzayede bilgilerini doldurun ve yayina alin.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input label="Muzayede Adi" placeholder="Ornek: Osmanli Donemi Altin Kupe Seti" />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Muzayede Turu"
                options={[
                  { value: "english", label: "Ingiliz Acik Artirma" },
                  { value: "dutch", label: "Hollanda Acik Artirma" },
                  { value: "sealed", label: "Kapali Zarf" },
                ]}
              />
              <Select
                label="Kategori"
                options={[
                  { value: "antika", label: "Antika" },
                  { value: "mucevher", label: "Mucevher" },
                  { value: "saat", label: "Luks Saat" },
                  { value: "sanat", label: "Sanat" },
                  { value: "otomobil", label: "Klasik Otomobil" },
                  { value: "hali", label: "Hali & Kilim" },
                ]}
              />
            </div>
            <Textarea
              label="Aciklama"
              placeholder="Muzayede aciklamasini yazin..."
              rows={4}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Baslangic Fiyati (TL)"
                type="number"
                placeholder="0"
              />
              <Input
                label="Minimum Artis (TL)"
                type="number"
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Baslangic Tarihi" type="datetime-local" />
              <Input label="Bitis Tarihi" type="datetime-local" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Vazgec
            </Button>
            <Button variant="secondary" onClick={() => setCreateDialog(false)}>
              Taslak Kaydet
            </Button>
            <Button onClick={() => setCreateDialog(false)}>
              <Gavel className="mr-2 h-4 w-4" />
              Olustur ve Yayinla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
