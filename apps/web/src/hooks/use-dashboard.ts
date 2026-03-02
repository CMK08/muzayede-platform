import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiRoutes } from "@/lib/api";

// ---- User Profile ----
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.users.profile);
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.put(apiRoutes.users.update, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// ---- User Orders ----
export function useUserOrders(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ["user-orders", page, limit],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.users.orders}?page=${page}&limit=${limit}`
      );
      return data;
    },
    staleTime: 15 * 1000,
  });
}

// ---- Favorites / Watchlist ----
export function useFavorites(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ["favorites", page, limit],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.users.favorites}?page=${page}&limit=${limit}`
      );
      return data;
    },
    staleTime: 15 * 1000,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (auctionId: string) => {
      const { data } = await api.post(apiRoutes.users.favorites, { auctionId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

// ---- Notifications ----
export function useNotifications(page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ["notifications", page, limit],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.notifications.list}?page=${page}&limit=${limit}`
      );
      return data;
    },
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(apiRoutes.notifications.markRead(id));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put(apiRoutes.notifications.markAllRead);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ---- Admin Dashboard ----
export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.admin.dashboard);
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useAdminUsers(params: Record<string, string | number> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) searchParams.set(key, String(val));
  });
  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.admin.users}?${searchParams.toString()}`
      );
      return data;
    },
    staleTime: 15 * 1000,
  });
}

export function useAdminAuctions(params: Record<string, string | number> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) searchParams.set(key, String(val));
  });
  return useQuery({
    queryKey: ["admin-auctions", params],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.admin.auctions}?${searchParams.toString()}`
      );
      return data;
    },
    staleTime: 15 * 1000,
  });
}

export function useAdminProducts(params: Record<string, string | number> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) searchParams.set(key, String(val));
  });
  return useQuery({
    queryKey: ["admin-products", params],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.admin.products}?${searchParams.toString()}`
      );
      return data;
    },
    staleTime: 15 * 1000,
  });
}

export function useAdminOrders(params: Record<string, string | number> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) searchParams.set(key, String(val));
  });
  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.admin.orders}?${searchParams.toString()}`
      );
      return data;
    },
    staleTime: 15 * 1000,
  });
}

export function useAdminFinance() {
  return useQuery({
    queryKey: ["admin-finance"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.admin.finance);
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useAdminCms() {
  return useQuery({
    queryKey: ["admin-cms"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.admin.cms);
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.admin.settings);
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.put(apiRoutes.admin.settings, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });
}

// ---- Seller Dashboard ----
export function useSellerDashboard() {
  return useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.seller.dashboard);
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useSellerProducts(params: Record<string, string | number> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) searchParams.set(key, String(val));
  });
  return useQuery({
    queryKey: ["seller-products", params],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.seller.products}?${searchParams.toString()}`
      );
      return data;
    },
    staleTime: 15 * 1000,
  });
}

export function useSellerEarnings() {
  return useQuery({
    queryKey: ["seller-earnings"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.seller.earnings);
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { amount: number }) => {
      const { data } = await api.post(apiRoutes.seller.payouts, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-earnings"] });
    },
  });
}

// ---- Products CRUD ----
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post(apiRoutes.products.create, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(apiRoutes.products.delete(id));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });
}

// ---- Auction Mutations ----
export function useCreateAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post(apiRoutes.auctions.create, payload);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-auctions"] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

export function useUpdateAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.put(apiRoutes.auctions.update(id), payload);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-auctions"] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

export function usePublishAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(apiRoutes.auctions.publish(id));
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-auctions"] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

export function useStartAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(apiRoutes.auctions.start(id));
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-auctions"] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

export function useEndAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(apiRoutes.auctions.end(id));
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-auctions"] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

export function useCancelAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(apiRoutes.auctions.delete(id));
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-auctions"] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

// ---- Products List (for lot selection) ----
export function useProducts(params: Record<string, string | number> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) searchParams.set(key, String(val));
  });
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.products.list}?${searchParams.toString()}`
      );
      return data;
    },
    staleTime: 15 * 1000,
  });
}

// ---- Similar Auctions ----
export function useSimilarAuctions(id: string) {
  return useQuery({
    queryKey: ["similar-auctions", id],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.auctions.similar(id));
      return data.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
