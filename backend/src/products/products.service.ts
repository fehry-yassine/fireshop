import { Injectable } from '@nestjs/common';
import { AuthTokenPayload } from '../auth/auth.types';
import { ProductCrudService } from './product-crud.service';
import { ProductLifecycleService } from './product-lifecycle.service';
import {
  ProductMediaService,
  type UploadedImageFile,
} from './product-media.service';
import {
  ProductQueryService,
  type AdminProductsQuery,
  type PublicProductFilter,
} from './product-query.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productQueryService: ProductQueryService,
    private readonly productMediaService: ProductMediaService,
    private readonly productLifecycleService: ProductLifecycleService,
    private readonly productCrudService: ProductCrudService,
  ) {}

  findAllPublic(filter: PublicProductFilter = {}) {
    return this.productQueryService.findAllPublic(filter);
  }

  findByCategorySlugPublic(categorySlug: string) {
    return this.productQueryService.findByCategorySlugPublic(categorySlug);
  }

  findBySlugPublic(slug: string) {
    return this.productQueryService.findBySlugPublic(slug);
  }

  recommendProducts(payload: unknown) {
    return this.productQueryService.recommendProducts(payload);
  }

  recordRecommendationFeedback(payload: unknown) {
    return this.productQueryService.recordRecommendationFeedback(payload);
  }

  findPendingAdmin() {
    return this.productQueryService.findPendingAdmin();
  }

  findAllAdmin(query: AdminProductsQuery = {}) {
    return this.productQueryService.findAllAdmin(query);
  }

  findByIdAdmin(id: string) {
    return this.productQueryService.findByIdAdmin(id);
  }

  async findVendorProducts(
    currentUser: AuthTokenPayload,
    query: { page?: unknown; limit?: unknown } = {},
  ) {
    return this.productCrudService.findVendorProducts(currentUser, query);
  }

  async createVendorProduct(
    currentUser: AuthTokenPayload,
    payload: unknown,
  ) {
    return this.productCrudService.createVendorProduct(currentUser, payload);
  }

  async updateVendorProduct(
    currentUser: AuthTokenPayload,
    id: string,
    payload: unknown,
  ) {
    return this.productCrudService.updateVendorProduct(currentUser, id, payload);
  }

  async archiveVendorProduct(currentUser: AuthTokenPayload, id: string) {
    return this.productCrudService.archiveVendorProduct(currentUser, id);
  }

  async uploadVendorProductImage(
    currentUser: AuthTokenPayload,
    file: UploadedImageFile | undefined,
  ) {
    return this.productMediaService.uploadVendorProductImage(currentUser, file);
  }

  async publishVendorProduct(currentUser: AuthTokenPayload, id: string) {
    return this.productLifecycleService.publishVendorProduct(currentUser, id);
  }

  async approveProductAdmin(id: string, currentUser?: AuthTokenPayload) {
    return this.productLifecycleService.approveProductAdmin(id, currentUser);
  }

  async rejectProductAdmin(
    id: string,
    payload: unknown,
    currentUser?: AuthTokenPayload,
  ) {
    return this.productLifecycleService.rejectProductAdmin(id, payload, currentUser);
  }

  async archiveProductAdmin(id: string) {
    return this.productLifecycleService.archiveProductAdmin(id);
  }

  async republishProductAdmin(id: string, currentUser?: AuthTokenPayload) {
    return this.productLifecycleService.republishProductAdmin(id, currentUser);
  }

  async deleteProductPermanentAdmin(
    id: string,
    currentUser?: AuthTokenPayload,
  ) {
    return this.productLifecycleService.deleteProductPermanentAdmin(
      id,
      currentUser,
    );
  }

  async featureProductAdmin(id: string, payload: unknown) {
    return this.productLifecycleService.featureProductAdmin(id, payload);
  }
}
