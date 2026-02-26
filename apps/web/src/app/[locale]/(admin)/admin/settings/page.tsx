"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  Percent,
  Bell,
  Search,
  Upload,
  Save,
  Globe,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function AdminSettingsPage() {
  const t = useTranslations("admin");
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    platformName: "Muzayede",
    contactEmail: "info@muzayede.com",
    contactPhone: "0850 123 45 67",
    address: "Levent Mah. Buyukdere Cad. No:123, Besiktas, Istanbul",
    timezone: "Europe/Istanbul",
    currency: "TRY",
    maintenanceMode: false,
  });

  // Commission settings state
  const [commissionSettings, setCommissionSettings] = useState({
    defaultBuyerRate: 10,
    defaultSellerRate: 5,
    tieredRules: [
      { minAmount: 0, maxAmount: 50000, buyerRate: 10, sellerRate: 5 },
      { minAmount: 50000, maxAmount: 200000, buyerRate: 8, sellerRate: 4 },
      { minAmount: 200000, maxAmount: 1000000, buyerRate: 6, sellerRate: 3 },
      { minAmount: 1000000, maxAmount: -1, buyerRate: 5, sellerRate: 2.5 },
    ],
  });

  // Notification settings state
  const [notifSettings, setNotifSettings] = useState({
    newBid: { email: true, sms: true, push: true },
    auctionEnd: { email: true, sms: true, push: true },
    auctionWon: { email: true, sms: true, push: true },
    outbid: { email: true, sms: false, push: true },
    paymentReceived: { email: true, sms: true, push: false },
    orderShipped: { email: true, sms: true, push: true },
    newUser: { email: true, sms: false, push: false },
    kycVerified: { email: true, sms: true, push: false },
    systemAlert: { email: true, sms: false, push: true },
  });

  // SEO settings state
  const [seoSettings, setSeoSettings] = useState({
    metaTitle: "Muzayede - Turkiye'nin Online Muzayede Platformu",
    metaDescription:
      "Turkiye'nin en guvenilir online muzayede platformu. Benzersiz urunleri kesfedin, teklif verin ve kazanin.",
    ogImage: "",
    gaId: "G-XXXXXXXXXX",
    gtmId: "GTM-XXXXXXX",
    robotsTxt: "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /dashboard/",
  });

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  const notifLabels: Record<string, string> = {
    newBid: "Yeni Teklif",
    auctionEnd: "Muzayede Bitis",
    auctionWon: "Muzayede Kazanma",
    outbid: "Teklif Asildi",
    paymentReceived: "Odeme Alindi",
    orderShipped: "Siparis Kargoda",
    newUser: "Yeni Kullanici",
    kycVerified: "KYC Dogrulama",
    systemAlert: "Sistem Uyarisi",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Platform Ayarlari</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Genel yapilandirma ve tercihlerinizi duzenleyin
          </p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="mr-2 h-4 w-4" />
          Degisiklikleri Kaydet
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            Genel
          </TabsTrigger>
          <TabsTrigger value="commission">
            <Percent className="mr-2 h-4 w-4" />
            Komisyon
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Bildirimler
          </TabsTrigger>
          <TabsTrigger value="seo">
            <Search className="mr-2 h-4 w-4" />
            SEO
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Bilgileri</CardTitle>
                <CardDescription>
                  Platformunuzun temel bilgilerini duzenleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Platform Adi"
                  value={generalSettings.platformName}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      platformName: e.target.value,
                    })
                  }
                />
                <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    Logo yuklemek icin tiklayin veya surukleyin
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    SVG, PNG veya JPG (maks. 2MB)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Iletisim Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="E-posta"
                    value={generalSettings.contactEmail}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        contactEmail: e.target.value,
                      })
                    }
                    icon={<Mail className="h-4 w-4" />}
                  />
                  <Input
                    label="Telefon"
                    value={generalSettings.contactPhone}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        contactPhone: e.target.value,
                      })
                    }
                    icon={<Phone className="h-4 w-4" />}
                  />
                </div>
                <Input
                  label="Adres"
                  value={generalSettings.address}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      address: e.target.value,
                    })
                  }
                  icon={<MapPin className="h-4 w-4" />}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bolge ve Para Birimi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Saat Dilimi"
                    options={[
                      { value: "Europe/Istanbul", label: "Istanbul (UTC+3)" },
                      { value: "Europe/London", label: "Londra (UTC+0)" },
                      { value: "America/New_York", label: "New York (UTC-5)" },
                    ]}
                    value={generalSettings.timezone}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        timezone: e.target.value,
                      })
                    }
                  />
                  <Select
                    label="Para Birimi"
                    options={[
                      { value: "TRY", label: "Turk Lirasi (TL)" },
                      { value: "USD", label: "Amerikan Dolari ($)" },
                      { value: "EUR", label: "Euro" },
                    ]}
                    value={generalSettings.currency}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        currency: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
                  <div>
                    <p className="font-medium">Bakim Modu</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Aktif edildiginde siteye erisim engellenir
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setGeneralSettings({
                        ...generalSettings,
                        maintenanceMode: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Commission Tab */}
        <TabsContent value="commission">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Varsayilan Komisyon Oranlari</CardTitle>
                <CardDescription>
                  Tum muzayedeler icin gecerli olan varsayilan oranlar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Alici Komisyonu (%)"
                    type="number"
                    value={String(commissionSettings.defaultBuyerRate)}
                    onChange={(e) =>
                      setCommissionSettings({
                        ...commissionSettings,
                        defaultBuyerRate: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Satici Komisyonu (%)"
                    type="number"
                    value={String(commissionSettings.defaultSellerRate)}
                    onChange={(e) =>
                      setCommissionSettings({
                        ...commissionSettings,
                        defaultSellerRate: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kademeli Komisyon Kurallari</CardTitle>
                <CardDescription>
                  Satis tutarina gore degisen komisyon oranlari belirleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3 text-xs font-medium text-[var(--muted-foreground)]">
                    <span>Min Tutar (TL)</span>
                    <span>Max Tutar (TL)</span>
                    <span>Alici (%)</span>
                    <span>Satici (%)</span>
                  </div>
                  {commissionSettings.tieredRules.map((rule, index) => (
                    <div key={index} className="grid grid-cols-4 gap-3">
                      <Input
                        type="number"
                        value={String(rule.minAmount)}
                        onChange={(e) => {
                          const updated = [...commissionSettings.tieredRules];
                          updated[index] = {
                            ...updated[index],
                            minAmount: Number(e.target.value),
                          };
                          setCommissionSettings({
                            ...commissionSettings,
                            tieredRules: updated,
                          });
                        }}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        value={rule.maxAmount === -1 ? "" : String(rule.maxAmount)}
                        placeholder="Sinir yok"
                        onChange={(e) => {
                          const updated = [...commissionSettings.tieredRules];
                          updated[index] = {
                            ...updated[index],
                            maxAmount: e.target.value ? Number(e.target.value) : -1,
                          };
                          setCommissionSettings({
                            ...commissionSettings,
                            tieredRules: updated,
                          });
                        }}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        step="0.5"
                        value={String(rule.buyerRate)}
                        onChange={(e) => {
                          const updated = [...commissionSettings.tieredRules];
                          updated[index] = {
                            ...updated[index],
                            buyerRate: Number(e.target.value),
                          };
                          setCommissionSettings({
                            ...commissionSettings,
                            tieredRules: updated,
                          });
                        }}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        step="0.5"
                        value={String(rule.sellerRate)}
                        onChange={(e) => {
                          const updated = [...commissionSettings.tieredRules];
                          updated[index] = {
                            ...updated[index],
                            sellerRate: Number(e.target.value),
                          };
                          setCommissionSettings({
                            ...commissionSettings,
                            tieredRules: updated,
                          });
                        }}
                        className="h-9"
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCommissionSettings({
                        ...commissionSettings,
                        tieredRules: [
                          ...commissionSettings.tieredRules,
                          { minAmount: 0, maxAmount: -1, buyerRate: 5, sellerRate: 2.5 },
                        ],
                      })
                    }
                  >
                    Kademe Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bildirim Ayarlari</CardTitle>
              <CardDescription>
                Her etkinlik turu icin bildirim kanallarini yapilandir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-4 gap-4 border-b border-[var(--border)] pb-3 text-xs font-medium text-[var(--muted-foreground)]">
                  <span>Etkinlik</span>
                  <span className="text-center">E-posta</span>
                  <span className="text-center">SMS</span>
                  <span className="text-center">Push</span>
                </div>
                {Object.entries(notifSettings).map(([key, channels]) => (
                  <div
                    key={key}
                    className="grid grid-cols-4 items-center gap-4 py-3 border-b border-[var(--border)] last:border-0"
                  >
                    <span className="text-sm font-medium">
                      {notifLabels[key] || key}
                    </span>
                    <div className="flex justify-center">
                      <Switch
                        checked={channels.email}
                        onCheckedChange={(checked) =>
                          setNotifSettings({
                            ...notifSettings,
                            [key]: { ...channels, email: checked },
                          })
                        }
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={channels.sms}
                        onCheckedChange={(checked) =>
                          setNotifSettings({
                            ...notifSettings,
                            [key]: { ...channels, sms: checked },
                          })
                        }
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={channels.push}
                        onCheckedChange={(checked) =>
                          setNotifSettings({
                            ...notifSettings,
                            [key]: { ...channels, push: checked },
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meta Bilgileri</CardTitle>
                <CardDescription>
                  Arama motorlari icin varsayilan meta bilgiler
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Meta Baslik"
                  value={seoSettings.metaTitle}
                  onChange={(e) =>
                    setSeoSettings({
                      ...seoSettings,
                      metaTitle: e.target.value,
                    })
                  }
                />
                <Textarea
                  label="Meta Aciklama"
                  rows={3}
                  value={seoSettings.metaDescription}
                  onChange={(e) =>
                    setSeoSettings({
                      ...seoSettings,
                      metaDescription: e.target.value,
                    })
                  }
                />
                <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    OG Image yuklemek icin tiklayin
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Onerilen: 1200x630px, PNG veya JPG
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analitik ve Takip</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Google Analytics ID"
                    placeholder="G-XXXXXXXXXX"
                    value={seoSettings.gaId}
                    onChange={(e) =>
                      setSeoSettings({
                        ...seoSettings,
                        gaId: e.target.value,
                      })
                    }
                    icon={<Globe className="h-4 w-4" />}
                  />
                  <Input
                    label="Google Tag Manager ID"
                    placeholder="GTM-XXXXXXX"
                    value={seoSettings.gtmId}
                    onChange={(e) =>
                      setSeoSettings({
                        ...seoSettings,
                        gtmId: e.target.value,
                      })
                    }
                    icon={<Globe className="h-4 w-4" />}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">robots.txt</CardTitle>
                <CardDescription>
                  Arama motoru botlari icin erişim kurallari
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={6}
                  value={seoSettings.robotsTxt}
                  onChange={(e) =>
                    setSeoSettings({
                      ...seoSettings,
                      robotsTxt: e.target.value,
                    })
                  }
                  className="font-mono text-xs"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
