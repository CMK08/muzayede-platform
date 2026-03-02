"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Image as ImageIcon,
  BookOpen,
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Globe,
  Calendar,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { useAdminCms } from "@/hooks/use-dashboard";

// Fallback data
const mockPages = [
  {
    id: "1",
    title: "Hakkimizda",
    slug: "hakkimizda",
    updatedAt: "2026-02-20T10:00:00Z",
    published: true,
  },
  {
    id: "2",
    title: "Nasil Calisir",
    slug: "nasil-calisir",
    updatedAt: "2026-02-18T14:30:00Z",
    published: true,
  },
  {
    id: "3",
    title: "Kullanim Sartlari",
    slug: "kullanim-sartlari",
    updatedAt: "2026-01-15T09:00:00Z",
    published: true,
  },
  {
    id: "4",
    title: "Gizlilik Politikasi",
    slug: "gizlilik-politikasi",
    updatedAt: "2026-01-15T09:00:00Z",
    published: true,
  },
  {
    id: "5",
    title: "KVKK Aydinlatma Metni",
    slug: "kvkk",
    updatedAt: "2026-01-10T11:00:00Z",
    published: true,
  },
  {
    id: "6",
    title: "Iletisim",
    slug: "iletisim",
    updatedAt: "2026-02-01T16:00:00Z",
    published: true,
  },
];

const mockBanners = [
  {
    id: "1",
    title: "Kis Muzayedesi Kampanyasi",
    imageUrl: "/images/banner-winter.jpg",
    link: "/auctions?season=winter",
    position: 1,
    isActive: true,
  },
  {
    id: "2",
    title: "Yeni Uye Hosgeldin Indirimi",
    imageUrl: "/images/banner-welcome.jpg",
    link: "/register",
    position: 2,
    isActive: true,
  },
  {
    id: "3",
    title: "Mucevher Koleksiyonu",
    imageUrl: "/images/banner-jewelry.jpg",
    link: "/auctions?category=jewelry",
    position: 3,
    isActive: false,
  },
  {
    id: "4",
    title: "Klasik Otomobil Ozel",
    imageUrl: "/images/banner-cars.jpg",
    link: "/auctions?category=cars",
    position: 4,
    isActive: true,
  },
];

const mockBlogPosts = [
  {
    id: "1",
    title: "Antika Taki Alisverisinde Dikkat Edilmesi Gerekenler",
    slug: "antika-taki-alisverisi",
    author: "Mehmet Kaya",
    excerpt:
      "Antika taki alirken nelere dikkat etmeniz gerektigini anlattik.",
    published: true,
    createdAt: "2026-02-22T10:00:00Z",
  },
  {
    id: "2",
    title: "Online Muzayede Platformlarinin Gelecegi",
    slug: "online-muzayede-gelecegi",
    author: "Elif Yildiz",
    excerpt:
      "Dijital donusum ile birlikte muzayede dunyasi nasil degisiyor?",
    published: true,
    createdAt: "2026-02-15T14:00:00Z",
  },
  {
    id: "3",
    title: "Luks Saat Koleksiyonculuguna Giris",
    slug: "luks-saat-koleksiyonculugu",
    author: "Ali Arslan",
    excerpt:
      "Saat koleksiyonculuguna baslamak isteyenler icin rehber.",
    published: false,
    createdAt: "2026-02-10T09:30:00Z",
  },
  {
    id: "4",
    title: "Tablo Degerlenme Kriterleri",
    slug: "tablo-degerlenme-kriterleri",
    author: "Fatma Demir",
    excerpt:
      "Bir tablonun degerini belirleyen faktorler nelerdir?",
    published: true,
    createdAt: "2026-02-05T11:00:00Z",
  },
];

const mockFaqs = [
  {
    id: "1",
    question: "Muzayedeye nasil katilabilirim?",
    answer:
      "Platformumuza ucretsiz kayit olarak muzayedelere katilabilirsiniz. Kayit isleminden sonra KYC dogrulama surecini tamamlamaniz gerekmektedir.",
    position: 1,
  },
  {
    id: "2",
    question: "Teklif verdikten sonra geri cekebilir miyim?",
    answer:
      "Hayir, verilen teklifler geri alinamaz. Teklif vermeden once lütfen iyi dusununuz.",
    position: 2,
  },
  {
    id: "3",
    question: "Odeme yontemleri nelerdir?",
    answer:
      "Kredi karti, banka havalesi ve EFT ile odeme yapabilirsiniz. Tum odemeler 256-bit SSL ile guvence altindadir.",
    position: 3,
  },
  {
    id: "4",
    question: "Kargo ucreti ne kadar?",
    answer:
      "Kargo ucreti urune ve teslimat adresine gore degiskenlik gosterir. Siparis ozeti asamasinda kargo ucreti hesaplanir.",
    position: 4,
  },
  {
    id: "5",
    question: "Iade politikaniz nedir?",
    answer:
      "Urunler aciklamasinda belirtilen durumda teslim edilmezse, teslim tarihinden itibaren 3 is gunu icinde iade talep edebilirsiniz.",
    position: 5,
  },
];

export default function AdminCmsPage() {
  const t = useTranslations("admin");
  void t; // TODO: replace hardcoded strings with t() calls
  const { data: cmsData } = useAdminCms();
  void cmsData; // TODO: use API data when backend is ready
  const [activeTab, setActiveTab] = useState("pages");
  const [editPageDialog, setEditPageDialog] = useState<{
    open: boolean;
    page: (typeof mockPages)[0] | null;
  }>({ open: false, page: null });
  const [editBlogDialog, setEditBlogDialog] = useState<{
    open: boolean;
    post: (typeof mockBlogPosts)[0] | null;
  }>({ open: false, post: null });
  const [editFaqDialog, setEditFaqDialog] = useState<{
    open: boolean;
    faq: (typeof mockFaqs)[0] | null;
  }>({ open: false, faq: null });
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [banners, setBanners] = useState(mockBanners);

  const toggleBanner = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Icerik Yonetimi</h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Sayfalar, bannerlar, blog yazilari ve SSS bolumleri yonetin
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pages">
            <FileText className="mr-2 h-4 w-4" />
            Sayfalar
          </TabsTrigger>
          <TabsTrigger value="banners">
            <ImageIcon className="mr-2 h-4 w-4" />
            Bannerlar
          </TabsTrigger>
          <TabsTrigger value="blog">
            <BookOpen className="mr-2 h-4 w-4" />
            Blog
          </TabsTrigger>
          <TabsTrigger value="faq">
            <HelpCircle className="mr-2 h-4 w-4" />
            SSS
          </TabsTrigger>
        </TabsList>

        {/* Pages Tab */}
        <TabsContent value="pages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Statik Sayfalar</CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Sayfa
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockPages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4 transition-colors hover:bg-[var(--muted)]/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--muted)]">
                        <FileText className="h-5 w-5 text-[var(--muted-foreground)]" />
                      </div>
                      <div>
                        <p className="font-medium">{page.title}</p>
                        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                          <Globe className="h-3 w-3" />
                          <span>/{page.slug}</span>
                          <span>-</span>
                          <span>
                            Son guncelleme: {formatDate(page.updatedAt, "dd MMM yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={page.published ? "success" : "secondary"}>
                        {page.published ? "Yayinda" : "Taslak"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditPageDialog({ open: true, page })}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banners Tab */}
        <TabsContent value="banners">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Banner Yonetimi</CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Banner Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {banners.map((banner) => (
                  <div
                    key={banner.id}
                    className="group relative overflow-hidden rounded-lg border border-[var(--border)]"
                  >
                    <div className="aspect-[21/9] bg-[var(--muted)]">
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-[var(--muted-foreground)]" />
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 cursor-grab text-[var(--muted-foreground)]" />
                          <div>
                            <p className="text-sm font-medium">{banner.title}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              Sira: {banner.position}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={banner.isActive}
                            onCheckedChange={() => toggleBanner(banner.id)}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blog Tab */}
        <TabsContent value="blog">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Blog Yazilari</CardTitle>
              <Button
                size="sm"
                onClick={() => setEditBlogDialog({ open: true, post: null })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Yeni Yazi
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockBlogPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4 transition-colors hover:bg-[var(--muted)]/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{post.title}</p>
                        <Badge
                          variant={post.published ? "success" : "secondary"}
                        >
                          {post.published ? "Yayinda" : "Taslak"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-1">
                        {post.excerpt}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                        <span>{post.author}</span>
                        <span>-</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.createdAt, "dd MMM yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setEditBlogDialog({ open: true, post })
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Sikca Sorulan Sorular</CardTitle>
              <Button
                size="sm"
                onClick={() => setEditFaqDialog({ open: true, faq: null })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Soru Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="rounded-lg border border-[var(--border)]"
                  >
                    <button
                      className="flex w-full items-center justify-between p-4 text-left"
                      onClick={() =>
                        setExpandedFaq(expandedFaq === faq.id ? null : faq.id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 cursor-grab text-[var(--muted-foreground)]" />
                        <span className="text-xs text-[var(--muted-foreground)]">
                          #{faq.position}
                        </span>
                        <span className="font-medium">{faq.question}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditFaqDialog({ open: true, faq });
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {expandedFaq === faq.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Page Dialog */}
      <Dialog
        open={editPageDialog.open}
        onOpenChange={(open) => setEditPageDialog({ ...editPageDialog, open })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editPageDialog.page ? "Sayfayi Duzenle" : "Yeni Sayfa"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input
              label="Sayfa Basligi"
              defaultValue={editPageDialog.page?.title || ""}
            />
            <Input
              label="Slug (URL)"
              defaultValue={editPageDialog.page?.slug || ""}
            />
            <Textarea
              label="Icerik"
              rows={12}
              placeholder="Sayfa icerigini yazin..."
              defaultValue=""
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setEditPageDialog({ open: false, page: null })}
            >
              Vazgec
            </Button>
            <Button
              onClick={() => setEditPageDialog({ open: false, page: null })}
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Blog Dialog */}
      <Dialog
        open={editBlogDialog.open}
        onOpenChange={(open) =>
          setEditBlogDialog({ ...editBlogDialog, open })
        }
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editBlogDialog.post ? "Yaziyi Duzenle" : "Yeni Blog Yazisi"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input
              label="Baslik"
              defaultValue={editBlogDialog.post?.title || ""}
            />
            <Input
              label="Slug (URL)"
              defaultValue={editBlogDialog.post?.slug || ""}
            />
            <Textarea
              label="Ozet"
              rows={2}
              placeholder="Kisa ozet yazin..."
              defaultValue={editBlogDialog.post?.excerpt || ""}
            />
            <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Kapak fotografini yuklemek icin tiklayin veya surukleyin
              </p>
            </div>
            <Textarea
              label="Icerik"
              rows={10}
              placeholder="Blog icerigini yazin..."
              defaultValue=""
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() =>
                setEditBlogDialog({ open: false, post: null })
              }
            >
              Vazgec
            </Button>
            <Button variant="secondary">Taslak Kaydet</Button>
            <Button
              onClick={() =>
                setEditBlogDialog({ open: false, post: null })
              }
            >
              Yayinla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit FAQ Dialog */}
      <Dialog
        open={editFaqDialog.open}
        onOpenChange={(open) => setEditFaqDialog({ ...editFaqDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editFaqDialog.faq ? "Soruyu Duzenle" : "Yeni Soru Ekle"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input
              label="Soru"
              defaultValue={editFaqDialog.faq?.question || ""}
              placeholder="Soru yazin..."
            />
            <Textarea
              label="Cevap"
              rows={4}
              defaultValue={editFaqDialog.faq?.answer || ""}
              placeholder="Cevabi yazin..."
            />
            <Input
              label="Sira Numarasi"
              type="number"
              defaultValue={String(editFaqDialog.faq?.position || mockFaqs.length + 1)}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setEditFaqDialog({ open: false, faq: null })}
            >
              Vazgec
            </Button>
            <Button
              onClick={() => setEditFaqDialog({ open: false, faq: null })}
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
