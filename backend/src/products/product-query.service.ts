import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Category,
  Prisma,
  Product,
  ProductImage,
  ProductStatus,
  User,
  Vendor,
  VendorStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PublicProductFilter = {
  categorySlug?: string;
  page?: unknown;
  limit?: unknown;
};

export type AdminProductsQuery = {
  status?: unknown;
  vendorId?: unknown;
  search?: unknown;
  category?: unknown;
  page?: unknown;
  limit?: unknown;
};

export type RecommendationLocale = 'auto' | 'en' | 'fr' | 'ar_tn';
export type FeedbackAction = 'view' | 'click' | 'add_to_cart';

export type RecommendationPayload = {
  needText?: unknown;
  locale?: unknown;
  maxResults?: unknown;
};

export type RecommendationFeedbackPayload = {
  query?: unknown;
  productId?: unknown;
  action?: unknown;
};

export type ParsedBudget = {
  min?: number;
  max?: number;
  currency: 'TND';
};

export type RecommendationSummary = {
  title: string;
  userNeedUnderstanding: string;
  strategyJustification: string;
  matchNarrative: string;
};

export type RecommendationResult = {
  product: ProductWithRelationsPublic;
  score: number;
  reasons: string[];
  matchedTerms: string[];
};

export type RecommendationResponse = {
  query: string;
  normalizedQuery: string;
  locale: Exclude<RecommendationLocale, 'auto'>;
  parsedBudget: ParsedBudget | null;
  summary: RecommendationSummary;
  keywordsUsed: string[];
  results: RecommendationResult[];
};

export type RecommendationCacheEntry = {
  response: RecommendationResponse;
  expiresAt: number;
};

export type ProductWithRelationsPublic = Product & {
  category: Category;
  vendor: Vendor;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    sortOrder: number;
    createdAt: Date;
    productId: string;
  }>;
};

export type ParsedNeed = {
  baseTokens: string[];
  expandedTokens: string[];
  phrases: string[];
};

export type ProductWithRelations = Product & {
  category: Category;
  images: ProductImage[];
  vendor: Vendor & { user: User };
  _count: { orderItems: number };
};

const VALID_LOCALES: RecommendationLocale[] = ['auto', 'en', 'fr', 'ar_tn'];
const FEEDBACK_ACTIONS: FeedbackAction[] = ['view', 'click', 'add_to_cart'];
const PRODUCT_STATUSES = Object.values(ProductStatus);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ProductQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic(filter: PublicProductFilter = {}) {
    const pagination = this.parsePagination(filter);
    const where = this.publicWhere(filter);
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: this.productIncludes(),
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return this.paginated(products, pagination, total);
  }

  findByCategorySlugPublic(categorySlug: string) {
    return this.findAllPublic({ categorySlug });
  }

  async findBySlugPublic(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        ...this.publicWhere({}),
      },
      include: this.productIncludes(),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async recommendProducts(payload: unknown): Promise<RecommendationResponse> {
    const body = this.asRecommendationPayload(payload);
    const needText = this.requiredString(body.needText, 'needText');
    const normalizedQuery = this.normalizeText(needText);

    if (normalizedQuery.length === 0) {
      throw new BadRequestException('needText must include at least one keyword');
    }

    const maxResults = this.parseMaxResults(body.maxResults);
    const cacheKey = normalizedQuery;
    const now = Date.now();
    const cached = this.recommendationCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return this.cloneRecommendationResponseWithLimit(cached.response, maxResults);
    }

    if (cached) {
      this.recommendationCache.delete(cacheKey);
    }

    const locale = this.resolveLocale(body.locale, normalizedQuery);
    const parsedBudget = this.extractBudget(normalizedQuery);
    const parsedNeed = this.optimizeParsedNeedForRanking(
      this.parseNeed(normalizedQuery, locale),
    );
    let keywordsUsed = parsedNeed.expandedTokens.slice(0, 24);
    const productScanLimit = this.resolveProductScanLimit(parsedNeed, parsedBudget);

    const products = await this.prisma.product.findMany({
      where: {
        ...this.publicWhere({}),
        stockQuantity: { gt: 0 },
      },
      include: this.productIncludes(),
      orderBy: { createdAt: 'desc' },
      take: productScanLimit,
    });

    let rankedCandidates = this.rankProductsForNeed(
      products as ProductWithRelationsPublic[],
      parsedNeed,
      parsedBudget,
    );
    const hasStrongMatches = this.hasStrongMatch(rankedCandidates);

    const selected = (hasStrongMatches
      ? rankedCandidates
      : this.buildFallbackResults(products as ProductWithRelationsPublic[]))
      .map((entry) => this.applyFinalEngagementMultiplier(entry))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    const response: RecommendationResponse = {
      query: needText,
      normalizedQuery,
      locale,
      parsedBudget,
      summary: this.buildSummary({
        locale,
        parsedNeed,
        parsedBudget,
        resultCount: selected.length,
      }),
      keywordsUsed,
      results: selected,
    };

    this.recommendationCache.set(cacheKey, {
      response,
      expiresAt: now + 60_000,
    });

    return this.cloneRecommendationResponseWithLimit(response, maxResults);
  }

  async recordRecommendationFeedback(payload: unknown) {
    const body = this.asRecommendationFeedbackPayload(payload);
    const query = this.requiredString(body.query, 'query');
    const productId = this.requiredString(body.productId, 'productId');
    const action = this.parseFeedbackAction(body.action);
    const normalizedQuery = this.normalizeText(query);

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        ...this.publicWhere({}),
      },
      select: {
        id: true,
        categoryId: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const tokens = this.parseNeed(this.normalizeText(query), 'auto').expandedTokens;
    const productDelta = action === 'add_to_cart' ? 1.8 : action === 'click' ? 1.1 : 0.4;
    const categoryDelta = action === 'add_to_cart' ? 0.9 : action === 'click' ? 0.55 : 0.2;

    for (const token of tokens.slice(0, 16)) {
      this.addTokenBoost(this.queryProductBoosts, token, product.id, productDelta, 6);
      this.addTokenBoost(
        this.queryCategoryBoosts,
        token,
        product.categoryId,
        categoryDelta,
        4,
      );
    }

    this.addGlobalProductBoost(product.id, action === 'add_to_cart' ? 1.2 : 0.55, 8);

    if (normalizedQuery) {
      this.recommendationCache.delete(normalizedQuery);
    }

    return { ok: true };
  }

  async findPendingAdmin() {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.PENDING_REVIEW },
      include: this.adminProductIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(query: AdminProductsQuery = {}) {
    const parsed = this.parseAdminProductsQuery(query);
    const where = this.adminProductWhere(parsed);

    const [products, total, pendingCount, publishedCount, rejectedCount, archivedCount] =
      await this.prisma.$transaction([
        this.prisma.product.findMany({
          where,
          include: this.adminProductIncludes(),
          orderBy: { createdAt: 'desc' },
          skip: (parsed.page - 1) * parsed.limit,
          take: parsed.limit,
        }),
        this.prisma.product.count({ where }),
        this.prisma.product.count({
          where: { ...where, status: ProductStatus.PENDING_REVIEW },
        }),
        this.prisma.product.count({
          where: { ...where, status: ProductStatus.PUBLISHED },
        }),
        this.prisma.product.count({
          where: { ...where, status: ProductStatus.REJECTED },
        }),
        this.prisma.product.count({
          where: { ...where, status: ProductStatus.ARCHIVED },
        }),
      ]);

    return {
      items: products.map((product) => this.toAdminProductListItem(product)),
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / parsed.limit)),
      },
      stats: {
        pendingReview: pendingCount,
        published: publishedCount,
        rejected: rejectedCount,
        archived: archivedCount,
      },
    };
  }

  async findByIdAdmin(id: string) {
    const product = await this.findProductWithRelationsByIdOrThrow(id);
    return this.toAdminProductDetails(product);
  }

protected readonly queryProductBoosts = new Map<string, Map<string, number>>();
  private readonly queryCategoryBoosts = new Map<string, Map<string, number>>();
  private readonly productEngagementBoosts = new Map<string, number>();
  private readonly recommendationCache = new Map<string, RecommendationCacheEntry>();

  private parsePagination(query: { page?: unknown; limit?: unknown }) {
    const page = this.optionalPositiveInt(query.page, 'page') ?? DEFAULT_PAGE;
    const limit = this.optionalPositiveInt(query.limit, 'limit') ?? DEFAULT_LIMIT;

    if (limit > MAX_LIMIT) {
      throw new BadRequestException(`limit must be between 1 and ${MAX_LIMIT}`);
    }

    return { page, limit };
  }

  private paginated<T>(
    items: T[],
    pagination: { page: number; limit: number },
    total: number,
  ) {
    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  private parseAdminProductsQuery(query: AdminProductsQuery) {
    const { page, limit } = this.parsePagination(query);

    const status = this.optionalProductStatus(query.status);
    const vendorId = this.optionalString(query.vendorId, 'vendorId');
    const search = this.optionalString(query.search, 'search');
    const category = this.optionalString(query.category, 'category');

    return {
      page,
      limit,
      status,
      vendorId,
      search,
      category,
    };
  }

  private adminProductWhere(query: {
    status: ProductStatus | null;
    vendorId: string | null;
    search: string | null;
    category: string | null;
  }): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};
    const andFilters: Prisma.ProductWhereInput[] = [];

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { vendor: { storeName: { contains: query.search, mode: 'insensitive' } } },
        { category: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.vendorId) {
      andFilters.push(
        {
          OR: [
            { vendorId: query.vendorId },
            { vendor: { storeName: { contains: query.vendorId, mode: 'insensitive' } } },
            { vendor: { slug: { contains: query.vendorId, mode: 'insensitive' } } },
          ],
        },
      );
    }

    if (query.category) {
      andFilters.push(
        {
          OR: [
            { categoryId: query.category },
            { category: { slug: { contains: query.category, mode: 'insensitive' } } },
            { category: { name: { contains: query.category, mode: 'insensitive' } } },
          ],
        },
      );
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    return where;
  }

  private toAdminProductListItem(
    product: Product & {
      vendor: { storeName: string };
      category: { name: string };
      images: Array<{ url: string }>;
      _count: { orderItems: number };
    },
  ) {
    return {
      id: product.id,
      image: product.images[0]?.url ?? null,
      name: product.name,
      title: product.name,
      slug: product.slug,
      price: Number(product.offerPrice ?? product.price),
      stock: product.stockQuantity,
      status: product.status,
      vendorName: product.vendor.storeName,
      categoryName: product.category.name,
      orderItemCount: product._count.orderItems,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toAdminProductDetails(product: ProductWithRelations) {
    return {
      id: product.id,
      name: product.name,
      title: product.name,
      slug: product.slug,
      description: product.description,
      status: product.status,
      price: Number(product.price),
      offerPrice:
        product.offerPrice === null ? null : Number(product.offerPrice),
      stock: product.stockQuantity,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      isOnOffer: product.isOnOffer,
      rejectionReason: product.rejectionReason,
      images: product.images.map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.altText,
        sortOrder: image.sortOrder,
        createdAt: image.createdAt,
      })),
      vendor: {
        id: product.vendor.id,
        storeName: product.vendor.storeName,
        slug: product.vendor.slug,
        status: product.vendor.status,
        isActive: product.vendor.isActive,
        owner: {
          id: product.vendor.user.id,
          fullName: product.vendor.user.fullName,
          email: product.vendor.user.email,
          isActive: product.vendor.user.isActive,
        },
      },
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        isActive: product.category.isActive,
      },
      orderItemCount: product._count.orderItems,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private buildSummary(input: {
    locale: Exclude<RecommendationLocale, 'auto'>;
    parsedNeed: ParsedNeed;
    parsedBudget: ParsedBudget | null;
    resultCount: number;
  }): RecommendationSummary {
    const topTerms = input.parsedNeed.expandedTokens.slice(0, 4);
    const joinedTerms = topTerms.length > 0 ? topTerms.join(', ') : 'besoins generaux';
    const budgetText = input.parsedBudget
      ? ` Budget detecte: ${this.budgetToText(input.parsedBudget)}.`
      : '';
    const resultText =
      input.resultCount > 0
        ? `${input.resultCount} produits prioritaires trouves.`
        : 'Aucun resultat direct, fallback active.';

    return {
      title: 'Resultats de recherche',
      userNeedUnderstanding: `Vous recherchez des produits qui repondent a ces criteres: ${joinedTerms}.${budgetText}`,
      strategyJustification:
        "La recherche compare les noms, categories, descriptions et prix pour trier les produits les plus pertinents.",
      matchNarrative: `Nous avons applique une recherche semantique legere, priorise la pertinence et la disponibilite en stock. ${resultText}`,
    };
  }

  private budgetToText(parsedBudget: ParsedBudget) {
    const min = parsedBudget.min;
    const max = parsedBudget.max;

    if (min !== undefined && max !== undefined) {
      return `entre ${min} et ${max} TND`;
    }

    if (max !== undefined) {
      return `moins de ${max} TND`;
    }

    if (min !== undefined) {
      return `a partir de ${min} TND`;
    }

    return 'non precise';
  }

  private scoreProduct(input: {
    product: ProductWithRelationsPublic;
    parsedNeed: ParsedNeed;
    parsedBudget: ParsedBudget | null;
  }): RecommendationResult | null {
    const { product, parsedNeed, parsedBudget } = input;
    const displayPrice = Number(product.offerPrice ?? product.price);

    if (!Number.isFinite(displayPrice)) {
      return null;
    }

    if (parsedBudget && !this.priceFitsBudget(displayPrice, parsedBudget)) {
      return null;
    }

    const nameText = this.normalizeText(product.name);
    const categoryText = this.normalizeText(product.category?.name ?? '');
    const descriptionText = this.normalizeText(product.description ?? '');

    const nameTokens = this.tokenize(nameText);
    const categoryTokens = this.tokenize(categoryText);
    const descriptionTokens = this.tokenize(descriptionText);

    const allTokens = [...nameTokens, ...categoryTokens, ...descriptionTokens];
    const reasons = new Set<string>();
    const matchedTerms = new Set<string>();
    let score = 0;

    for (const token of parsedNeed.expandedTokens) {
      if (nameTokens.includes(token)) {
        score += 8;
        reasons.add('Nom du produit tres pertinent');
        matchedTerms.add(token);
        continue;
      }

      if (categoryTokens.includes(token)) {
        score += 5;
        reasons.add('Categorie parfaitement alignee');
        matchedTerms.add(token);
        continue;
      }

      if (descriptionTokens.includes(token)) {
        score += 2;
        reasons.add('Description correspondante');
        matchedTerms.add(token);
        continue;
      }

      if (nameTokens.some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))) {
        score += 6;
        reasons.add('Variation proche detectee');
        matchedTerms.add(token);
        continue;
      }

      const fuzzySimilarity = this.maxTokenSimilarity(token, allTokens);
      if (fuzzySimilarity >= 0.66) {
        score += 3;
        reasons.add('Correspondance semantique legere');
        matchedTerms.add(token);
      }
    }

    for (const phrase of parsedNeed.phrases) {
      if (phrase.length >= 4 && (nameText.includes(phrase) || descriptionText.includes(phrase))) {
        score += 4;
        reasons.add('Expression complete retrouvee');
        matchedTerms.add(phrase);
      }
    }

    if (parsedBudget) {
      score += 3;
      reasons.add(`Compatible budget (${this.budgetToText(parsedBudget)})`);
    }

    if (product.isOnOffer || product.offerPrice !== null) {
      score += 1;
      reasons.add('Bon rapport prix/offre');
    }

    const learnedBoost = this.learningBoostForProduct(product, parsedNeed.expandedTokens);
    score += learnedBoost;

    if (score <= 0) {
      return null;
    }

    return {
      product,
      score: Number(score.toFixed(3)),
      reasons: Array.from(reasons).slice(0, 3),
      matchedTerms: Array.from(matchedTerms).slice(0, 8),
    };
  }

  private buildFallbackResults(products: ProductWithRelationsPublic[]): RecommendationResult[] {
    return products
      .slice()
      .sort((a, b) => {
        const aOffer = a.offerPrice !== null || a.isOnOffer ? 1 : 0;
        const bOffer = b.offerPrice !== null || b.isOnOffer ? 1 : 0;
        if (aOffer !== bOffer) {
          return bOffer - aOffer;
        }

        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      })
      .map((product) => ({
        product,
        score: 1,
        reasons: ['Selection populaire en stock'],
        matchedTerms: [],
      }));
  }

  private rankProductsForNeed(
    products: ProductWithRelationsPublic[],
    parsedNeed: ParsedNeed,
    parsedBudget: ParsedBudget | null,
  ) {
    const scored: RecommendationResult[] = [];
    for (const product of products) {
      const entry = this.scoreProduct({
        product,
        parsedNeed,
        parsedBudget,
      });
      if (entry) {
        scored.push(entry);
      }
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  private hasStrongMatch(candidates: RecommendationResult[]) {
    return candidates.some((entry) => entry.score >= 7);
  }

  private optimizeParsedNeedForRanking(parsedNeed: ParsedNeed): ParsedNeed {
    return {
      baseTokens: parsedNeed.baseTokens.slice(0, 10),
      expandedTokens: Array.from(new Set(parsedNeed.expandedTokens)).slice(0, 18),
      phrases: parsedNeed.phrases.slice(0, 3),
    };
  }

  private resolveProductScanLimit(
    parsedNeed: ParsedNeed,
    parsedBudget: ParsedBudget | null,
  ) {
    let limit = 180;

    if (parsedNeed.expandedTokens.length <= 6) {
      limit = 150;
    }

    if (parsedBudget) {
      limit += 30;
    }

    return this.clamp(limit, 120, 240);
  }

  private priceFitsBudget(price: number, budget: ParsedBudget) {
    if (budget.min !== undefined && price < budget.min) {
      return false;
    }

    if (budget.max !== undefined && price > budget.max) {
      return false;
    }

    return true;
  }

  private learningBoostForProduct(product: ProductWithRelationsPublic, queryTokens: string[]) {
    let boost = 0;
    for (const token of queryTokens) {
      boost += this.queryProductBoosts.get(token)?.get(product.id) ?? 0;
      boost += (this.queryCategoryBoosts.get(token)?.get(product.categoryId) ?? 0) * 0.6;
    }

    boost += (this.productEngagementBoosts.get(product.id) ?? 0) * 0.8;
    return this.clamp(boost, 0, 12);
  }

  private addTokenBoost(
    store: Map<string, Map<string, number>>,
    token: string,
    id: string,
    delta: number,
    maxValue: number,
  ) {
    const bucket = store.get(token) ?? new Map<string, number>();
    const nextValue = this.clamp((bucket.get(id) ?? 0) + delta, 0, maxValue);
    bucket.set(id, nextValue);
    store.set(token, bucket);
  }

  private addGlobalProductBoost(productId: string, delta: number, maxValue: number) {
    const nextValue = this.clamp(
      (this.productEngagementBoosts.get(productId) ?? 0) + delta,
      0,
      maxValue,
    );
    this.productEngagementBoosts.set(productId, nextValue);
  }

  private applyFinalEngagementMultiplier(entry: RecommendationResult) {
    const engagement = this.productEngagementBoosts.get(entry.product.id) ?? 0;
    const multiplier = 1 + this.clamp(engagement * 0.015, 0, 0.12);

    return {
      ...entry,
      score: Number((entry.score * multiplier).toFixed(3)),
    };
  }

  private cloneRecommendationResponseWithLimit(
    response: RecommendationResponse,
    maxResults: number,
  ): RecommendationResponse {
    return {
      ...response,
      summary: { ...response.summary },
      keywordsUsed: [...response.keywordsUsed],
      parsedBudget: response.parsedBudget ? { ...response.parsedBudget } : null,
      results: response.results.slice(0, maxResults).map((entry) => ({
        ...entry,
        reasons: [...entry.reasons],
        matchedTerms: [...entry.matchedTerms],
      })),
    };
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private maxTokenSimilarity(queryToken: string, candidates: string[]) {
    let best = 0;
    for (const candidate of candidates) {
      const similarity = this.tokenSimilarity(queryToken, candidate);
      if (similarity > best) {
        best = similarity;
      }
    }

    return best;
  }

  private tokenSimilarity(a: string, b: string) {
    if (a === b) {
      return 1;
    }

    if (!a || !b) {
      return 0;
    }

    const prefixBonus = a.startsWith(b) || b.startsWith(a) ? 0.25 : 0;
    const aTrigrams = this.trigrams(a);
    const bTrigrams = this.trigrams(b);

    if (aTrigrams.size === 0 || bTrigrams.size === 0) {
      return prefixBonus;
    }

    let overlap = 0;
    for (const gram of aTrigrams) {
      if (bTrigrams.has(gram)) {
        overlap += 1;
      }
    }

    const union = new Set<string>([...aTrigrams, ...bTrigrams]).size;
    const jaccard = union > 0 ? overlap / union : 0;
    return this.clamp(jaccard + prefixBonus, 0, 1);
  }

  private trigrams(value: string) {
    const grams = new Set<string>();
    if (value.length < 3) {
      return grams;
    }

    for (let index = 0; index <= value.length - 3; index += 1) {
      grams.add(value.slice(index, index + 3));
    }

    return grams;
  }

  private parseNeed(
    normalizedQuery: string,
    locale: RecommendationLocale,
  ): ParsedNeed {
    const effectiveLocale =
      locale === 'auto' ? this.detectLocale(normalizedQuery) : locale;
    const tokens = this.tokenize(normalizedQuery)
      .map((token) => this.stemToken(this.normalizeArabizi(token), effectiveLocale))
      .filter((token) => token.length >= 2);

    const expanded = new Set<string>();
    for (const token of tokens) {
      expanded.add(token);
      for (const synonym of this.expandToken(token)) {
        expanded.add(synonym);
      }
    }

    const phrases = this.extractPhrases(normalizedQuery);
    return {
      baseTokens: tokens,
      expandedTokens: Array.from(expanded),
      phrases,
    };
  }

  private extractPhrases(normalizedQuery: string) {
    const compact = normalizedQuery.replace(/\s+/g, ' ').trim();
    if (!compact) {
      return [];
    }

    const segments = compact
      .split(/[,.!?;:]/g)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length >= 4);

    return segments.slice(0, 5);
  }

  private expandToken(token: string) {
    const map: Record<string, string[]> = {
      noir: ['black', 'dark'],
      black: ['noir', 'dark'],
      dark: ['black', 'noir'],
      phone: ['smartphone', 'mobile', 'tel'],
      tel: ['phone', 'mobile', 'smartphone'],
      mobile: ['phone', 'smartphone', 'tel'],
      chargeur: ['charger', 'usb', 'fast'],
      charger: ['chargeur', 'usb', 'fast'],
      ecouteur: ['earbuds', 'audio', 'headphones', 'sma3a'],
      earbuds: ['ecouteur', 'audio', 'sma3a'],
      audio: ['earbuds', 'ecouteur', 'sma3a'],
      sma3a: ['audio', 'earbuds', 'ecouteur'],
      shoes: ['running', 'sport', 'chaussure', 'sabat'],
      chaussure: ['shoes', 'running', 'sabat'],
      sabat: ['chaussure', 'shoes', 'running'],
      maison: ['home', 'kitchen'],
      home: ['maison', 'kitchen'],
      cuisine: ['kitchen', 'home', 'maison'],
      kitchen: ['cuisine', 'home', 'maison'],
      fryer: ['airfryer', 'kitchen'],
      airfryer: ['fryer', 'kitchen'],
    };

    return map[token] ?? [];
  }

  private stemToken(token: string, locale: Exclude<RecommendationLocale, 'auto'>) {
    let value = token;
    if (value.length <= 3) {
      return value;
    }

    if (locale === 'fr') {
      value = value
        .replace(/(ements|ement|ation|ateur|atrice)$/u, '')
        .replace(/(euses|euse|eaux|eau|ees|ees|es|s)$/u, '');
    } else {
      value = value
        .replace(/(ingly|edly|ation|ments|ment|ness)$/u, '')
        .replace(/(ing|ed|ly|es|s)$/u, '');
    }

    if (value.length < 2) {
      return token;
    }

    return value;
  }

  private normalizeArabizi(token: string) {
    return token
      .replace(/7/g, 'h')
      .replace(/9/g, 'q')
      .replace(/3/g, 'a')
      .replace(/5/g, 'kh')
      .replace(/2/g, 'a');
  }

  private extractBudget(normalizedQuery: string): ParsedBudget | null {
    const cleaned = normalizedQuery.replace(/,/g, '.');
    const underPatterns = [
      /(?:under|below|less than|moins de|inferieur a|<)\s*(\d+(?:\.\d+)?)/u,
    ];
    const fromPatterns = [
      /(?:from|starting|a partir de|min|>=|>)\s*(\d+(?:\.\d+)?)/u,
    ];
    const betweenPattern =
      /(?:between|entre)\s*(\d+(?:\.\d+)?)\s*(?:and|et|-)\s*(\d+(?:\.\d+)?)/u;

    const betweenMatch = cleaned.match(betweenPattern);
    if (betweenMatch) {
      const min = Number(betweenMatch[1]);
      const max = Number(betweenMatch[2]);
      if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
        return { min, max, currency: 'TND' };
      }
    }

    let min: number | undefined;
    let max: number | undefined;

    for (const pattern of underPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) {
          max = value;
          break;
        }
      }
    }

    for (const pattern of fromPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) {
          min = value;
          break;
        }
      }
    }

    if (min === undefined && max === undefined) {
      return null;
    }

    return { min, max, currency: 'TND' };
  }

  private tokenize(value: string) {
    return value
      .split(/\s+/g)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
  }

  private normalizeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveLocale(
    value: unknown,
    normalizedQuery: string,
  ): Exclude<RecommendationLocale, 'auto'> {
    if (value === undefined || value === null || value === 'auto') {
      return this.detectLocale(normalizedQuery);
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('locale must be a string');
    }

    if (!VALID_LOCALES.includes(value as RecommendationLocale)) {
      throw new BadRequestException('locale is invalid');
    }

    if (value === 'auto') {
      return this.detectLocale(normalizedQuery);
    }

    return value as Exclude<RecommendationLocale, 'auto'>;
  }

  private detectLocale(normalizedQuery: string): Exclude<RecommendationLocale, 'auto'> {
    const frenchHints = ['je', 'veux', 'moins', 'pour', 'avec', 'entre', 'produit'];
    const arabiziHints = /[3579]/;

    if (arabiziHints.test(normalizedQuery)) {
      return 'ar_tn';
    }

    if (
      frenchHints.some(
        (hint) =>
          normalizedQuery === hint ||
          normalizedQuery.startsWith(`${hint} `) ||
          normalizedQuery.endsWith(` ${hint}`) ||
          normalizedQuery.includes(` ${hint} `),
      )
    ) {
      return 'fr';
    }

    return 'en';
  }

  private parseMaxResults(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return 6;
    }

    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      throw new BadRequestException('maxResults must be an integer');
    }

    return this.clamp(parsed, 1, 12);
  }

  private optionalPositiveInt(value: unknown, field: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return parsed;
  }

  private optionalProductStatus(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (
      typeof value !== 'string' ||
      !PRODUCT_STATUSES.includes(value as ProductStatus)
    ) {
      throw new BadRequestException('status is invalid');
    }

    return value as ProductStatus;
  }

  private parseFeedbackAction(value: unknown): FeedbackAction {
    if (typeof value !== 'string') {
      throw new BadRequestException('action is required');
    }

    if (!FEEDBACK_ACTIONS.includes(value as FeedbackAction)) {
      throw new BadRequestException('action is invalid');
    }

    return value as FeedbackAction;
  }

  private asRecommendationPayload(payload: unknown): RecommendationPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as RecommendationPayload;
  }

  private asRecommendationFeedbackPayload(
    payload: unknown,
  ): RecommendationFeedbackPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as RecommendationFeedbackPayload;
  }

  private publicWhere(filter: PublicProductFilter): Prisma.ProductWhereInput {
    return {
      isActive: true,
      status: ProductStatus.PUBLISHED,
      category: {
        isActive: true,
        ...(filter.categorySlug ? { slug: filter.categorySlug } : {}),
      },
      vendor: this.publicVendorWhere(),
    };
  }

  private publicVendorWhere(): Prisma.VendorWhereInput {
    return {
      isActive: true,
      status: VendorStatus.APPROVED,
      user: { isActive: true },
    };
  }

  private productIncludes() {
    return {
      vendor: {
        select: {
          id: true,
          storeName: true,
          slug: true,
          description: true,
          logoUrl: true,
          status: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      category: true,
      images: {
        orderBy: { sortOrder: 'asc' as const },
      },
    };
  }

  private adminProductIncludes() {
    return {
      ...this.productIncludes(),
      _count: {
        select: {
          orderItems: true,
        },
      },
    };
  }

  private productRelationsInclude() {
    return {
      vendor: { include: { user: true } },
      category: true,
      images: {
        orderBy: { sortOrder: 'asc' as const },
      },
      _count: {
        select: {
          orderItems: true,
        },
      },
    };
  }

  private async findProductWithRelationsByIdOrThrow(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.productRelationsInclude(),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private optionalString(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
