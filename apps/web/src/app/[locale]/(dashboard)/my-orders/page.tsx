"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Package,
  Truck,
  CheckCircle2,
  CreditCard,
  FileText,
  RotateCcw,
  Clock,
  Image as ImageIcon,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderItem {
  id: string;
  auctionTitle: string;
  image: string | null;
  hammerPrice: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  trackingNumber: string | null;
  shippingCompany: string | null;
  orderDate: string;
  deliveryDate: string | null;
  sellerName: string;
}

const mockOrders: OrderItem[] = [
  {
    id: "ORD-2026-001",
    auctionTitle: "Yagli Boya Tablo - Istanbul Bogazi",
    image: null,
    hammerPrice: 68000,
    totalAmount: 74800,
    status: "delivered",
    paymentStatus: "paid",
    trackingNumber: "TR123456789",
    shippingCompany: "Yurtici Kargo",
    orderDate: "2026-02-15T22:00:00Z",
    deliveryDate: "2026-02-22T14:30:00Z",
    sellerName: "Sanat Galerisi",
  },
  {
    id: "ORD-2026-002",
    auctionTitle: "Cartier Love Bileklik - Altin",
    image: null,
    hammerPrice: 78000,
    totalAmount: 85800,
    status: "shipped",
    paymentStatus: "paid",
    trackingNumber: "TR444555666",
    shippingCompany: "Aras Kargo",
    orderDate: "2026-02-19T11:30:00Z",
    deliveryDate: null,
    sellerName: "Mucevherat Dunyasi",
  },
  {
    id: "ORD-2026-003",
    auctionTitle: "Osmanli Donemi Altin Kupe Seti",
    image: null,
    hammerPrice: 42500,
    totalAmount: 46750,
    status: "pending_payment",
    paymentStatus: "pending",
    trackingNumber: null,
    shippingCompany: null,
    orderDate: "2026-02-25T15:30:00Z",
    deliveryDate: null,
    sellerName: "Antika Dunyasi",
  },
  {
    id: "ORD-2026-004",
    auctionTitle: "Patek Philippe Nautilus 5711/1A",
    image: null,
    hammerPrice: 2150000,
    totalAmount: 2365000,
    status: "pending_payment",
    paymentStatus: "pending",
    trackingNumber: null,
    shippingCompany: null,
    orderDate: "2026-02-26T09:00:00Z",
    deliveryDate: null,
    sellerName: "Prestige Saat",
  },
  {
    id: "ORD-2026-005",
    auctionTitle: "Mercedes-Benz 300SL Gullwing 1955",
    image: null,
    hammerPrice: 4250000,
    totalAmount: 4675000,
    status: "completed",
    paymentStatus: "paid",
    trackingNumber: "TR111222333",
    shippingCompany: "Ozel Teslimat",
    orderDate: "2026-02-10T22:00:00Z",
    deliveryDate: "2026-02-18T10:00:00Z",
    sellerName: "Klasik Oto Galeri",
  },
];

const statusConfig: Record<
  string,
  { label: string; variant: "live" | "success" | "warning" | "default" | "secondary" | "destructive" }
> = {
  pending_payment: { label: "Odeme Bekliyor", variant: "warning" },
  processing: { label: "Hazirlaniyor", variant: "default" },
  shipped: { label: "Kargoda", variant: "live" },
  delivered: { label: "Teslim Edildi", variant: "success" },
  completed: { label: "Tamamlandi", variant: "success" },
  cancelled: { label: "Iptal", variant: "destructive" },
};

export default function MyOrdersPage() {
  const t = useTranslations("common");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState("all");
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    order: OrderItem | null;
  }>({ open: false, order: null });
  const [refundReason, setRefundReason] = useState("");
  const [trackingDialog, setTrackingDialog] = useState<{
    open: boolean;
    order: OrderItem | null;
  }>({ open: false, order: null });

  const filterOrders = (tab: string): OrderItem[] => {
    switch (tab) {
      case "pending":
        return mockOrders.filter((o) => o.status === "pending_payment");
      case "shipped":
        return mockOrders.filter((o) => o.status === "shipped");
      case "delivered":
        return mockOrders.filter((o) => o.status === "delivered");
      case "completed":
        return mockOrders.filter((o) => o.status === "completed");
      default:
        return mockOrders;
    }
  };

  const orders = filterOrders(activeTab);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Siparislerim</h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Tum siparislerinizi goruntuleyin ve takip edin
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Tumu ({mockOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Odeme Bekliyor ({mockOrders.filter((o) => o.status === "pending_payment").length})
          </TabsTrigger>
          <TabsTrigger value="shipped">
            Kargoda ({mockOrders.filter((o) => o.status === "shipped").length})
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Teslim ({mockOrders.filter((o) => o.status === "delivered").length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Tamamlanan ({mockOrders.filter((o) => o.status === "completed").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-[var(--muted-foreground)]" />
                  <p className="mt-4 font-medium">Siparis bulunamadi</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Bu kategoride siparisınız yok
                  </p>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => {
                const config = statusConfig[order.status] || statusConfig.processing;
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-mono text-xs text-[var(--muted-foreground)]">
                            {order.id}
                          </span>
                          <span className="text-[var(--muted-foreground)]">-</span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {formatDate(order.orderDate, "dd MMM yyyy")}
                          </span>
                        </div>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>

                      {/* Body */}
                      <div className="flex gap-4 p-4">
                        <div className="hidden h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--muted)] sm:flex">
                          <ImageIcon className="h-8 w-8 text-[var(--muted-foreground)]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-display font-semibold">
                            {order.auctionTitle}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            Satici: {order.sellerName}
                          </p>
                          <div className="mt-3 flex flex-wrap items-end gap-4">
                            <div>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Satis Fiyati
                              </p>
                              <p className="font-medium">
                                {formatCurrency(order.hammerPrice)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Toplam
                              </p>
                              <p className="font-bold text-primary-500">
                                {formatCurrency(order.totalAmount)}
                              </p>
                            </div>
                            {order.trackingNumber && (
                              <div>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  Kargo
                                </p>
                                <p className="font-mono text-xs">
                                  {order.shippingCompany} - {order.trackingNumber}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
                        {order.status === "pending_payment" && (
                          <Button size="sm">
                            <CreditCard className="mr-2 h-3.5 w-3.5" />
                            Simdi Ode
                          </Button>
                        )}
                        {order.status === "shipped" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setTrackingDialog({ open: true, order })
                              }
                            >
                              <Truck className="mr-2 h-3.5 w-3.5" />
                              Kargoyu Takip Et
                            </Button>
                            <Button size="sm" variant="outline">
                              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                              Teslim Aldim
                            </Button>
                          </>
                        )}
                        {order.status === "delivered" && (
                          <Button size="sm" variant="outline">
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                            Teslimi Onayla
                          </Button>
                        )}
                        {order.paymentStatus === "paid" && (
                          <Button size="sm" variant="ghost">
                            <FileText className="mr-2 h-3.5 w-3.5" />
                            Fatura
                          </Button>
                        )}
                        {(order.status === "delivered" ||
                          order.status === "completed") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => {
                              setRefundDialog({ open: true, order });
                              setRefundReason("");
                            }}
                          >
                            <RotateCcw className="mr-2 h-3.5 w-3.5" />
                            Iade Talebi
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Tracking Dialog */}
      <Dialog
        open={trackingDialog.open}
        onOpenChange={(open) => setTrackingDialog({ ...trackingDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kargo Takibi</DialogTitle>
          </DialogHeader>
          {trackingDialog.order && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-[var(--muted)] p-4 text-sm">
                <p className="font-medium">{trackingDialog.order.shippingCompany}</p>
                <p className="mt-1 font-mono">{trackingDialog.order.trackingNumber}</p>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="h-8 w-0.5 bg-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Kargoya Verildi</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(trackingDialog.order.orderDate, "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                      <MapPin className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="h-8 w-0.5 bg-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Transfer Merkezinde</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Istanbul Aktarma Merkezi
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 animate-pulse">
                      <Truck className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Dagitimda</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Tahmini teslimat: Bugun
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setTrackingDialog({ open: false, order: null })}
            >
              Kapat
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
            <DialogTitle>Iade Talebi</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-[var(--muted)] p-3 text-sm">
              <p className="font-medium">{refundDialog.order?.auctionTitle}</p>
              <p className="mt-1 text-[var(--muted-foreground)]">
                Tutar: {formatCurrency(refundDialog.order?.totalAmount || 0)}
              </p>
            </div>
            <Textarea
              label="Iade Sebebi"
              rows={3}
              placeholder="Iade talebinizin sebebini aciklayiniz..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
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
              Iade Talebi Olustur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
