"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Lock,
  Shield,
  Bell,
  Link2,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const t = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "Ahmet",
    lastName: "Yilmaz",
    email: "ahmet.yilmaz@email.com",
    phone: "+90 532 123 4567",
    address: "Besiktas Mah. Sehit Asim Cad. No:15/A",
    city: "Istanbul",
    country: "Turkiye",
    avatar: null as string | null,
  });
  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [twoFa, setTwoFa] = useState(false);
  const [oauthAccounts] = useState([
    { provider: "Google", email: "ahmet@gmail.com", connected: true },
    { provider: "Apple", email: "", connected: false },
    { provider: "Facebook", email: "", connected: false },
  ]);
  const [notifPrefs, setNotifPrefs] = useState({
    bidUpdates: true,
    auctionReminders: true,
    promotions: false,
    newsletter: true,
    smsNotifications: true,
    pushNotifications: true,
  });

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Profilim</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Kisisel bilgilerinizi ve tercihlerinizi duzenleyin
          </p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="mr-2 h-4 w-4" />
          Kaydet
        </Button>
      </div>

      {/* Avatar Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative">
              <Avatar
                src={profile.avatar}
                fallback={`${profile.firstName} ${profile.lastName}`}
                size="xl"
                className="h-24 w-24 text-2xl"
              />
              <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-110">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-semibold">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {profile.email}
              </p>
              <div className="mt-2 flex gap-2">
                <Badge variant="success">Dogrulanmis</Badge>
                <Badge variant="secondary">Uye</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" />
            Kisisel Bilgiler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Ad"
              value={profile.firstName}
              onChange={(e) =>
                setProfile({ ...profile, firstName: e.target.value })
              }
            />
            <Input
              label="Soyad"
              value={profile.lastName}
              onChange={(e) =>
                setProfile({ ...profile, lastName: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="E-posta"
              type="email"
              value={profile.email}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
              icon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Telefon"
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
              icon={<Phone className="h-4 w-4" />}
            />
          </div>
          <Input
            label="Adres"
            value={profile.address}
            onChange={(e) =>
              setProfile({ ...profile, address: e.target.value })
            }
            icon={<MapPin className="h-4 w-4" />}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Sehir"
              options={[
                { value: "Istanbul", label: "Istanbul" },
                { value: "Ankara", label: "Ankara" },
                { value: "Izmir", label: "Izmir" },
                { value: "Bursa", label: "Bursa" },
                { value: "Antalya", label: "Antalya" },
                { value: "Konya", label: "Konya" },
                { value: "Adana", label: "Adana" },
              ]}
              value={profile.city}
              onChange={(e) =>
                setProfile({ ...profile, city: e.target.value })
              }
            />
            <Select
              label="Ulke"
              options={[
                { value: "Turkiye", label: "Turkiye" },
                { value: "Almanya", label: "Almanya" },
                { value: "Ingiltere", label: "Ingiltere" },
                { value: "ABD", label: "ABD" },
              ]}
              value={profile.country}
              onChange={(e) =>
                setProfile({ ...profile, country: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-5 w-5" />
            Sifre Degistir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Mevcut Sifre"
            type="password"
            value={passwords.current}
            onChange={(e) =>
              setPasswords({ ...passwords, current: e.target.value })
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Yeni Sifre"
              type="password"
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, newPassword: e.target.value })
              }
            />
            <Input
              label="Yeni Sifre (Tekrar)"
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, confirmPassword: e.target.value })
              }
            />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            En az 8 karakter, bir buyuk harf, bir kucuk harf ve bir rakam
          </p>
          <Button variant="outline" size="sm">
            Sifreyi Guncelle
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            Iki Faktorlu Kimlik Dogrulama (2FA)
          </CardTitle>
          <CardDescription>
            Hesabinizi daha guvenli hale getirmek icin 2FA aktif edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
            <div>
              <p className="font-medium">
                {twoFa ? "2FA Aktif" : "2FA Pasif"}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {twoFa
                  ? "Hesabiniz iki faktorlu dogrulama ile korunuyor"
                  : "Hesabinizi korumak icin 2FA aktif edin"}
              </p>
            </div>
            <Switch checked={twoFa} onCheckedChange={setTwoFa} />
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5" />
            Bagli Hesaplar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {oauthAccounts.map((account) => (
              <div
                key={account.provider}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--muted)]">
                    <span className="text-sm font-bold">
                      {account.provider[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{account.provider}</p>
                    {account.connected && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {account.email}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant={account.connected ? "outline" : "default"}
                  size="sm"
                >
                  {account.connected ? "Baglantıyı Kes" : "Bagla"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5" />
            Bildirim Tercihleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(notifPrefs).map(([key, enabled]) => {
              const labels: Record<string, { title: string; desc: string }> = {
                bidUpdates: {
                  title: "Teklif Bildirimleri",
                  desc: "Teklifleriniz asildiginda bildirim alin",
                },
                auctionReminders: {
                  title: "Muzayede Hatirlatmalari",
                  desc: "Takip ettiginiz muzayedeler baslamadan haberdar olun",
                },
                promotions: {
                  title: "Kampanyalar",
                  desc: "Ozel firsatlar ve kampanyalardan haberdar olun",
                },
                newsletter: {
                  title: "Bulten",
                  desc: "Haftalik bulten almak istiyorum",
                },
                smsNotifications: {
                  title: "SMS Bildirimleri",
                  desc: "Onemli guncellemeler icin SMS alin",
                },
                pushNotifications: {
                  title: "Push Bildirimleri",
                  desc: "Tarayici bildirimleri alin",
                },
              };
              const label = labels[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4"
                >
                  <div>
                    <p className="text-sm font-medium">{label?.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {label?.desc}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      setNotifPrefs({ ...notifPrefs, [key]: checked })
                    }
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
