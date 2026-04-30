export type MoneyValue = number | string;

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
  createdAt?: string;
  updatedAt?: string;
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
  status: "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  isActive: boolean;
  isFeatured: boolean;
  isOnOffer: boolean;
  vendor?: Vendor;
  category?: Category;
  images?: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
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
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
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
  buyer: PublicUser;
  vendor: Pick<Vendor, "id" | "storeName" | "slug">;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  createdAt: string;
  updatedAt: string;
};
