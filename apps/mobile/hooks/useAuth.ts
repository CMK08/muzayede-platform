import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '@/types';

export function useCurrentUser() {
  const { isAuthenticated, setUser } = useAuthStore();

  return useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data } = await api.get<{ data: User }>('/auth/me');
      setUser(data.data);
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useLogin() {
  const { setUser, setTokens } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, LoginRequest>({
    mutationFn: async (credentials) => {
      const { data } = await api.post<AuthResponse>(
        '/auth/login',
        credentials
      );
      return data;
    },
    onSuccess: async (data) => {
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

export function useRegister() {
  return useMutation<AuthResponse, Error, RegisterRequest>({
    mutationFn: async (userData) => {
      const { data } = await api.post<AuthResponse>(
        '/auth/register',
        userData
      );
      return data;
    },
  });
}

export function useVerifyOtp() {
  const { setUser, setTokens } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<
    AuthResponse,
    Error,
    { phone: string; code: string }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<AuthResponse>(
        '/auth/verify-otp',
        payload
      );
      return data;
    },
    onSuccess: async (data) => {
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout');
      } catch {
        // Ignore API errors on logout
      }
    },
    onSettled: async () => {
      await logout();
      queryClient.clear();
    },
  });
}
