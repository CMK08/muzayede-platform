"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  Edit,
  Ban,
  Download,
  Shield,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { useAdminUsers } from "@/hooks/use-dashboard";

interface UserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string | null;
  role: string;
  trustScore: number;
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
  totalBids: number;
  totalPurchases: number;
  [key: string]: unknown;
}

const mockUsers: UserRecord[] = [
  {
    id: "USR-001",
    firstName: "Ahmet",
    lastName: "Yilmaz",
    email: "ahmet.yilmaz@email.com",
    phone: "+90 532 123 4567",
    avatar: null,
    role: "user",
    trustScore: 92,
    kycStatus: "verified",
    isActive: true,
    createdAt: "2024-03-15T10:00:00Z",
    totalBids: 145,
    totalPurchases: 12,
  },
  {
    id: "USR-002",
    firstName: "Fatma",
    lastName: "Demir",
    email: "fatma.demir@email.com",
    phone: "+90 535 987 6543",
    avatar: null,
    role: "seller",
    trustScore: 88,
    kycStatus: "verified",
    isActive: true,
    createdAt: "2024-05-22T14:30:00Z",
    totalBids: 78,
    totalPurchases: 34,
  },
  {
    id: "USR-003",
    firstName: "Mehmet",
    lastName: "Kaya",
    email: "mehmet.kaya@email.com",
    phone: "+90 542 456 7890",
    avatar: null,
    role: "admin",
    trustScore: 100,
    kycStatus: "verified",
    isActive: true,
    createdAt: "2023-01-10T08:00:00Z",
    totalBids: 0,
    totalPurchases: 0,
  },
  {
    id: "USR-004",
    firstName: "Ayse",
    lastName: "Ozturk",
    email: "ayse.ozturk@email.com",
    phone: "+90 555 111 2233",
    avatar: null,
    role: "user",
    trustScore: 45,
    kycStatus: "pending",
    isActive: true,
    createdAt: "2025-11-08T16:45:00Z",
    totalBids: 12,
    totalPurchases: 1,
  },
  {
    id: "USR-005",
    firstName: "Mustafa",
    lastName: "Celik",
    email: "mustafa.celik@email.com",
    phone: "+90 538 333 4455",
    avatar: null,
    role: "seller",
    trustScore: 72,
    kycStatus: "verified",
    isActive: false,
    createdAt: "2024-08-30T11:20:00Z",
    totalBids: 56,
    totalPurchases: 8,
  },
  {
    id: "USR-006",
    firstName: "Zeynep",
    lastName: "Sahin",
    email: "zeynep.sahin@email.com",
    phone: "+90 544 666 7788",
    avatar: null,
    role: "user",
    trustScore: 15,
    kycStatus: "rejected",
    isActive: false,
    createdAt: "2025-06-14T09:30:00Z",
    totalBids: 3,
    totalPurchases: 0,
  },
  {
    id: "USR-007",
    firstName: "Ali",
    lastName: "Arslan",
    email: "ali.arslan@email.com",
    phone: "+90 531 999 8877",
    avatar: null,
    role: "user",
    trustScore: 68,
    kycStatus: "verified",
    isActive: true,
    createdAt: "2025-01-20T13:00:00Z",
    totalBids: 89,
    totalPurchases: 5,
  },
  {
    id: "USR-008",
    firstName: "Elif",
    lastName: "Yildiz",
    email: "elif.yildiz@email.com",
    phone: "+90 536 222 3344",
    avatar: null,
    role: "moderator",
    trustScore: 95,
    kycStatus: "verified",
    isActive: true,
    createdAt: "2024-02-28T10:00:00Z",
    totalBids: 0,
    totalPurchases: 0,
  },
  {
    id: "USR-009",
    firstName: "Hasan",
    lastName: "Koç",
    email: "hasan.koc@email.com",
    phone: "+90 533 444 5566",
    avatar: null,
    role: "seller",
    trustScore: 81,
    kycStatus: "verified",
    isActive: true,
    createdAt: "2024-07-05T15:20:00Z",
    totalBids: 32,
    totalPurchases: 67,
  },
  {
    id: "USR-010",
    firstName: "Merve",
    lastName: "Aksoy",
    email: "merve.aksoy@email.com",
    phone: "+90 537 888 9900",
    avatar: null,
    role: "user",
    trustScore: 55,
    kycStatus: "pending",
    isActive: true,
    createdAt: "2025-12-01T08:45:00Z",
    totalBids: 25,
    totalPurchases: 2,
  },
];

const roleConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "warning" | "destructive" }
> = {
  super_admin: { label: "Super Admin", variant: "destructive" },
  admin: { label: "Admin", variant: "destructive" },
  moderator: { label: "Moderator", variant: "warning" },
  auction_house: { label: "Muzayede Evi", variant: "warning" },
  seller: { label: "Satici", variant: "default" },
  buyer: { label: "Alici", variant: "secondary" },
  user: { label: "Kullanici", variant: "secondary" },
};

const kycConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  verified: { label: "Dogrulanmis", variant: "success" },
  approved: { label: "Dogrulanmis", variant: "success" },
  pending: { label: "Beklemede", variant: "warning" },
  rejected: { label: "Reddedildi", variant: "destructive" },
  not_submitted: { label: "Gonderilmedi", variant: "secondary" },
  "not-submitted": { label: "Gonderilmedi", variant: "secondary" },
};

function getTrustVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "destructive";
}

export default function AdminUsersPage() {
  const t = useTranslations("admin");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [kycFilter, setKycFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [blacklistDialog, setBlacklistDialog] = useState<{
    open: boolean;
    user: UserRecord | null;
  }>({ open: false, user: null });
  const [blacklistReason, setBlacklistReason] = useState("");

  const { data: usersResponse } = useAdminUsers({
    page: currentPage,
    limit: pageSize,
    search: search || "",
    role: roleFilter || "",
  });

  const apiUsers: UserRecord[] = (usersResponse?.data || []).map((u: Record<string, unknown>) => {
    const profile = (u.profile || {}) as Record<string, unknown>;
    return {
      id: u.id as string,
      firstName: (profile.firstName || profile.displayName || "") as string,
      lastName: (profile.lastName || "") as string,
      email: (u.email || "") as string,
      phone: (u.phone || "") as string,
      role: ((u.role || "BUYER") as string).toLowerCase(),
      isActive: (u.isActive !== false) as boolean,
      kycStatus: ((u.kycStatus || "NOT_SUBMITTED") as string).toLowerCase().replace("_", "-"),
      trustScore: (u.trustScore || 0) as number,
      totalBids: (u.totalBids || 0) as number,
      totalPurchases: (u.totalPurchases || 0) as number,
      createdAt: (u.createdAt || "") as string,
      avatar: (u.avatarUrl || null) as string | null,
    };
  });

  const allUsers = apiUsers.length > 0 ? apiUsers : mockUsers;

  const filteredData = allUsers.filter((user) => {
    const matchesSearch =
      !search ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesKyc = !kycFilter || user.kycStatus === kycFilter;
    const matchesActive =
      !activeFilter ||
      (activeFilter === "active" && user.isActive) ||
      (activeFilter === "inactive" && !user.isActive);
    return matchesSearch && matchesRole && matchesKyc && matchesActive;
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

  const columns: Column<UserRecord>[] = [
    {
      key: "name",
      header: "Kullanici",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <Avatar
            fallback={`${item.firstName} ${item.lastName}`}
            src={item.avatar}
            size="sm"
          />
          <div>
            <p className="font-medium">
              {item.firstName} {item.lastName}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {item.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (item) => {
        const config = roleConfig[item.role] || roleConfig.user;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "trustScore",
      header: "Guven Skoru",
      sortable: true,
      className: "w-40",
      render: (item) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>{item.trustScore}/100</span>
          </div>
          <Progress
            value={item.trustScore}
            variant={getTrustVariant(item.trustScore)}
          />
        </div>
      ),
    },
    {
      key: "kycStatus",
      header: "KYC",
      render: (item) => {
        const config = kycConfig[item.kycStatus] || kycConfig.not_submitted;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "isActive",
      header: "Durum",
      render: (item) => (
        <Badge variant={item.isActive ? "success" : "destructive"}>
          {item.isActive ? "Aktif" : "Pasif"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Kayit Tarihi",
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
      className: "text-right w-36",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Profili Gor">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Rolu Duzenle">
            <Edit className="h-4 w-4" />
          </Button>
          {item.role !== "admin" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500"
              title="Kara Listeye Al"
              onClick={() => setBlacklistDialog({ open: true, user: item })}
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
          <h1 className="font-display text-3xl font-bold">Kullanici Yonetimi</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Platform kullanicilarini yonetin ve duzenleyin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            CSV Aktar
          </Button>
          <Button size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Kullanici Ekle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold">{allUsers.length}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Toplam Kullanici</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <p className="text-2xl font-bold">
              {allUsers.filter((u) => u.kycStatus === "verified").length}
            </p>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">KYC Dogrulanmis</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-500" />
            <p className="text-2xl font-bold">
              {allUsers.filter((u) => u.role === "seller").length}
            </p>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">Satici</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-bold text-red-500">
            {allUsers.filter((u) => !u.isActive).length}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Pasif Hesap</p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={paginatedData}
        searchPlaceholder="Kullanici ara..."
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
        emptyMessage="Kullanici bulunamadi"
        filters={
          <>
            <Select
              options={[
                { value: "", label: "Tum Roller" },
                { value: "super_admin", label: "Super Admin" },
                { value: "admin", label: "Admin" },
                { value: "auction_house", label: "Muzayede Evi" },
                { value: "seller", label: "Satici" },
                { value: "buyer", label: "Alici" },
              ]}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-32"
            />
            <Select
              options={[
                { value: "", label: "Tum KYC" },
                { value: "verified", label: "Dogrulanmis" },
                { value: "pending", label: "Beklemede" },
                { value: "rejected", label: "Reddedildi" },
              ]}
              value={kycFilter}
              onChange={(e) => {
                setKycFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-32"
            />
            <Select
              options={[
                { value: "", label: "Tum Durum" },
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
        bulkActions={
          <>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Rol Degistir
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              CSV Aktar
            </Button>
          </>
        }
      />

      {/* Blacklist Dialog */}
      <Dialog
        open={blacklistDialog.open}
        onOpenChange={(open) =>
          setBlacklistDialog({ ...blacklistDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullaniciyi Kara Listeye Al</DialogTitle>
            <DialogDescription>
              <strong>
                {blacklistDialog.user?.firstName}{" "}
                {blacklistDialog.user?.lastName}
              </strong>{" "}
              kullanicisini kara listeye almak istediginizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              label="Sebep"
              placeholder="Kara listeye alma sebebini yazin..."
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setBlacklistDialog({ open: false, user: null });
                setBlacklistReason("");
              }}
            >
              Vazgec
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setBlacklistDialog({ open: false, user: null });
                setBlacklistReason("");
              }}
            >
              <Ban className="mr-2 h-4 w-4" />
              Kara Listeye Al
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
