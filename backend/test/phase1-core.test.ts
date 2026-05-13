import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  Role,
  VendorStatus,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OrdersService } from '../src/orders/orders.service';
import { ProductCrudService } from '../src/products/product-crud.service';
import { ProductLifecycleService } from '../src/products/product-lifecycle.service';
import { ProductMediaService } from '../src/products/product-media.service';
import { ProductQueryService } from '../src/products/product-query.service';
import { ProductsService } from '../src/products/products.service';

const buyerUser = {
  id: 'buyer-1',
  email: 'buyer@example.test',
  fullName: 'Buyer One',
  passwordHash: 'hash',
  phone: '20000000',
  role: Role.BUYER,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

const publishedProduct = {
  id: 'product-1',
  vendorId: vendor.id,
  categoryId: category.id,
  name: 'Published Product',
  slug: 'published-product',
  description: 'A long enough product description for publishing and ordering.',
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
};

function orderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    buyerId: buyerUser.id,
    vendorId: vendor.id,
    shippingFullName: 'Buyer One',
    shippingPhone: '20000000',
    shippingAddressLine1: '1 Main Street',
    shippingAddressLine2: null,
    shippingCity: 'Tunis',
    shippingGovernorate: 'Tunis',
    shippingPostalCode: null,
    subtotal: 200,
    deliveryFee: 0,
    total: 200,
    status: OrderStatus.PENDING,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    paymentStatus: PaymentStatus.UNPAID,
    notes: null,
    vendorDeletedAt: null,
    stockRestoredAt: null,
    buyer: buyerUser,
    vendor,
    items: [
      {
        id: 'order-item-1',
        orderId: 'order-1',
        productId: publishedProduct.id,
        productName: publishedProduct.name,
        productSlug: publishedProduct.slug,
        unitPrice: 100,
        quantity: 2,
        subtotal: 200,
        product: { ...publishedProduct, images: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

test('vendor cannot access another vendor product', async () => {
  const prisma = {
    user: {
      findUnique: async () => ({ ...vendorUser, vendor }),
    },
    product: {
      findFirst: async (args: { where: { id: string; vendorId: string } }) => {
        assert.equal(args.where.id, 'other-product');
        assert.equal(args.where.vendorId, vendor.id);
        return null;
      },
    },
  } as any;
  const service = new ProductsService(
    {} as ProductQueryService,
    {} as ProductMediaService,
    {} as ProductLifecycleService,
    new ProductCrudService(prisma),
  );

  await assert.rejects(
    () =>
      service.updateVendorProduct(
        { sub: vendorUser.id, role: Role.VENDOR },
        'other-product',
        { name: 'Updated' },
      ),
    NotFoundException,
  );
});

test('vendor cannot access another vendor order', async () => {
  const service = new OrdersService({
    user: {
      findUnique: async () => vendorUser,
    },
    vendor: {
      findUnique: async () => vendor,
    },
    order: {
      findFirst: async (args: { where: { id: string; vendorId: string } }) => {
        assert.equal(args.where.id, 'other-order');
        assert.equal(args.where.vendorId, vendor.id);
        return null;
      },
    },
  } as any);

  await assert.rejects(
    () =>
      service.updateVendorOrderStatus(
        { sub: vendorUser.id, role: Role.VENDOR },
        'other-order',
        { status: OrderStatus.CONFIRMED },
      ),
    NotFoundException,
  );
});

test('unpublished products do not appear in marketplace query', async () => {
  let findManyWhere: unknown;
  const service = new ProductQueryService({
    $transaction: async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    product: {
      findMany: async (args: { where: unknown }) => {
        findManyWhere = args.where;
        return [publishedProduct];
      },
      count: async () => 1,
    },
  } as any);

  const response = await service.findAllPublic();

  assert.deepEqual(
    response.items.map((product) => product.id),
    [publishedProduct.id],
  );
  assert.equal((findManyWhere as { status: ProductStatus }).status, ProductStatus.PUBLISHED);
  assert.equal((findManyWhere as { isActive: boolean }).isActive, true);
});

test('checkout creates order with correct vendorId', async () => {
  let createdOrderVendorId: string | undefined;
  const order = orderFixture();
  const service = new OrdersService({
    user: {
      findUnique: async () => buyerUser,
    },
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        cartItem: {
          findMany: async () => [
            {
              id: 'cart-item-1',
              userId: buyerUser.id,
              productId: publishedProduct.id,
              quantity: 2,
              product: publishedProduct,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          deleteMany: async () => ({ count: 1 }),
        },
        order: {
          create: async (args: { data: { vendorId: string } }) => {
            createdOrderVendorId = args.data.vendorId;
            return order;
          },
        },
        product: {
          updateMany: async () => ({ count: 1 }),
        },
      }),
  } as any);

  const response = await service.checkout(
    { sub: buyerUser.id, role: Role.BUYER },
    {
      customerName: 'Buyer One',
      phone: '20000000',
      address: '1 Main Street',
      city: 'Tunis',
    },
  );

  assert.equal(createdOrderVendorId, vendor.id);
  assert.equal(response.order.vendor.id, vendor.id);
});

test('cancelled order restores stock once', async () => {
  let restoreClaims = 0;
  let stockIncrements = 0;
  const order = orderFixture();
  const service = new OrdersService({
    order: {
      findUnique: async () => order,
    },
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        order: {
          updateMany: async () => {
            restoreClaims += 1;
            return { count: restoreClaims === 1 ? 1 : 0 };
          },
          update: async () => ({ ...order, status: OrderStatus.CANCELLED }),
          findUniqueOrThrow: async () => ({
            ...order,
            status: OrderStatus.CANCELLED,
            stockRestoredAt: new Date(),
          }),
        },
        product: {
          update: async (args: { data: { stockQuantity: { increment: number } } }) => {
            stockIncrements += args.data.stockQuantity.increment;
            return publishedProduct;
          },
        },
        auditLog: {
          create: async () => ({}),
        },
      }),
  } as any);

  await service.updateAdminOrderStatus('order-1', { status: OrderStatus.CANCELLED });
  await service.updateAdminOrderStatus('order-1', { status: OrderStatus.CANCELLED });

  assert.equal(stockIncrements, 2);
  assert.equal(restoreClaims, 2);
});


