import type {
  CartResponse,
  Category,
  Order,
  Product,
  PublicUser,
  Vendor,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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

function buildUrl(path: string, query?: ApiQuery) {
  const url = new URL(`${API_URL}${path}`);

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

async function request<T>(path: string, options: ApiRequestOptions = {}) {
  const { body, query, headers, timeoutMs = 5000, ...init } = options;
  const requestHeaders = new Headers(headers);
  let requestBody: BodyInit | undefined;

  if (body !== undefined) {
    if (body instanceof FormData || body instanceof URLSearchParams || typeof body === "string") {
      requestBody = body;
    } else {
      requestHeaders.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
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
    request<Product[]>(`/categories/${slug}/products`),
};

export const products = {
  list: (query?: { category?: string }) =>
    request<Product[]>("/products", { query }),
  getBySlug: (slug: string) => request<Product>(`/products/${slug}`),
};

export const vendors = {
  list: () => request<Vendor[]>("/vendors"),
  getBySlug: (slug: string) => request<Vendor>(`/vendors/${slug}`),
  me: () => request<Vendor>("/vendors/me"),
  myApplication: () => request<Vendor>("/vendors/my-application"),
  apply: (payload: { storeName: string; description?: string }) =>
    request<Vendor>("/vendors/apply", {
      method: "POST",
      body: payload,
    }),
  orders: () => request<Order[]>("/vendors/orders"),
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

export const api = {
  auth,
  cart,
  categories,
  orders,
  products,
  vendors,
};
