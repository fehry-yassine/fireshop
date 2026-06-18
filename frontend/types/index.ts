export type MoneyValue = number | string;

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: Pagination;
};

export type UserRole = "BUYER" | "VENDOR" | "ADMIN";
export type VendorStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Vendor = {
  id: string;
  userId?: string;
  storeName: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  status?: VendorStatus;
  isActive?: boolean;
  adminNote?: string | null;
  commissionRate?: MoneyValue;
  createdAt?: string;
  updatedAt?: string;
};

export type VendorApplication = Vendor & {
  status: VendorStatus;
  isActive: boolean;
  user: PublicUser;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  children?: Category[];
  parent?: Category | null;
  _count?: {
    children?: number;
    products?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type HomepagePromoType = "PROMO_CARD" | "HERO_SLIDE";

export type HomepagePromo = {
  id: string;
  type: HomepagePromoType;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type HomepagePromoPayload = {
  type: HomepagePromoType;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type PublicHomepagePromos = {
  promoCards: HomepagePromo[];
  heroSlides: HomepagePromo[];
};

export type ProductImage = {
  id: string;
  productId?: string;
  url: string;
  altText?: string | null;
  sortOrder?: number;
  createdAt?: string;
};

export type Product = {
  id: string;
  vendorId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  price: MoneyValue;
  offerPrice?: MoneyValue | null;
  stockQuantity: number;
  status:
    | "DRAFT"
    | "PENDING_REVIEW"
    | "PUBLISHED"
    | "REJECTED"
    | "ARCHIVED";
  rejectionReason?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isOnOffer: boolean;
  vendor?: Vendor;
  category?: Category;
  images?: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
};

export type AdminProductListItem = {
  id: string;
  image?: string | null;
  name: string;
  title?: string;
  slug: string;
  price: MoneyValue;
  stock: number;
  status: Product["status"];
  vendorName: string;
  categoryName: string;
  orderItemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductListResponse = {
  items: AdminProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    pendingReview: number;
    published: number;
    rejected: number;
    archived: number;
  };
};

export type AdminProductDetails = {
  id: string;
  name: string;
  title?: string;
  slug: string;
  description: string;
  status: Product["status"];
  price: MoneyValue;
  offerPrice?: MoneyValue | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  isOnOffer: boolean;
  rejectionReason?: string | null;
  images: ProductImage[];
  vendor: {
    id: string;
    storeName: string;
    slug: string;
    status: VendorStatus;
    isActive: boolean;
    owner: {
      id: string;
      fullName: string;
      email: string;
      isActive: boolean;
    };
  };
  category: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  };
  orderItemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type VendorProductPayload = {
  categoryId: string;
  name: string;
  slug?: string;
  description?: string;
  price: MoneyValue;
  stockQuantity: number;
  imageUrls?: string[];
};

export type RecommendationLocale = "auto" | "en" | "fr" | "ar_tn";

export type RecommendationSummary = {
  title: string;
  userNeedUnderstanding: string;
  strategyJustification: string;
  matchNarrative: string;
};

export type ProductRecommendation = {
  product: Product;
  score: number;
  reasons: string[];
  matchedTerms: string[];
};

export type ProductRecommendationResponse = {
  query: string;
  normalizedQuery: string;
  locale: Exclude<RecommendationLocale, "auto">;
  parsedBudget: {
    min?: number;
    max?: number;
    currency: "TND";
  } | null;
  summary: RecommendationSummary;
  keywordsUsed: string[];
  results: ProductRecommendation[];
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: Pick<Product, "id" | "name" | "slug" | "description" | "price" | "offerPrice" | "stockQuantity" | "images">;
  vendor: Pick<Vendor, "id" | "storeName" | "slug">;
};

export type CartResponse = {
  items: CartItem[];
  vendor: Pick<Vendor, "id" | "storeName" | "slug"> | null;
  itemCount: number;
  total: number;
};

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export type Order = {
  id: string;
  status: OrderStatus;
  paymentMethod: "CASH_ON_DELIVERY";
  paymentStatus: "UNPAID" | "PAID" | "CANCELLED";
  shipping: {
    fullName: string;
    phone: string;
    address: string;
    addressLine2?: string | null;
    city: string;
    governorate?: string | null;
    postalCode?: string | null;
  };
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string | null;
  vendorDeletedAt?: string | null;
  buyer: PublicUser;
  vendor: Pick<Vendor, "id" | "storeName" | "slug">;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    productImage?: ProductImage | null;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type VendorDashboardStats = {
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  openOrders: number;
  revenue?: number;
  expectedRevenue?: number;
  totalRevenue: number;
  revenueStatuses: OrderStatus[];
  expectedRevenueStatuses?: OrderStatus[];
  openOrderStatuses?: OrderStatus[];
  recentOrders: Order[];
};

export type VendorOrderUpsertPayload = {
  status?: OrderStatus;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  governorate?: string;
  postalCode?: string;
  notes?: string;
};

export type NotificationType =
  | "ORDER_PLACED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_CANCELLED"
  | "PRODUCT_APPROVED"
  | "PRODUCT_REJECTED"
  | "VENDOR_APPLICATION_APPROVED"
  | "VENDOR_APPLICATION_REJECTED"
  | "NEW_ORDER_RECEIVED"
  | "NEW_VENDOR_APPLICATION";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  items: Notification[];
  pagination: Pagination;
};

export type UnreadCountResponse = {
  count: number;
};
