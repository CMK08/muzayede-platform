"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Plus,
  Edit,
  Trash2,
  Gavel,
  LayoutGrid,
  LayoutList,
  Image as ImageIcon,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatCurrency } from "@/lib/utils";

interface SellerProduct {
  id: string;
  title: string;
  category: string;
  condition: string;
  estimatedPrice: number;
  status: "active" | "in_auction" | "sold" | "draft";
  auctionId: string | null;
  image: string | null;
}

const mockProducts: SellerProduct[] = [
  {
    id: "PRD-001",
    title: "Osmanli Donemi Altin Kupe Seti",
    category: "Antika Taki",
    condition: "good",
    estimatedPrice: 40000,
    status: "in_auction",
    auctionId: "AUC-001",
    image: null,
  },
  {
    id: "PRD-002",
    title: "Antika Osmanli Hancer - 18. Yuzyil",
    category: "Antika",
    condition: "fair",
    estimatedPrice: 30000,
    status: "in_auction",
    auctionId: "AUC-006",
    image: null,
  },
  {
    id: "PRD-003",
    title: "Iznik Cinisi Tabak Koleksiyonu (6 Adet)",
    category: "Antika",
    condition: "good",
    estimatedPrice: 55000,
    status: "in_auction",
    auctionId: "AUC-009",
    image: null,
  },
  {
    id: "PRD-004",
    title: "Hereke Ipek Hali - El Dokuma 4x6m",
    category: "Hali & Kilim",
    condition: "good",
    estimatedPrice: 50000,
    status: "active",
    auctionId: null,
    image: null,
  },
  {
    id: "PRD-005",
    title: "Osmanlica El Yazmasi Kuran-i Kerim",
    category: "El Yazmasi",
    condition: "fair",
    estimatedPrice: 200000,
    status: "draft",
    auctionId: null,
    image: null,
  },
  {
    id: "PRD-006",
    title: "Antika Gumus Caydanlik Seti",
    category: "Antika",
    condition: "like_new",
    estimatedPrice: 25000,
    status: "sold",
    auctionId: null,
    image: null,
  },
  {
    id: "PRD-007",
    title: "Minyatur Tablo - Topkapi Sarayi",
    category: "Sanat",
    condition: "good",
    estimatedPrice: 35000,
    status: "active",
    auctionId: null,
    image: null,
  },
  {
    id: "PRD-008",
    title: "Sedef Kakma Sandik - 19. Yuzyil",
    category: "Antika",
    condition: "fair",
    estimatedPrice: 18000,
    status: "draft",
    auctionId: null,
    image: null,
  },
];

const statusConfig: Record<
  string,
  { label: string; variant: "live" | "success" | "secondary" | "default" }
> = {
  active: { label: "Aktif", variant: "success" },
  in_auction: { label: "Muzayedede", variant: "live" },
  sold: { label: "Satildi", variant: "default" },
  draft: { label: "Taslak", variant: "secondary" },
};

const conditionLabels: Record<string, string> = {
  new: "Sifir",
  like_new: "Sifir Gibi",
  good: "Iyi",
  fair: "Orta",
  poor: "Kotu",
};

export default function MyProductsPage() {
  const t = useTranslations("common");
  const locale = useLocale();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addProductDialog, setAddProductDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    product: SellerProduct | null;
  }>({ open: false, product: null });

  const filteredProducts = mockProducts.filter((p) => {
    const matchesSearch =
      !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Urunlerim</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            {mockProducts.length} urun kayitli
          </p>
        </div>
        <Button onClick={() => setAddProductDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Urun Ekle
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Input
            placeholder="Urun ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64"
          />
          <Select
            options={[
              { value: "", label: "Tum Durumlar" },
              { value: "active", label: "Aktif" },
              { value: "in_auction", label: "Muzayedede" },
              { value: "sold", label: "Satildi" },
              { value: "draft", label: "Taslak" },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Products */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-[var(--muted-foreground)]" />
            <p className="mt-4 text-lg font-medium">Urun bulunamadi</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Ilk urunuzu ekleyerek baslayın
            </p>
            <Button className="mt-4" onClick={() => setAddProductDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Urun Ekle
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const config = statusConfig[product.status] || statusConfig.draft;
            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="relative aspect-[4/3] bg-[var(--muted)]">
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-[var(--muted-foreground)]" />
                  </div>
                  <div className="absolute left-3 top-3">
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  {product.auctionId && (
                    <div className="absolute right-3 top-3">
                      <Badge variant="default" className="font-mono text-xs">
                        {product.auctionId}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-500">
                    {product.category}
                  </p>
                  <h3 className="mt-1 font-display text-sm font-semibold line-clamp-2">
                    {product.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Tahmini Deger
                      </p>
                      <p className="font-bold text-primary-500">
                        {formatCurrency(product.estimatedPrice)}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {conditionLabels[product.condition] || product.condition}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-[var(--border)] pt-3">
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs">
                      <Edit className="mr-1 h-3 w-3" />
                      Duzenle
                    </Button>
                    {!product.auctionId && product.status !== "sold" && (
                      <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs text-primary-500">
                        <Gavel className="mr-1 h-3 w-3" />
                        Muzayede
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() =>
                        setDeleteDialog({ open: true, product })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product) => {
            const config = statusConfig[product.status] || statusConfig.draft;
            return (
              <Card key={product.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)] sm:flex">
                    <ImageIcon className="h-6 w-6 text-[var(--muted-foreground)]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{product.title}</p>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span>{product.category}</span>
                      <span>-</span>
                      <span>{conditionLabels[product.condition]}</span>
                      {product.auctionId && (
                        <>
                          <span>-</span>
                          <span className="font-mono">{product.auctionId}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-primary-500">
                    {formatCurrency(product.estimatedPrice)}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!product.auctionId && product.status !== "sold" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-500">
                        <Gavel className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() =>
                        setDeleteDialog({ open: true, product })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={addProductDialog} onOpenChange={setAddProductDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Urun Ekle</DialogTitle>
            <DialogDescription>
              Urun bilgilerini girin. Urun kaydedildikten sonra muzayedeye atanabilir.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input label="Urun Adi" placeholder="Ornek: Osmanli Donemi Altin Kupe Seti" />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Kategori"
                options={[
                  { value: "antika", label: "Antika" },
                  { value: "mucevher", label: "Mucevher" },
                  { value: "saat", label: "Luks Saat" },
                  { value: "sanat", label: "Sanat" },
                  { value: "otomobil", label: "Klasik Otomobil" },
                  { value: "hali", label: "Hali & Kilim" },
                  { value: "elyazmasi", label: "El Yazmasi" },
                ]}
              />
              <Select
                label="Urun Durumu"
                options={[
                  { value: "new", label: "Sifir" },
                  { value: "like_new", label: "Sifir Gibi" },
                  { value: "good", label: "Iyi" },
                  { value: "fair", label: "Orta" },
                  { value: "poor", label: "Kotu" },
                ]}
              />
            </div>
            <Textarea
              label="Aciklama"
              rows={4}
              placeholder="Urun aciklamasini yazin..."
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tahmini Deger (TL)"
                type="number"
                placeholder="0"
              />
              <Input label="Konum" placeholder="Istanbul, Turkiye" />
            </div>
            <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Fotograflari yuklemek icin tiklayin veya surukleyin
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Maks. 10 fotograf, her biri en fazla 5MB
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddProductDialog(false)}>
              Vazgec
            </Button>
            <Button variant="secondary" onClick={() => setAddProductDialog(false)}>
              Taslak Kaydet
            </Button>
            <Button onClick={() => setAddProductDialog(false)}>
              Urun Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Urunu Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteDialog.product?.title}</strong> urununu silmek
              istediginizden emin misiniz?
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
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
