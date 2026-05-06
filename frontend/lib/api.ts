import type {
  AdminProductDetails,
  AdminProductListResponse,
  CartResponse,
  Category,
  Order,
  OrderStatus,
  PaginatedResponse,
  Product,
  ProductRecommendationResponse,
  PublicUser,
  RecommendationLocale,
  Vendor,
  VendorApplication,
  VendorDashboardStats,
  VendorOrderUpsertPayload,
  VendorProductPayload,
} from "@/types";

const SERVER_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api";
const CLIENT_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const CSRF_COOKIE_NAME = "localmarket_csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type QueryValue = string | number | boolean | null | undefined;
type ApiQuery = Record<string, QueryValue>;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: ApiQuery;
  timeoutMs?: number;
};

type AuthPayload = {
  email: string;
  password: string;
};

type RegisterPayload = AuthPayload & {
  fullName: string;
  phone?: string;
};

type CheckoutPayload = {
  customerName: string;
  phone: string;
  address: string;
  city: string;
  governorate?: string;
  postalCode?: string;
  notes?: string;
};

type CsrfTokenResponse = {
  csrfToken: string;
  headerName: string;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return SERVER_API_URL;
  }

  if (
    !CLIENT_API_URL ||
    CLIENT_API_URL === "/api" ||
    CLIENT_API_URL.startsWith("http://localhost:4000") ||
    CLIENT_API_URL.startsWith("http://127.0.0.1:4000")
  ) {
    return "/api";
  }

  return CLIENT_API_URL;
}

function buildUrl(path: string, query?: ApiQuery) {
  const baseUrl = getApiBaseUrl();
  const url = new URL(
    `${baseUrl.replace(/\/$/, "")}${path}`,
    typeof window === "undefined" ? undefined : window.location.origin,
  );

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

function requestMethod(method: string | undefined) {
  return (method ?? "GET").toUpperCase();
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

async function ensureCsrfToken(timeoutMs: number) {
  if (typeof window === "undefined") {
    return null;
  }

  const cookieToken = readCookie(CSRF_COOKIE_NAME);

  if (cookieToken) {
    csrfTokenCache = cookieToken;
    return cookieToken;
  }

  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  csrfTokenPromise ??= fetch(buildUrl("/csrf-token"), {
    cache: "no-store",
    credentials: "include",
    signal: AbortSignal.timeout(timeoutMs),
  })
    .then(async (response) => {
      const payload = await parseResponse(response);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : `API request failed with status ${response.status}`;

        throw new ApiError(message, response.status, payload);
      }

      const token =
        payload && typeof payload === "object" && "csrfToken" in payload
          ? String((payload as CsrfTokenResponse).csrfToken)
          : readCookie(CSRF_COOKIE_NAME);

      csrfTokenCache = token || null;
      return csrfTokenCache;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
}

async function request<T>(path: string, options: ApiRequestOptions = {}) {
  const { body, query, headers, timeoutMs = 5000, ...init } = options;
  const requestHeaders = new Headers(headers);
  const method = requestMethod(init.method);
  let requestBody: BodyInit | undefined;

  if (body !== undefined) {
    if (body instanceof FormData || body instanceof URLSearchParams || typeof body === "string") {
      requestBody = body;
    } else {
      requestHeaders.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  if (
    STATE_CHANGING_METHODS.has(method) &&
    !requestHeaders.has(CSRF_HEADER_NAME)
  ) {
    const csrfToken = await ensureCsrfToken(timeoutMs);

    if (csrfToken) {
      requestHeaders.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    body: requestBody,
    cache: init.cache ?? "no-store",
    credentials: "include",
    headers: requestHeaders,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const payload = await parseResponse(response);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `API request failed with status ${response.status}`;

    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return parseResponse(response) as Promise<T>;
}

export const auth = {
  register: (payload: RegisterPayload) =>
    request<{ user: PublicUser }>("/auth/register", {
      method: "POST",
      body: payload,
    }),
  login: (payload: AuthPayload) =>
    request<{ user: PublicUser }>("/auth/login", {
      method: "POST",
      body: payload,
    }),
  logout: () =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
    }),
  me: () => request<{ user: PublicUser }>("/auth/me"),
};

export const categories = {
  list: () => request<Category[]>("/categories"),
  tree: () => request<Category[]>("/categories/tree"),
  getBySlug: (slug: string) => request<Category>(`/categories/${slug}`),
  productsByCategory: (slug: string) =>
    request<PaginatedResponse<Product>>(`/categories/${slug}/products`).then(
      (response) => response.items,
    ),
};

export const products = {
  list: (query?: { category?: string; page?: number; limit?: number }) =>
    request<PaginatedResponse<Product>>("/products", { query }).then(
      (response) => response.items,
    ),
  getBySlug: (slug: string) => request<Product>(`/products/${slug}`),
};

export const search = {
  recommend: (payload: {
    needText: string;
    locale?: RecommendationLocale;
    maxResults?: number;
  }) =>
    request<ProductRecommendationResponse>("/products/recommend", {
      method: "POST",
      body: payload,
    }),
  feedback: (payload: {
    query: string;
    productId: string;
    action: "view" | "click" | "add_to_cart";
  }) =>
    request<{ ok: boolean }>("/products/recommend/feedback", {
      method: "POST",
      body: payload,
      timeoutMs: 3000,
    }),
};

export const vendors = {
  list: () => request<Vendor[]>("/vendors"),
  getBySlug: (slug: string) => request<Vendor>(`/vendors/${slug}`),
  me: () => request<{ vendor: Vendor }>("/vendors/me"),
  myApplication: () =>
    request<{ application: VendorApplication | null }>("/vendors/my-application"),
  apply: (payload: { storeName: string; description?: string }) =>
    request<{ application: VendorApplication }>("/vendors/apply", {
      method: "POST",
      body: payload,
    }),
  dashboard: () => request<VendorDashboardStats>("/vendors/dashboard"),
  orders: (query?: {
    deleted?: boolean;
    search?: string;
    status?: OrderStatus;
    page?: number;
    limit?: number;
  }) =>
    request<PaginatedResponse<Order>>("/vendors/orders", { query }).then(
      (response) => response.items,
    ),
  createOrder: (payload: VendorOrderUpsertPayload) =>
    request<{ order: Order }>("/vendors/orders", {
      method: "POST",
      body: payload,
    }),
  deleteOrder: (id: string) =>
    request<{ order: Order }>(`/vendors/orders/${id}`, {
      method: "DELETE",
    }),
  updateOrder: (id: string, payload: VendorOrderUpsertPayload) =>
    request<{ order: Order }>(`/vendors/orders/${id}`, {
      method: "PATCH",
      body: payload,
    }),
  updateOrderStatus: (id: string, status: OrderStatus) =>
    request<{ order: Order }>(`/vendors/orders/${id}/status`, {
      method: "PATCH",
      body: { status },
  }),
  products: {
    list: (query?: { page?: number; limit?: number }) =>
      request<PaginatedResponse<Product>>("/vendor/products", { query }).then(
        (response) => response.items,
      ),
    uploadImage: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      return request<{ url: string }>("/vendor/products/upload-image", {
        method: "POST",
        body: formData,
        timeoutMs: 20000,
      });
    },
    create: (payload: VendorProductPayload) =>
      request<Product>("/vendor/products", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Partial<VendorProductPayload>) =>
      request<Product>(`/vendor/products/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    publish: (id: string) =>
      request<Product>(`/vendor/products/${id}/publish`, {
        method: "PATCH",
      }),
    archive: (id: string) =>
      request<Product>(`/vendor/products/${id}/archive`, {
        method: "PATCH",
      }),
  },
};

type CategoryPayload = {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
};

export const cart = {
  get: () => request<CartResponse>("/cart"),
  addItem: (payload: { productId: string; quantity: number }) =>
    request<CartResponse>("/cart/items", {
      method: "POST",
      body: payload,
    }),
  updateItem: (id: string, payload: { quantity: number }) =>
    request<CartResponse>(`/cart/items/${id}`, {
      method: "PATCH",
      body: payload,
    }),
  removeItem: (id: string) =>
    request<CartResponse>(`/cart/items/${id}`, {
      method: "DELETE",
    }),
  clear: () =>
    request<CartResponse>("/cart", {
      method: "DELETE",
    }),
};

export const orders = {
  list: () => request<Order[]>("/orders"),
  getById: (id: string) => request<Order>(`/orders/${id}`),
  checkout: (payload: CheckoutPayload) =>
    request<{ order: Order }>("/orders/checkout", {
      method: "POST",
      body: payload,
    }),
};

export const admin = {
  products: {
    list: (query?: {
      status?: Product["status"] | "ALL";
      vendorId?: string;
      search?: string;
      category?: string;
      page?: number;
      limit?: number;
    }) =>
      request<AdminProductListResponse>("/admin/products", {
        query:
          query?.status === "ALL"
            ? { ...query, status: undefined }
            : query,
      }),
    getById: (id: string) => request<AdminProductDetails>(`/admin/products/${id}`),
    approve: (id: string) =>
      request<Product>(`/admin/products/${id}/approve`, {
        method: "PATCH",
      }),
    reject: (id: string, payload: { reason: string }) =>
      request<Product>(`/admin/products/${id}/reject`, {
        method: "PATCH",
        body: payload,
      }),
    archive: (id: string) =>
      request<Product>(`/admin/products/${id}/archive`, {
        method: "PATCH",
      }),
    feature: (id: string, featured: boolean) =>
      request<Product>(`/admin/products/${id}/feature`, {
        method: "PATCH",
        body: { featured },
      }),
  },
  vendors: {
    applications: (query?: { status?: string }) =>
      request<VendorApplication[]>("/admin/vendors/applications", { query }),
    approveApplication: (id: string, payload?: { adminNote?: string }) =>
      request<{ vendor: VendorApplication }>(
        `/admin/vendors/applications/${id}/approve`,
        {
          method: "PATCH",
          body: payload ?? {},
        },
      ),
    rejectApplication: (id: string, payload: { adminNote: string }) =>
      request<{ application: VendorApplication }>(
        `/admin/vendors/applications/${id}/reject`,
        {
          method: "PATCH",
          body: payload,
        },
      ),
    list: (query?: { status?: string }) =>
      request<VendorApplication[]>("/admin/vendors", { query }),
  },
  orders: {
    list: (query?: { status?: OrderStatus; page?: number; limit?: number }) =>
      request<PaginatedResponse<Order>>("/admin/orders", { query }).then(
        (response) => response.items,
      ),
    updateStatus: (id: string, status: OrderStatus) =>
      request<{ order: Order }>(`/admin/orders/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
  },
  categories: {
    list: () => request<Category[]>("/categories"),
    create: (payload: CategoryPayload) =>
      request<Category>("/admin/categories", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Partial<CategoryPayload>) =>
      request<Category>(`/admin/categories/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    delete: (id: string) =>
      request<Category>(`/admin/categories/${id}`, {
        method: "DELETE",
      }),
  },
};

export const api = {
  admin,
  auth,
  cart,
  categories,
  orders,
  products,
  search,
  vendors,
};
