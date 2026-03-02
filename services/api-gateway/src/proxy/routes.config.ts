export interface RouteConfig {
  /** The path prefix to match (e.g. '/api/v1/auth') */
  prefix: string;
  /** The target service base URL (e.g. 'http://localhost:3001') */
  target: string;
  /** Human-readable service name for logging */
  serviceName: string;
}

export const ROUTE_CONFIGS: RouteConfig[] = [
  // Auth Service (port 3001)
  { prefix: '/api/v1/auth', target: 'http://localhost:3001', serviceName: 'auth-service' },
  { prefix: '/api/v1/kyc', target: 'http://localhost:3001', serviceName: 'auth-service' },
  { prefix: '/api/v1/two-factor', target: 'http://localhost:3001', serviceName: 'auth-service' },

  // User Service (port 3002)
  { prefix: '/api/v1/users', target: 'http://localhost:3002', serviceName: 'user-service' },

  // Auction Service (port 3003)
  { prefix: '/api/v1/auctions', target: 'http://localhost:3003', serviceName: 'auction-service' },

  // Bid Service (port 3004)
  { prefix: '/api/v1/bids', target: 'http://localhost:3004', serviceName: 'bid-service' },

  // Product Service (port 3005)
  { prefix: '/api/v1/products', target: 'http://localhost:3005', serviceName: 'product-service' },
  { prefix: '/api/v1/categories', target: 'http://localhost:3005', serviceName: 'product-service' },
  { prefix: '/api/v1/artists', target: 'http://localhost:3005', serviceName: 'product-service' },
  { prefix: '/api/v1/exhibitions', target: 'http://localhost:3005', serviceName: 'product-service' },
  { prefix: '/api/v1/tags', target: 'http://localhost:3005', serviceName: 'product-service' },

  // Notification Service (port 3006)
  { prefix: '/api/v1/notifications', target: 'http://localhost:3006', serviceName: 'notification-service' },

  // Search Service (port 3007)
  { prefix: '/api/v1/search', target: 'http://localhost:3007', serviceName: 'search-service' },

  // Payment Service (port 3008)
  { prefix: '/api/v1/payments', target: 'http://localhost:3008', serviceName: 'payment-service' },
  { prefix: '/api/v1/orders', target: 'http://localhost:3008', serviceName: 'payment-service' },
  { prefix: '/api/v1/invoices', target: 'http://localhost:3008', serviceName: 'payment-service' },

  // Shipping Service (port 3009)
  { prefix: '/api/v1/shipping', target: 'http://localhost:3009', serviceName: 'shipping-service' },

  // Live Service (port 3010)
  { prefix: '/api/v1/live', target: 'http://localhost:3010', serviceName: 'live-service' },
  { prefix: '/api/v1/auctioneer', target: 'http://localhost:3010', serviceName: 'live-service' },

  // Blockchain Service (port 3012)
  { prefix: '/api/v1/blockchain', target: 'http://localhost:3012', serviceName: 'blockchain-service' },

  // AI Service (port 3011) — Python FastAPI
  { prefix: '/api/v1/ai', target: 'http://localhost:3011', serviceName: 'ai-service' },

  // Analytics Service (port 3013)
  { prefix: '/api/v1/analytics', target: 'http://localhost:3013', serviceName: 'analytics-service' },
  { prefix: '/api/v1/admin', target: 'http://localhost:3013', serviceName: 'analytics-service' },

  // Seller endpoints — routed to user-service
  { prefix: '/api/v1/seller', target: 'http://localhost:3002', serviceName: 'user-service' },

  // CMS Service (port 3014)
  { prefix: '/api/v1/pages', target: 'http://localhost:3014', serviceName: 'cms-service' },
  { prefix: '/api/v1/banners', target: 'http://localhost:3014', serviceName: 'cms-service' },
  { prefix: '/api/v1/blog', target: 'http://localhost:3014', serviceName: 'cms-service' },
  { prefix: '/api/v1/faq', target: 'http://localhost:3014', serviceName: 'cms-service' },
];

/**
 * Find the matching route config for a given request path.
 * Returns undefined if no route matches.
 */
export function findRouteConfig(path: string): RouteConfig | undefined {
  return ROUTE_CONFIGS.find((route) => path.startsWith(route.prefix));
}
