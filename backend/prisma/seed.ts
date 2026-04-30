import { Prisma, PrismaClient, ProductStatus, Role, VendorStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = 'Test@12345';
const PASSWORD_HASH_ROUNDS = 12;

const ids = {
  users: {
    admin: 'usr_admin_001',
    buyerOne: 'usr_buyer_001',
    buyerTwo: 'usr_buyer_002',
    vendorOneOwner: 'usr_vendor_owner_001',
    vendorTwoOwner: 'usr_vendor_owner_002',
    pendingVendorOwner: 'usr_vendor_pending_001',
    rejectedVendorOwner: 'usr_vendor_rejected_001',
    suspendedVendorOwner: 'usr_vendor_suspended_001',
  },
  vendors: {
    approvedOne: 'vnd_approved_001',
    approvedTwo: 'vnd_approved_002',
    pending: 'vnd_pending_001',
    rejected: 'vnd_rejected_001',
    suspended: 'vnd_suspended_001',
  },
  categories: {
    electronics: 'cat_electronics',
    homeKitchen: 'cat_home_kitchen',
    fashion: 'cat_fashion',
    phones: 'cat_phones',
    audio: 'cat_audio',
    kitchenTools: 'cat_kitchen_tools',
    menFashion: 'cat_men_fashion',
    inactive: 'cat_inactive',
  },
  products: {
    earbuds: 'prd_earbuds_001',
    charger: 'prd_charger_001',
    watchPending: 'prd_watch_pending_001',
    airFryer: 'prd_airfryer_001',
    runningShoes: 'prd_running_shoes_001',
    blenderArchived: 'prd_blender_archived_001',
    pendingVendorProduct: 'prd_pending_vendor_001',
    suspendedVendorProduct: 'prd_suspended_vendor_001',
  },
};

function money(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

async function clearDatabase() {
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany({ where: { parentId: { not: null } } });
  await prisma.category.deleteMany({ where: { parentId: null } });
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers(passwordHash: string) {
  await prisma.user.createMany({
    data: [
      {
        id: ids.users.admin,
        email: 'admin@localmarket.test',
        passwordHash,
        fullName: 'Admin User',
        phone: '+21620111111',
        role: Role.ADMIN,
      },
      {
        id: ids.users.buyerOne,
        email: 'buyer.one@localmarket.test',
        passwordHash,
        fullName: 'Ahmed Buyer',
        phone: '+21620222222',
        role: Role.BUYER,
      },
      {
        id: ids.users.buyerTwo,
        email: 'buyer.two@localmarket.test',
        passwordHash,
        fullName: 'Fatma Buyer',
        phone: '+21620333333',
        role: Role.BUYER,
      },
      {
        id: ids.users.vendorOneOwner,
        email: 'seller.one@localmarket.test',
        passwordHash,
        fullName: 'Youssef Seller',
        phone: '+21620444444',
        role: Role.VENDOR,
      },
      {
        id: ids.users.vendorTwoOwner,
        email: 'seller.two@localmarket.test',
        passwordHash,
        fullName: 'Mariem Seller',
        phone: '+21620555555',
        role: Role.VENDOR,
      },
      {
        id: ids.users.pendingVendorOwner,
        email: 'seller.pending@localmarket.test',
        passwordHash,
        fullName: 'Pending Seller',
        phone: '+21620666666',
        role: Role.BUYER,
      },
      {
        id: ids.users.rejectedVendorOwner,
        email: 'seller.rejected@localmarket.test',
        passwordHash,
        fullName: 'Rejected Seller',
        phone: '+21620777777',
        role: Role.BUYER,
      },
      {
        id: ids.users.suspendedVendorOwner,
        email: 'seller.suspended@localmarket.test',
        passwordHash,
        fullName: 'Suspended Seller',
        phone: '+21620888888',
        role: Role.VENDOR,
      },
    ],
  });
}

async function seedVendors() {
  await prisma.vendor.createMany({
    data: [
      {
        id: ids.vendors.approvedOne,
        userId: ids.users.vendorOneOwner,
        storeName: 'Tunis Tech Hub',
        slug: 'tunis-tech-hub',
        description: 'Electronics and mobile accessories.',
        status: VendorStatus.APPROVED,
        isActive: true,
        commissionRate: money(8),
      },
      {
        id: ids.vendors.approvedTwo,
        userId: ids.users.vendorTwoOwner,
        storeName: 'Casa Daily',
        slug: 'casa-daily',
        description: 'Home and lifestyle products for everyday use.',
        status: VendorStatus.APPROVED,
        isActive: true,
        commissionRate: money(7.5),
      },
      {
        id: ids.vendors.pending,
        userId: ids.users.pendingVendorOwner,
        storeName: 'Nabeul Finds',
        slug: 'nabeul-finds',
        description: 'Curated products from Nabeul local makers.',
        status: VendorStatus.PENDING,
        isActive: false,
      },
      {
        id: ids.vendors.rejected,
        userId: ids.users.rejectedVendorOwner,
        storeName: 'Retro Corner TN',
        slug: 'retro-corner-tn',
        description: 'Vintage and second-hand finds.',
        status: VendorStatus.REJECTED,
        isActive: false,
        adminNote: 'Please provide clearer product sourcing details.',
      },
      {
        id: ids.vendors.suspended,
        userId: ids.users.suspendedVendorOwner,
        storeName: 'Suspended Outlet',
        slug: 'suspended-outlet',
        description: 'Temporarily suspended vendor profile.',
        status: VendorStatus.SUSPENDED,
        isActive: false,
        adminNote: 'Profile suspended for compliance review.',
      },
    ],
  });
}

async function seedCategories() {
  await prisma.category.createMany({
    data: [
      {
        id: ids.categories.electronics,
        name: 'Electronics & Accessories',
        slug: 'electronics-accessories',
        description: 'Phones, gadgets, and daily tech gear.',
      },
      {
        id: ids.categories.homeKitchen,
        name: 'Home & Kitchen',
        slug: 'home-kitchen',
        description: 'Appliances and kitchen essentials.',
      },
      {
        id: ids.categories.fashion,
        name: 'Fashion',
        slug: 'fashion',
        description: 'Clothing and style essentials.',
      },
      {
        id: ids.categories.inactive,
        name: 'Inactive Category',
        slug: 'inactive-category',
        description: 'Used for negative test scenarios.',
        isActive: false,
      },
    ],
  });

  await prisma.category.createMany({
    data: [
      {
        id: ids.categories.phones,
        name: 'Phones',
        slug: 'phones',
        parentId: ids.categories.electronics,
      },
      {
        id: ids.categories.audio,
        name: 'Audio',
        slug: 'audio',
        parentId: ids.categories.electronics,
      },
      {
        id: ids.categories.kitchenTools,
        name: 'Kitchen Tools',
        slug: 'kitchen-tools',
        parentId: ids.categories.homeKitchen,
      },
      {
        id: ids.categories.menFashion,
        name: 'Men Fashion',
        slug: 'men-fashion',
        parentId: ids.categories.fashion,
      },
    ],
  });
}

async function seedProducts() {
  await prisma.product.createMany({
    data: [
      {
        id: ids.products.earbuds,
        vendorId: ids.vendors.approvedOne,
        categoryId: ids.categories.audio,
        name: 'Noise Cancel Earbuds Pro',
        slug: 'noise-cancel-earbuds-pro',
        description: 'Wireless earbuds with strong bass and active noise canceling.',
        price: money(249),
        offerPrice: money(199),
        stockQuantity: 30,
        status: ProductStatus.PUBLISHED,
        isActive: true,
        isFeatured: true,
        isOnOffer: true,
      },
      {
        id: ids.products.charger,
        vendorId: ids.vendors.approvedOne,
        categoryId: ids.categories.phones,
        name: '65W USB-C Fast Charger',
        slug: '65w-usb-c-fast-charger',
        description: 'Compact USB-C charger for phones, tablets, and laptops.',
        price: money(49),
        stockQuantity: 50,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.watchPending,
        vendorId: ids.vendors.approvedOne,
        categoryId: ids.categories.phones,
        name: 'Fit Smart Watch X',
        slug: 'fit-smart-watch-x',
        description: 'Pending moderation sample for admin product approval testing.',
        price: money(320),
        stockQuantity: 15,
        status: ProductStatus.DRAFT,
        isActive: true,
      },
      {
        id: ids.products.airFryer,
        vendorId: ids.vendors.approvedTwo,
        categoryId: ids.categories.kitchenTools,
        name: '4L Digital Air Fryer',
        slug: '4l-digital-air-fryer',
        description: 'Fast, low-oil cooking with digital controls.',
        price: money(420),
        stockQuantity: 20,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.runningShoes,
        vendorId: ids.vendors.approvedTwo,
        categoryId: ids.categories.menFashion,
        name: 'Lightweight Running Shoes',
        slug: 'lightweight-running-shoes',
        description: 'Breathable mesh shoes designed for daily training.',
        price: money(189),
        stockQuantity: 12,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.blenderArchived,
        vendorId: ids.vendors.approvedTwo,
        categoryId: ids.categories.kitchenTools,
        name: 'Archived Blender Model',
        slug: 'archived-blender-model',
        description: 'Archived product sample for admin and vendor lifecycle tests.',
        price: money(129),
        stockQuantity: 0,
        status: ProductStatus.ARCHIVED,
        isActive: false,
      },
      {
        id: ids.products.pendingVendorProduct,
        vendorId: ids.vendors.pending,
        categoryId: ids.categories.phones,
        name: 'Pending Vendor Phone Case',
        slug: 'pending-vendor-phone-case',
        description: 'Published product under pending vendor for visibility checks.',
        price: money(24),
        stockQuantity: 40,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.suspendedVendorProduct,
        vendorId: ids.vendors.suspended,
        categoryId: ids.categories.audio,
        name: 'Suspended Vendor Portable Speaker',
        slug: 'suspended-vendor-portable-speaker',
        description: 'Published product under suspended vendor for visibility checks.',
        price: money(89),
        stockQuantity: 25,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
    ],
  });

  await prisma.productImage.createMany({
    data: [
      {
        productId: ids.products.earbuds,
        url: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37',
        altText: 'Wireless earbuds product image',
        sortOrder: 1,
      },
      {
        productId: ids.products.charger,
        url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0',
        altText: 'USB-C charger product image',
        sortOrder: 1,
      },
      {
        productId: ids.products.airFryer,
        url: 'https://images.unsplash.com/photo-1615485737651-530e76b2f91c',
        altText: 'Air fryer product image',
        sortOrder: 1,
      },
      {
        productId: ids.products.runningShoes,
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
        altText: 'Running shoes product image',
        sortOrder: 1,
      },
    ],
  });
}

async function seedOrdersAndCart() {
  await prisma.order.create({
    data: {
      buyerId: ids.users.buyerOne,
      vendorId: ids.vendors.approvedOne,
      shippingFullName: 'Ahmed Buyer',
      shippingPhone: '+21620222222',
      shippingAddressLine1: '10 Rue de Marseille',
      shippingAddressLine2: 'Apt 4B',
      shippingCity: 'Tunis',
      shippingGovernorate: 'Tunis',
      shippingPostalCode: '1000',
      subtotal: money(297),
      deliveryFee: money(0),
      total: money(297),
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      notes: 'Please call before delivery.',
      items: {
        create: [
          {
            productId: ids.products.earbuds,
            productName: 'Noise Cancel Earbuds Pro',
            productSlug: 'noise-cancel-earbuds-pro',
            unitPrice: money(199),
            quantity: 1,
            subtotal: money(199),
          },
          {
            productId: ids.products.charger,
            productName: '65W USB-C Fast Charger',
            productSlug: '65w-usb-c-fast-charger',
            unitPrice: money(49),
            quantity: 2,
            subtotal: money(98),
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      buyerId: ids.users.buyerTwo,
      vendorId: ids.vendors.approvedOne,
      shippingFullName: 'Fatma Buyer',
      shippingPhone: '+21620333333',
      shippingAddressLine1: '25 Avenue Habib Bourguiba',
      shippingCity: 'Sfax',
      shippingGovernorate: 'Sfax',
      shippingPostalCode: '3000',
      subtotal: money(49),
      deliveryFee: money(0),
      total: money(49),
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID',
      items: {
        create: [
          {
            productId: ids.products.charger,
            productName: '65W USB-C Fast Charger',
            productSlug: '65w-usb-c-fast-charger',
            unitPrice: money(49),
            quantity: 1,
            subtotal: money(49),
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      buyerId: ids.users.buyerOne,
      vendorId: ids.vendors.approvedTwo,
      shippingFullName: 'Ahmed Buyer',
      shippingPhone: '+21620222222',
      shippingAddressLine1: '10 Rue de Marseille',
      shippingCity: 'Tunis',
      shippingGovernorate: 'Tunis',
      shippingPostalCode: '1000',
      subtotal: money(420),
      deliveryFee: money(0),
      total: money(420),
      status: 'SHIPPED',
      paymentStatus: 'UNPAID',
      items: {
        create: [
          {
            productId: ids.products.airFryer,
            productName: '4L Digital Air Fryer',
            productSlug: '4l-digital-air-fryer',
            unitPrice: money(420),
            quantity: 1,
            subtotal: money(420),
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      buyerId: ids.users.buyerTwo,
      vendorId: ids.vendors.approvedTwo,
      shippingFullName: 'Fatma Buyer',
      shippingPhone: '+21620333333',
      shippingAddressLine1: '25 Avenue Habib Bourguiba',
      shippingCity: 'Sfax',
      shippingGovernorate: 'Sfax',
      shippingPostalCode: '3000',
      subtotal: money(189),
      deliveryFee: money(0),
      total: money(189),
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      items: {
        create: [
          {
            productId: ids.products.runningShoes,
            productName: 'Lightweight Running Shoes',
            productSlug: 'lightweight-running-shoes',
            unitPrice: money(189),
            quantity: 1,
            subtotal: money(189),
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      buyerId: ids.users.buyerOne,
      vendorId: ids.vendors.approvedOne,
      shippingFullName: 'Ahmed Buyer',
      shippingPhone: '+21620222222',
      shippingAddressLine1: '10 Rue de Marseille',
      shippingCity: 'Tunis',
      shippingGovernorate: 'Tunis',
      shippingPostalCode: '1000',
      subtotal: money(49),
      deliveryFee: money(0),
      total: money(49),
      status: 'CANCELLED',
      paymentStatus: 'CANCELLED',
      notes: 'Customer changed mind before shipping.',
      items: {
        create: [
          {
            productId: ids.products.charger,
            productName: '65W USB-C Fast Charger',
            productSlug: '65w-usb-c-fast-charger',
            unitPrice: money(49),
            quantity: 1,
            subtotal: money(49),
          },
        ],
      },
    },
  });

  await prisma.cartItem.createMany({
    data: [
      {
        userId: ids.users.buyerOne,
        productId: ids.products.earbuds,
        quantity: 1,
      },
      {
        userId: ids.users.buyerOne,
        productId: ids.products.charger,
        quantity: 2,
      },
      {
        userId: ids.users.buyerTwo,
        productId: ids.products.airFryer,
        quantity: 1,
      },
    ],
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, PASSWORD_HASH_ROUNDS);

  await clearDatabase();
  await seedUsers(passwordHash);
  await seedVendors();
  await seedCategories();
  await seedProducts();
  await seedOrdersAndCart();

  console.log('Seed completed.');
  console.log(`Shared password: ${PASSWORD}`);
  console.log('Admin: admin@localmarket.test');
  console.log('Buyer: buyer.one@localmarket.test');
  console.log('Vendor: seller.one@localmarket.test');
}

main()
  .catch((error) => {
    console.error('Seed failed.', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
