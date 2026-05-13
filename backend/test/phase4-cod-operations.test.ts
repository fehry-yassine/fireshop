import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

const product = {
  id: 'product-1',
  vendorId: vendor.id,
  categoryId: 'category-1',
  name: 'COD Product',
  slug: 'cod-product',
  description: 'A product used for COD order workflow tests.',
  price: 100,
  offerPrice: null,
  stockQuantity: 8,
  status: ProductStatus.PUBLISHED,
  rejectionReason: null,
  isActive: true,
  isFeatured: false,
  isOnOffer: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function orderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    buyerId: buyerUser.id,
    vendorId: vendor.id,
    shippingFullName: buyerUser.fullName,
    shippingPhone: buyerUser.phone,
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
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        unitPrice: 100,
        quantity: 2,
        subtotal: 200,
        product: { ...product, images: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function statusUpdateService(order: ReturnType<typeof orderFixture>) {
  let restoreClaims = 0;
  let stockIncrements = 0;
  let stockRestoreUpdates = 0;

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
          update: async (args: { data: { status?: OrderStatus } }) => ({
            ...order,
            status: args.data.status ?? order.status,
          }),
          findUniqueOrThrow: async () => ({
            ...order,
            stockRestoredAt: restoreClaims > 0 ? new Date() : null,
          }),
        },
        product: {
          update: async (args: { data: { stockQuantity: { increment: number } } }) => {
            stockRestoreUpdates += 1;
            stockIncrements += args.data.stockQuantity.increment;
            return product;
          },
        },
        auditLog: {
          create: async () => ({}),
        },
      }),
  } as any);

  return {
    service,
    get restoreClaims() {
      return restoreClaims;
    },
    get stockIncrements() {
      return stockIncrements;
    },
    get stockRestoreUpdates() {
      return stockRestoreUpdates;
    },
  };
}

test('invalid COD status transitions are rejected', async () => {
  let transactionCalled = false;
  const service = new OrdersService({
    order: {
      findUnique: async () => orderFixture({ status: OrderStatus.PENDING }),
    },
    $transaction: async () => {
      transactionCalled = true;
    },
  } as any);

  await assert.rejects(
    () => service.updateAdminOrderStatus('order-1', { status: OrderStatus.DELIVERED }),
    BadRequestException,
  );

  assert.equal(transactionCalled, false);
});

test('cancelled COD order restores stock once', async () => {
  const harness = statusUpdateService(orderFixture({ status: OrderStatus.PENDING }));

  await harness.service.updateAdminOrderStatus('order-1', {
    status: OrderStatus.CANCELLED,
  });
  await harness.service.updateAdminOrderStatus('order-1', {
    status: OrderStatus.CANCELLED,
  });

  assert.equal(harness.restoreClaims, 2);
  assert.equal(harness.stockRestoreUpdates, 1);
  assert.equal(harness.stockIncrements, 2);
});

test('returned COD order restores stock once', async () => {
  const harness = statusUpdateService(orderFixture({ status: OrderStatus.SHIPPED }));

  await harness.service.updateAdminOrderStatus('order-1', {
    status: OrderStatus.RETURNED,
  });
  await harness.service.updateAdminOrderStatus('order-1', {
    status: OrderStatus.RETURNED,
  });

  assert.equal(harness.restoreClaims, 2);
  assert.equal(harness.stockRestoreUpdates, 1);
  assert.equal(harness.stockIncrements, 2);
});

test('delivered COD order does not restore stock', async () => {
  const harness = statusUpdateService(orderFixture({ status: OrderStatus.SHIPPED }));

  await harness.service.updateAdminOrderStatus('order-1', {
    status: OrderStatus.DELIVERED,
  });

  assert.equal(harness.restoreClaims, 0);
  assert.equal(harness.stockRestoreUpdates, 0);
  assert.equal(harness.stockIncrements, 0);
});

test('vendor cannot update another vendor order in COD workflow', async () => {
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
