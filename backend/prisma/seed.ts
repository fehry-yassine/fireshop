import {
  HomepagePromoType,
  Prisma,
  PrismaClient,
  ProductStatus,
  Role,
  VendorStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync } from 'fs';
import { join } from 'path';

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
    beautyPersonalCare: 'cat_beauty_personal_care',
    sportsFitness: 'cat_sports_fitness',
    babyToys: 'cat_baby_toys',
    carAccessories: 'cat_car_accessories',
    localHandmade: 'cat_local_handmade',
    phones: 'cat_phones',
    audio: 'cat_audio',
    chargersCables: 'cat_chargers_cables',
    smartWatches: 'cat_smart_watches',
    kitchenTools: 'cat_kitchen_tools',
    cookware: 'cat_cookware',
    homeDecor: 'cat_home_decor',
    storage: 'cat_storage',
    menFashion: 'cat_men_fashion',
    womensFashion: 'cat_womens_fashion',
    bags: 'cat_bags',
    fashionAccessories: 'cat_fashion_accessories',
    skincare: 'cat_skincare',
    hairCare: 'cat_hair_care',
    perfumes: 'cat_perfumes',
    grooming: 'cat_grooming',
    fitnessEquipment: 'cat_fitness_equipment',
    running: 'cat_running',
    sportswear: 'cat_sportswear',
    outdoor: 'cat_outdoor',
    inactive: 'cat_inactive',
  },
  products: {
    earbuds: 'prd_earbuds_001',
    charger: 'prd_charger_001',
    watchPending: 'prd_watch_pending_001',
    airFryer: 'prd_airfryer_001',
    runningShoes: 'prd_running_shoes_001',
    powerBank: 'prd_power_bank_001',
    dinnerSet: 'prd_dinner_set_001',
    skincareBox: 'prd_skincare_box_001',
    yogaMat: 'prd_yoga_mat_001',
    carOrganizer: 'prd_car_organizer_001',
    handmadeBowl: 'prd_handmade_bowl_001',
    cottonBackpack: 'prd_cotton_backpack_001',
    blenderArchived: 'prd_blender_archived_001',
    pendingVendorProduct: 'prd_pending_vendor_001',
    suspendedVendorProduct: 'prd_suspended_vendor_001',
  },
  homepagePromos: {
    deliveryHero: 'hmp_demo_hero_delivery',
    techCard: 'hmp_demo_card_tech',
    deliveryCard: 'hmp_demo_card_delivery',
  },
};

const stableHomepagePromoImageUrls = [
  '/api/uploads/admin-promos/homepage-promo-1778715312939-b5d7fdef-324e-4166-a539-6e01e87c90c1.png',
  '/api/uploads/admin-promos/homepage-promo-1778713402284-d23d0f21-d827-47cf-8cea-ac5e0d3e32d8.png',
  '/api/uploads/admin-promos/homepage-promo-1780784150536-55f60b4b-2538-4934-8862-eb66ccdd9193.png',
] as const;

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
        id: ids.categories.beautyPersonalCare,
        name: 'Beauty & Personal Care',
        slug: 'beauty-personal-care',
        description: 'Skincare, grooming, and everyday beauty products.',
      },
      {
        id: ids.categories.sportsFitness,
        name: 'Sports & Fitness',
        slug: 'sports-fitness',
        description: 'Fitness gear and active lifestyle essentials.',
      },
      {
        id: ids.categories.babyToys,
        name: 'Baby & Toys',
        slug: 'baby-toys',
        description: 'Baby essentials and toys for family shopping.',
      },
      {
        id: ids.categories.carAccessories,
        name: 'Car Accessories',
        slug: 'car-accessories',
        description: 'Useful accessories for daily car owners.',
      },
      {
        id: ids.categories.localHandmade,
        name: 'Local Handmade',
        slug: 'local-handmade',
        description: 'Selected handmade products from local sellers.',
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
        isActive: true,
      },
      {
        id: ids.categories.audio,
        name: 'Audio',
        slug: 'audio',
        parentId: ids.categories.electronics,
        isActive: true,
      },
      {
        id: ids.categories.chargersCables,
        name: 'Chargers & Cables',
        slug: 'chargers-cables',
        parentId: ids.categories.electronics,
        isActive: true,
      },
      {
        id: ids.categories.smartWatches,
        name: 'Smart Watches',
        slug: 'smart-watches',
        parentId: ids.categories.electronics,
        isActive: true,
      },
      {
        id: ids.categories.kitchenTools,
        name: 'Kitchen Appliances',
        slug: 'kitchen-appliances',
        parentId: ids.categories.homeKitchen,
        isActive: true,
      },
      {
        id: ids.categories.cookware,
        name: 'Cookware',
        slug: 'cookware',
        parentId: ids.categories.homeKitchen,
        isActive: true,
      },
      {
        id: ids.categories.homeDecor,
        name: 'Home Decor',
        slug: 'home-decor',
        parentId: ids.categories.homeKitchen,
        isActive: true,
      },
      {
        id: ids.categories.storage,
        name: 'Storage',
        slug: 'storage',
        parentId: ids.categories.homeKitchen,
        isActive: true,
      },
      {
        id: ids.categories.menFashion,
        name: "Men's Shoes",
        slug: 'mens-shoes',
        parentId: ids.categories.fashion,
        isActive: true,
      },
      {
        id: ids.categories.womensFashion,
        name: "Women's Fashion",
        slug: 'womens-fashion',
        parentId: ids.categories.fashion,
        isActive: true,
      },
      {
        id: ids.categories.bags,
        name: 'Bags',
        slug: 'bags',
        parentId: ids.categories.fashion,
        isActive: true,
      },
      {
        id: ids.categories.fashionAccessories,
        name: 'Accessories',
        slug: 'fashion-accessories',
        parentId: ids.categories.fashion,
        isActive: true,
      },
      {
        id: ids.categories.skincare,
        name: 'Skincare',
        slug: 'skincare',
        parentId: ids.categories.beautyPersonalCare,
        isActive: true,
      },
      {
        id: ids.categories.hairCare,
        name: 'Hair Care',
        slug: 'hair-care',
        parentId: ids.categories.beautyPersonalCare,
        isActive: true,
      },
      {
        id: ids.categories.perfumes,
        name: 'Perfumes',
        slug: 'perfumes',
        parentId: ids.categories.beautyPersonalCare,
        isActive: true,
      },
      {
        id: ids.categories.grooming,
        name: 'Grooming',
        slug: 'grooming',
        parentId: ids.categories.beautyPersonalCare,
        isActive: true,
      },
      {
        id: ids.categories.fitnessEquipment,
        name: 'Fitness Equipment',
        slug: 'fitness-equipment',
        parentId: ids.categories.sportsFitness,
        isActive: true,
      },
      {
        id: ids.categories.running,
        name: 'Running',
        slug: 'running',
        parentId: ids.categories.sportsFitness,
        isActive: true,
      },
      {
        id: ids.categories.sportswear,
        name: 'Sportswear',
        slug: 'sportswear',
        parentId: ids.categories.sportsFitness,
        isActive: true,
      },
      {
        id: ids.categories.outdoor,
        name: 'Outdoor',
        slug: 'outdoor',
        parentId: ids.categories.sportsFitness,
        isActive: true,
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
        name: 'Ecouteurs Bluetooth Pro',
        slug: 'ecouteurs-bluetooth-pro',
        description: 'Ecouteurs sans fil avec basses puissantes et autonomie adaptee au quotidien.',
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
        categoryId: ids.categories.chargersCables,
        name: 'Chargeur USB-C 65W',
        slug: 'chargeur-usb-c-65w',
        description: 'Chargeur rapide compact pour telephones, tablettes et ordinateurs portables.',
        price: money(49),
        stockQuantity: 50,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.watchPending,
        vendorId: ids.vendors.approvedOne,
        categoryId: ids.categories.smartWatches,
        name: 'Montre connectee Fit X',
        slug: 'montre-connectee-fit-x',
        description: 'Produit en attente de validation admin pour la capture du flux de moderation.',
        price: money(320),
        stockQuantity: 15,
        status: ProductStatus.PENDING_REVIEW,
        isActive: true,
      },
      {
        id: ids.products.airFryer,
        vendorId: ids.vendors.approvedTwo,
        categoryId: ids.categories.kitchenTools,
        name: 'Friteuse sans huile 4L',
        slug: 'friteuse-sans-huile-4l',
        description: 'Friteuse digitale pour une cuisson rapide avec moins d huile.',
        price: money(420),
        stockQuantity: 20,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.runningShoes,
        vendorId: ids.vendors.approvedTwo,
        categoryId: ids.categories.menFashion,
        name: 'Baskets legeres homme',
        slug: 'baskets-legeres-homme',
        description: 'Baskets respirantes pour marche, sport leger et usage quotidien.',
        price: money(189),
        stockQuantity: 12,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.powerBank,
        vendorId: ids.vendors.approvedOne,
        categoryId: ids.categories.chargersCables,
        name: 'Power bank 20000 mAh',
        slug: 'power-bank-20000-mah',
        description: 'Batterie externe compacte pour garder son telephone charge pendant la journee.',
        price: money(95),
        offerPrice: money(79),
        stockQuantity: 35,
        status: ProductStatus.PUBLISHED,
        isActive: true,
        isFeatured: true,
        isOnOffer: true,
      },
      {
        id: ids.products.dinnerSet,
        vendorId: ids.vendors.approvedTwo,
        categoryId: ids.categories.cookware,
        name: 'Service de table 18 pieces',
        slug: 'service-de-table-18-pieces',
        description: 'Service de table simple et moderne pour repas familiaux.',
        price: money(145),
        stockQuantity: 18,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.skincareBox,
        vendorId: ids.vendors.approvedTwo,
        categoryId: ids.categories.skincare,
        name: 'Coffret soin visage',
        slug: 'coffret-soin-visage',
        description: 'Coffret soin visage pour routine quotidienne et cadeau pratique.',
        price: money(68),
        offerPrice: money(59),
        stockQuantity: 22,
        status: ProductStatus.PUBLISHED,
        isActive: true,
        isOnOffer: true,
      },
      {
        id: ids.products.yogaMat,
        vendorId: ids.vendors.approvedTwo,
        categoryId: ids.categories.fitnessEquipment,
        name: 'Tapis fitness antiderapant',
        slug: 'tapis-fitness-antiderapant',
        description: 'Tapis confortable pour fitness, stretching et entrainement a domicile.',
        price: money(42),
        stockQuantity: 28,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.carOrganizer,
        vendorId: ids.vendors.approvedOne,
        categoryId: ids.categories.carAccessories,
        name: 'Organiseur siege voiture',
        slug: 'organiseur-siege-voiture',
        description: 'Rangement pratique pour garder les accessoires de voiture bien organises.',
        price: money(36),
        stockQuantity: 26,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.handmadeBowl,
        vendorId: ids.vendors.approvedTwo,
        categoryId: ids.categories.localHandmade,
        name: 'Bol artisanal en ceramique',
        slug: 'bol-artisanal-en-ceramique',
        description: 'Piece artisanale inspiree des produits locaux pour maison et decoration.',
        price: money(54),
        stockQuantity: 14,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      {
        id: ids.products.cottonBackpack,
        vendorId: ids.vendors.approvedOne,
        categoryId: ids.categories.bags,
        name: 'Sac a dos urbain',
        slug: 'sac-a-dos-urbain',
        description: 'Sac pratique pour etudes, travail et deplacements quotidiens.',
        price: money(82),
        stockQuantity: 20,
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
        url: '/api/uploads/product-images/vnd_approved_001-1778018558624-8b1103b6-35a6-4141-911a-aa14732c47dd.jpg',
        altText: 'Ecouteurs Bluetooth Pro',
        sortOrder: 1,
      },
      {
        productId: ids.products.charger,
        url: '/api/uploads/product-images/vnd_approved_001-1778018670751-ff179500-8bbd-44f2-8aaf-c5f672f5d171.png',
        altText: 'Chargeur USB-C 65W',
        sortOrder: 1,
      },
      {
        productId: ids.products.watchPending,
        url: '/api/uploads/product-images/vnd_approved_001-1778018670825-7ba7bda4-c958-435b-8cc6-9900c0bc866e.png',
        altText: 'Montre connectee en attente de validation',
        sortOrder: 1,
      },
      {
        productId: ids.products.airFryer,
        url: '/api/uploads/product-images/vnd_approved_001-1778018723973-e7308b7f-115a-4e1e-9822-4b917c6e2db8.png',
        altText: 'Friteuse sans huile 4L',
        sortOrder: 1,
      },
      {
        productId: ids.products.runningShoes,
        url: '/api/uploads/product-images/vnd_approved_001-1778018724054-df10e7e0-6cea-4d0b-b9d8-06b94e9b7f21.png',
        altText: 'Baskets legeres homme',
        sortOrder: 1,
      },
      {
        productId: ids.products.powerBank,
        url: '/api/uploads/product-images/vnd_approved_001-1778018724123-92e03b3d-d368-4d31-90a3-eca8c792e759.png',
        altText: 'Power bank 20000 mAh',
        sortOrder: 1,
      },
      {
        productId: ids.products.dinnerSet,
        url: '/api/uploads/product-images/vnd_approved_001-1778018724190-fe4fd3fe-b82a-460c-a772-aa2f3d8d423d.png',
        altText: 'Service de table 18 pieces',
        sortOrder: 1,
      },
      {
        productId: ids.products.skincareBox,
        url: '/api/uploads/product-images/vnd_approved_001-1778018766438-9ba3eda5-e119-4fa0-bd79-1647bd583918.jpg',
        altText: 'Coffret soin visage',
        sortOrder: 1,
      },
      {
        productId: ids.products.yogaMat,
        url: '/api/uploads/product-images/vnd_approved_001-1778018766517-d5607054-9ffe-4fa2-aec7-996caae3a562.jpg',
        altText: 'Tapis fitness antiderapant',
        sortOrder: 1,
      },
      {
        productId: ids.products.carOrganizer,
        url: '/api/uploads/product-images/vnd_approved_001-1778018766606-73f297a2-4dd8-47c9-a21c-6363089676e8.png',
        altText: 'Organiseur siege voiture',
        sortOrder: 1,
      },
      {
        productId: ids.products.handmadeBowl,
        url: '/api/uploads/product-images/vnd_approved_001-1778018766694-3a214c5d-6486-4312-885e-c722a28396f8.png',
        altText: 'Bol artisanal en ceramique',
        sortOrder: 1,
      },
      {
        productId: ids.products.cottonBackpack,
        url: '/api/uploads/product-images/vnd_approved_001-1778175917334-4022d2d0-ad7f-4c93-9552-ab089d914337.png',
        altText: 'Sac a dos urbain',
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
            productName: 'Ecouteurs Bluetooth Pro',
            productSlug: 'ecouteurs-bluetooth-pro',
            unitPrice: money(199),
            quantity: 1,
            subtotal: money(199),
          },
          {
            productId: ids.products.charger,
            productName: 'Chargeur USB-C 65W',
            productSlug: 'chargeur-usb-c-65w',
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
            productName: 'Chargeur USB-C 65W',
            productSlug: 'chargeur-usb-c-65w',
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
            productName: 'Friteuse sans huile 4L',
            productSlug: 'friteuse-sans-huile-4l',
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
            productName: 'Baskets legeres homme',
            productSlug: 'baskets-legeres-homme',
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
            productName: 'Chargeur USB-C 65W',
            productSlug: 'chargeur-usb-c-65w',
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

function uploadedFileExists(imageUrl: string | null) {
  if (!imageUrl?.startsWith('/api/uploads/')) {
    return true;
  }

  const relativePath = imageUrl.replace('/api/uploads/', '');
  return existsSync(join(process.cwd(), 'uploads', relativePath));
}

async function deactivateMissingLocalHomepagePromoImages() {
  const activePromos = await prisma.homepagePromo.findMany({
    where: { isActive: true },
    select: { id: true, imageUrl: true },
  });

  const missingPromoIds = activePromos
    .filter((promo) => !uploadedFileExists(promo.imageUrl))
    .map((promo) => promo.id);

  if (missingPromoIds.length === 0) {
    return;
  }

  await prisma.homepagePromo.updateMany({
    where: { id: { in: missingPromoIds } },
    data: { isActive: false },
  });
}

async function seedHomepagePromos() {
  await deactivateMissingLocalHomepagePromoImages();

  await prisma.homepagePromo.upsert({
    where: { id: ids.homepagePromos.deliveryHero },
    create: {
      id: ids.homepagePromos.deliveryHero,
      type: HomepagePromoType.HERO_SLIDE,
      title: 'Livraison rapide en Tunisie',
      subtitle: 'Commandes COD avec vendeurs locaux verifies.',
      imageUrl: stableHomepagePromoImageUrls[0],
      linkUrl: '/search',
      sortOrder: -30,
      isActive: true,
    },
    update: {
      type: HomepagePromoType.HERO_SLIDE,
      title: 'Livraison rapide en Tunisie',
      subtitle: 'Commandes COD avec vendeurs locaux verifies.',
      imageUrl: stableHomepagePromoImageUrls[0],
      linkUrl: '/search',
      sortOrder: -30,
      isActive: true,
    },
  });

  await prisma.homepagePromo.upsert({
    where: { id: ids.homepagePromos.techCard },
    create: {
      id: ids.homepagePromos.techCard,
      type: HomepagePromoType.PROMO_CARD,
      title: 'Selection high-tech',
      subtitle: 'Telephones, audio et accessoires utiles.',
      imageUrl: stableHomepagePromoImageUrls[1],
      linkUrl: '/categories/electronics-accessories',
      sortOrder: -20,
      isActive: true,
    },
    update: {
      type: HomepagePromoType.PROMO_CARD,
      title: 'Selection high-tech',
      subtitle: 'Telephones, audio et accessoires utiles.',
      imageUrl: stableHomepagePromoImageUrls[1],
      linkUrl: '/categories/electronics-accessories',
      sortOrder: -20,
      isActive: true,
    },
  });

  await prisma.homepagePromo.upsert({
    where: { id: ids.homepagePromos.deliveryCard },
    create: {
      id: ids.homepagePromos.deliveryCard,
      type: HomepagePromoType.PROMO_CARD,
      title: 'Paiement a la livraison',
      subtitle: 'Un parcours adapte au marche tunisien.',
      imageUrl: stableHomepagePromoImageUrls[2],
      linkUrl: '/search',
      sortOrder: -10,
      isActive: true,
    },
    update: {
      type: HomepagePromoType.PROMO_CARD,
      title: 'Paiement a la livraison',
      subtitle: 'Un parcours adapte au marche tunisien.',
      imageUrl: stableHomepagePromoImageUrls[2],
      linkUrl: '/search',
      sortOrder: -10,
      isActive: true,
    },
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
  await seedHomepagePromos();

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
