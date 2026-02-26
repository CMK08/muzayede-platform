"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  Edit,
  Trash2,
  Plus,
  Upload,
  Gavel,
  Package,
  Image as ImageIcon,
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
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  category: string;
  seller: string;
  sellerAvatar: string | null;
  condition: string;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  isActive: boolean;
  thumbnail: string | null;
  auctionId: string | null;
  createdAt: string;
  [key: string]: unknown;
}

const mockProducts: Product[] = [
  {
    id: "PRD-001",
    title: "Osmanli Donemi Altin Kupe Seti",
    category: "Antika Taki",
    seller: "Antika Dunyasi",
    sellerAvatar: null,
    condition: "good",
    estimatedPriceMin: 30000,
    estimatedPriceMax: 50000,
    isActive: true,
    thumbnail: null,
    auctionId: "AUC-001",
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "PRD-002",
    title: "1967 Ford Mustang Shelby GT500",
    category: "Klasik Otomobil",
    seller: "Klasik Oto Galeri",
    sellerAvatar: null,
    condition: "like_new",
    estimatedPriceMin: 700000,
    estimatedPriceMax: 1000000,
    isActive: true,
    thumbnail: null,
    auctionId: "AUC-002",
    createdAt: "2026-01-15T14:00:00Z",
  },
  {
    id: "PRD-003",
    title: "Rolex Daytona 116500LN",
    category: "Luks Saat",
    seller: "Prestige Saat",
    sellerAvatar: null,
    condition: "new",
    estimatedPriceMin: 800000,
    estimatedPriceMax: 1300000,
    isActive: true,
    thumbnail: null,
    auctionId: "AUC-003",
    createdAt: "2026-02-01T09:00:00Z",
  },
  {
    id: "PRD-004",
    title: "Yagli Boya Tablo - Istanbul Bogazi",
    category: "Sanat",
    seller: "Sanat Galerisi",
    sellerAvatar: null,
    condition: "good",
    estimatedPriceMin: 40000,
    estimatedPriceMax: 80000,
    isActive: false,
    thumbnail: null,
    auctionId: null,
    createdAt: "2025-12-20T11:30:00Z",
  },
  {
    id: "PRD-005",
    title: "Elmas Yuzuk - 3.5 Karat VVS1",
    category: "Mucevher",
    seller: "Mucevherat Dunyasi",
    sellerAvatar: null,
    condition: "new",
    estimatedPriceMin: 100000,
    estimatedPriceMax: 150000,
    isActive: true,
    thumbnail: null,
    auctionId: null,
    createdAt: "2026-02-10T16:00:00Z",
  },
  {
    id: "PRD-006",
    title: "Antika Osmanli Hancer - 18. Yuzyil",
    category: "Antika",
    seller: "Tarih Koleksiyonlari",
    sellerAvatar: null,
    condition: "fair",
    estimatedPriceMin: 20000,
    estimatedPriceMax: 40000,
    isActive: true,
    thumbnail: null,
    auctionId: "AUC-006",
    createdAt: "2026-01-25T13:00:00Z",
  },
  {
    id: "PRD-007",
    title: "Hereke Ipek Hali - El Dokuma 4x6m",
    category: "Hali & Kilim",
    seller: "Anadolu El Sanatlari",
    sellerAvatar: null,
    condition: "good",
    estimatedPriceMin: 35000,
    estimatedPriceMax: 60000,
    isActive: false,
    thumbnail: null,
    auctionId: null,
    createdAt: "2025-11-05T10:00:00Z",
  },
  {
    id: "PRD-008",
    title: "Patek Philippe Nautilus 5711/1A",
    category: "Luks Saat",
    seller: "Prestige Saat",
    sellerAvatar: null,
    condition: "like_new",
    estimatedPriceMin: 1800000,
    estimatedPriceMax: 2500000,
    isActive: true,
    thumbnail: null,
    auctionId: "AUC-008",
    createdAt: "2026-02-05T15:30:00Z",
  },
  {
    id: "PRD-009",
    title: "Iznik Cinisi Tabak Koleksiyonu (6 Adet)",
    category: "Antika",
    seller: "Osmanlica Antik",
    sellerAvatar: null,
    condition: "good",
    estimatedPriceMin: 40000,
    estimatedPriceMax: 70000,
    isActive: true,
    thumbnail: null,
    auctionId: "AUC-009",
    createdAt: "2026-02-08T12:00:00Z",
  },
  {
    id: "PRD-010",
    title: "Cartier Love Bileklik - 18K Altin",
    category: "Mucevher",
    seller: "Mucevherat Dunyasi",
    sellerAvatar: null,
    condition: "new",
    estimatedPriceMin: 60000,
    estimatedPriceMax: 90000,
    isActive: true,
    thumbnail: null,
    auctionId: "AUC-011",
    createdAt: "2026-02-12T09:45:00Z",
  },
];

const conditionConfig: Record<
  string,
  { label: string; variant: "success" | "default" | "secondary" | "warning" | "destructive" }
> = {
  new: { label: "Sifir", variant: "success" },
  like_new: { label: "Sifir Gibi", variant: "default" },
  good: { label: "Iyi", variant: "secondary" },
  fair: { label: "Orta", variant: "warning" },
  poor: { label: "Kotu", variant: "destructive" },
};

export default function AdminProductsPage() {
  const t = useTranslations("admin");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });

  const filteredData = mockProducts.filter((product) => {
    const matchesSearch =
      !search ||
      product.title.toLowerCase().includes(search.toLowerCase()) ||
      product.id.toLowerCase().includes(search.toLowerCase()) ||
      product.seller.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !categoryFilter || product.category === categoryFilter;
    const matchesCondition =
      !conditionFilter || product.condition === conditionFilter;
    const matchesActive =
      !activeFilter ||
      (activeFilter === "active" && product.isActive) ||
      (activeFilter === "inactive" && !product.isActive);
    return matchesSearch && matchesCategory && matchesCondition && matchesActive;
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

  const categories = [...new Set(mockProducts.map((p) => p.category))];

  const columns: Column<Product>[] = [
    {
      key: "thumbnail",
      header: "",
      className: "w-16",
      render: (item) => (
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-[var(--muted)]">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-[var(--muted-foreground)]" />
          )}
        </div>
      ),
    },
    {
      key: "title",
      header: "Urun",
      sortable: true,
      render: (item) => (
        <div className="max-w-[200px]">
          <p className="truncate font-medium">{item.title}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{item.id}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      render: (item) => (
        <span className="text-sm">{item.category}</span>
      ),
    },
    {
      key: "seller",
      header: "Satici",
      render: (item) => (
        <span className="text-sm">{item.seller}</span>
      ),
    },
    {
      key: "condition",
      header: "Durum",
      render: (item) => {
        const config = conditionConfig[item.condition] || conditionConfig.good;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "estimatedPriceMin",
      header: "Tahmini Fiyat",
      sortable: true,
      render: (item) => (
        <span className="text-sm tabular-nums">
          {formatCurrency(item.estimatedPriceMin)} -{" "}
          {formatCurrency(item.estimatedPriceMax)}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Aktif",
      render: (item) => (
        <Badge variant={item.isActive ? "success" : "secondary"}>
          {item.isActive ? "Aktif" : "Pasif"}
        </Badge>
      ),
    },
    {
      key: "auctionId",
      header: "Muzayede",
      render: (item) =>
        item.auctionId ? (
          <Badge variant="default" className="font-mono text-xs">
            {item.auctionId}
          </Badge>
        ) : (
          <span className="text-xs text-[var(--muted-foreground)]">-</span>
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
          {!item.auctionId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-500"
              title="Muzayedeye Ata"
            >
              <Gavel className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500"
            title="Sil"
            onClick={() => setDeleteDialog({ open: true, product: item })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Urun Yonetimi</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Platformdaki tum urunleri yonetin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Toplu Yukle
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Urun Ekle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-500" />
            <p className="text-2xl font-bold">{mockProducts.length}</p>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">Toplam Urun</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-emerald-500">
            {mockProducts.filter((p) => p.isActive).length}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Aktif Urun</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-blue-500">
            {mockProducts.filter((p) => p.auctionId).length}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Muzayedede</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-amber-500">
            {mockProducts.filter((p) => !p.auctionId && p.isActive).length}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Atanamadi</p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={paginatedData}
        searchPlaceholder="Urun ara..."
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
        emptyMessage="Urun bulunamadi"
        filters={
          <>
            <Select
              options={[
                { value: "", label: "Tum Kategoriler" },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-40"
            />
            <Select
              options={[
                { value: "", label: "Tum Durumlar" },
                { value: "new", label: "Sifir" },
                { value: "like_new", label: "Sifir Gibi" },
                { value: "good", label: "Iyi" },
                { value: "fair", label: "Orta" },
                { value: "poor", label: "Kotu" },
              ]}
              value={conditionFilter}
              onChange={(e) => {
                setConditionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-32"
            />
            <Select
              options={[
                { value: "", label: "Aktiflik" },
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Pasif" },
              ]}
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-28"
            />
          </>
        }
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Urunu Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteDialog.product?.title}</strong> urununu silmek
              istediginizden emin misiniz? Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, product: null })}
            >
              Vazgec
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialog({ open: false, product: null })}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
