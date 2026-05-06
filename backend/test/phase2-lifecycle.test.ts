import 'reflect-metadata';
import { ProductStatus, Role, VendorStatus } from '@prisma/client';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProductCrudService } from '../src/products/product-crud.service';
import { ProductLifecycleService } from '../src/products/product-lifecycle.service';
import { ProductMediaService } from '../src/products/product-media.service';
import { ProductQueryService } from '../src/products/product-query.service';
import { ProductsService } from '../src/products/products.service';

const vendorUser = {
  id: 'vendor-user-1',
  email: 'vendor@example.test',
  fullName: 'Vendor One',
  passwordHash: 'hash',
  phone: '21000000',
  role: Role.VENDOR,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const vendor = {
  id: 'vendor-1',
  userId: vendorUser.id,
  storeName: 'Vendor Store',
  slug: 'vendor-store',
  description: null,
  logoUrl: null,
  status: VendorStatus.APPROVED,
  isActive: true,
  adminNote: null,
  commissionRate: 8,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const category = {
  id: 'category-1',
  name: 'Electronics',
  slug: 'electronics',
  description: null,
  parentId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function productFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    vendorId: vendor.id,
    categoryId: category.id,
    name: 'Published Product',
    slug: 'published-product',
    description: 'A long enough product description for lifecycle tests.',
    price: 100,
    offerPrice: null,
    stockQuantity: 10,
    status: ProductStatus.PUBLISHED,
    rejectionReason: null,
    isActive: true,
    isFeatured: false,
    isOnOffer: false,
    category,
    vendor: { ...vendor, user: vendorUser },
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createProductsService(product: Record<string, unknown>) {
  let currentProduct = product;
  let lastUpdateData: Record<string, unknown> | undefined;

  const prisma = {
    $transaction: async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    user: {
      findUnique: async () => ({ ...vendorUser, vendor }),
    },
    product: {
      findFirst: async () => currentProduct,
      findMany: async () => [currentProduct],
      count: async () => 1,
      update: async (args: { data: Record<string, unknown> }) => {
        lastUpdateData = args.data;
        currentProduct = { ...currentProduct, ...args.data };
        return currentProduct;
      },
    },
  } as any;

  const queryService = new ProductQueryService(prisma);
  const crudService = new ProductCrudService(prisma);
  const service = new ProductsService(
    queryService,
    {} as ProductMediaService,
    {} as ProductLifecycleService,
    crudService,
  );

  return {
    service,
    get currentProduct() {
      return currentProduct;
    },
    get lastUpdateData() {
      return lastUpdateData;
    },
  };
}

test('stock-only vendor edit does not unpublish product', async () => {
  const harness = createProductsService(productFixture());

  const updated = await harness.service.updateVendorProduct(
    { sub: vendorUser.id, role: Role.VENDOR },
    'product-1',
    { stockQuantity: 7 },
  );

  assert.equal(updated?.status, ProductStatus.PUBLISHED);
  assert.equal(updated?.stockQuantity, 7);
  assert.equal(harness.lastUpdateData?.status, undefined);
  assert.equal(harness.lastUpdateData?.rejectionReason, undefined);
});

test('content vendor edit resets product to draft', async () => {
  const harness = createProductsService(productFixture());

  const updated = await harness.service.updateVendorProduct(
    { sub: vendorUser.id, role: Role.VENDOR },
    'product-1',
    { name: 'Updated public name' },
  );

  assert.equal(updated?.status, ProductStatus.DRAFT);
  assert.equal(updated?.rejectionReason, null);
  assert.equal(harness.lastUpdateData?.status, ProductStatus.DRAFT);
  assert.equal(harness.lastUpdateData?.rejectionReason, null);
});

test('rejected product content edit clears rejection reason', async () => {
  const harness = createProductsService(
    productFixture({
      status: ProductStatus.REJECTED,
      rejectionReason: 'Description is too short.',
      isActive: false,
    }),
  );

  const updated = await harness.service.updateVendorProduct(
    { sub: vendorUser.id, role: Role.VENDOR },
    'product-1',
    { description: 'This updated description is ready for review again.' },
  );

  assert.equal(updated?.status, ProductStatus.DRAFT);
  assert.equal(updated?.rejectionReason, null);
  assert.equal(harness.lastUpdateData?.rejectionReason, null);
});

test('published product remains in marketplace after stock-only edit', async () => {
  const harness = createProductsService(productFixture());

  await harness.service.updateVendorProduct(
    { sub: vendorUser.id, role: Role.VENDOR },
    'product-1',
    { stockQuantity: 7 },
  );

  const response = await harness.service.findAllPublic();

  assert.deepEqual(
    response.items.map((product) => product.id),
    ['product-1'],
  );
  assert.equal(response.items[0]?.status, ProductStatus.PUBLISHED);
  assert.equal(response.items[0]?.stockQuantity, 7);
  assert.equal(response.pagination.total, 1);
});

