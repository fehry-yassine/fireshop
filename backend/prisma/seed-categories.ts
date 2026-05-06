import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CategorySeed = {
  description?: string;
  id: string;
  isActive?: boolean;
  name: string;
  parentSlug?: string;
  slug: string;
};

const categories = {
  electronics: 'cat_electronics',
  homeKitchen: 'cat_home_kitchen',
  fashion: 'cat_fashion',
  beauty: 'cat_beauty',
  sportsOutdoor: 'cat_sports_outdoor',
  autoTools: 'cat_auto_tools',
  pets: 'cat_pets',
  healthWellness: 'cat_health_wellness',
  industryBusiness: 'cat_industry_business',
  phones: 'cat_phones',
  audio: 'cat_audio',
  laptops: 'cat_laptops',
  smartHome: 'cat_smart_home',
  gaming: 'cat_gaming',
  techAccessories: 'cat_tech_accessories',
  cameras: 'cat_cameras',
  officeTech: 'cat_office_tech',
  womenFashion: 'cat_women_fashion',
  shoes: 'cat_shoes',
  bags: 'cat_bags',
  watches: 'cat_watches',
  jewelryEyewear: 'cat_jewelry_eyewear',
  kitchenTools: 'cat_kitchen_tools',
  homeAppliances: 'cat_home_appliances',
  furniture: 'cat_furniture',
  homeDecor: 'cat_home_decor',
  cleaning: 'cat_cleaning',
  garden: 'cat_garden',
  menFashion: 'cat_men_fashion',
  skincare: 'cat_skincare',
  hairCare: 'cat_hair_care',
  makeup: 'cat_makeup',
  fragrance: 'cat_fragrance',
  personalCare: 'cat_personal_care',
  fitness: 'cat_fitness',
  outdoorGear: 'cat_outdoor_gear',
  teamSports: 'cat_team_sports',
  camping: 'cat_camping',
  bicycles: 'cat_bicycles',
  carAccessories: 'cat_car_accessories',
  autoParts: 'cat_auto_parts',
  motorcycle: 'cat_motorcycle',
  tools: 'cat_tools',
  maintenance: 'cat_maintenance',
  dogSupplies: 'cat_dog_supplies',
  catSupplies: 'cat_cat_supplies',
  petGrooming: 'cat_pet_grooming',
  petToys: 'cat_pet_toys',
  petBeds: 'cat_pet_beds',
  wellness: 'cat_wellness',
  medicalSupplies: 'cat_medical_supplies',
  vitamins: 'cat_vitamins',
  fitnessRecovery: 'cat_fitness_recovery',
  machines: 'cat_machines',
  packaging: 'cat_packaging',
  officeSupplies: 'cat_office_supplies',
  safetyEquipment: 'cat_safety_equipment',
} as const;

const mainCategories: CategorySeed[] = [
  {
    id: categories.electronics,
    name: 'Electronics & Accessories',
    slug: 'electronics-accessories',
    description: 'Phones, gadgets, and daily tech gear.',
  },
  {
    id: categories.homeKitchen,
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Appliances and kitchen essentials.',
  },
  {
    id: categories.fashion,
    name: 'Fashion',
    slug: 'fashion',
    description: 'Clothing and style essentials.',
  },
  {
    id: categories.beauty,
    name: 'Beauty',
    slug: 'beauty',
    description: 'Skincare, fragrance, and personal care essentials.',
  },
  {
    id: categories.sportsOutdoor,
    name: 'Sports & Outdoor',
    slug: 'sports-outdoor',
    description: 'Fitness, outdoor gear, and team sports equipment.',
  },
  {
    id: categories.autoTools,
    name: 'Auto & Tools',
    slug: 'auto-tools',
    description: 'Vehicle accessories, parts, tools, and maintenance gear.',
  },
  {
    id: categories.pets,
    name: 'Pets',
    slug: 'pets',
    description: 'Supplies, toys, grooming, and comfort products for pets.',
  },
  {
    id: categories.healthWellness,
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Wellness products, medical supplies, vitamins, and recovery gear.',
  },
  {
    id: categories.industryBusiness,
    name: 'Industry & Business',
    slug: 'industry-business',
    description: 'Machines, packaging, office supplies, and safety equipment.',
  },
];

const subcategories: CategorySeed[] = [
  { id: categories.phones, name: 'Phones', slug: 'phones', parentSlug: 'electronics-accessories' },
  { id: categories.audio, name: 'Audio', slug: 'audio', parentSlug: 'electronics-accessories' },
  { id: categories.laptops, name: 'Laptops', slug: 'laptops', parentSlug: 'electronics-accessories' },
  { id: categories.smartHome, name: 'Smart Home', slug: 'smart-home', parentSlug: 'electronics-accessories' },
  { id: categories.gaming, name: 'Gaming', slug: 'gaming', parentSlug: 'electronics-accessories' },
  { id: categories.techAccessories, name: 'Accessories', slug: 'tech-accessories', parentSlug: 'electronics-accessories' },
  { id: categories.cameras, name: 'Cameras', slug: 'cameras', parentSlug: 'electronics-accessories' },
  { id: categories.officeTech, name: 'Office Tech', slug: 'office-tech', parentSlug: 'electronics-accessories' },
  { id: categories.menFashion, name: 'Men Fashion', slug: 'men-fashion', parentSlug: 'fashion' },
  { id: categories.womenFashion, name: 'Women Fashion', slug: 'women-fashion', parentSlug: 'fashion' },
  { id: categories.shoes, name: 'Shoes', slug: 'shoes', parentSlug: 'fashion' },
  { id: categories.bags, name: 'Bags', slug: 'bags', parentSlug: 'fashion' },
  { id: categories.watches, name: 'Watches', slug: 'watches', parentSlug: 'fashion' },
  { id: categories.jewelryEyewear, name: 'Jewelry & Eyewear', slug: 'jewelry-eyewear', parentSlug: 'fashion' },
  { id: categories.kitchenTools, name: 'Kitchen Tools', slug: 'kitchen-tools', parentSlug: 'home-kitchen' },
  { id: categories.homeAppliances, name: 'Home Appliances', slug: 'home-appliances', parentSlug: 'home-kitchen' },
  { id: categories.furniture, name: 'Furniture', slug: 'furniture', parentSlug: 'home-kitchen' },
  { id: categories.homeDecor, name: 'Home Decor', slug: 'home-decor', parentSlug: 'home-kitchen' },
  { id: categories.cleaning, name: 'Cleaning', slug: 'cleaning', parentSlug: 'home-kitchen' },
  { id: categories.garden, name: 'Garden', slug: 'garden', parentSlug: 'home-kitchen' },
  { id: categories.skincare, name: 'Skincare', slug: 'skincare', parentSlug: 'beauty' },
  { id: categories.hairCare, name: 'Hair Care', slug: 'hair-care', parentSlug: 'beauty' },
  { id: categories.makeup, name: 'Makeup', slug: 'makeup', parentSlug: 'beauty' },
  { id: categories.fragrance, name: 'Fragrance', slug: 'fragrance', parentSlug: 'beauty' },
  { id: categories.personalCare, name: 'Personal Care', slug: 'personal-care', parentSlug: 'beauty' },
  { id: categories.fitness, name: 'Fitness', slug: 'fitness', parentSlug: 'sports-outdoor' },
  { id: categories.outdoorGear, name: 'Outdoor Gear', slug: 'outdoor-gear', parentSlug: 'sports-outdoor' },
  { id: categories.teamSports, name: 'Team Sports', slug: 'team-sports', parentSlug: 'sports-outdoor' },
  { id: categories.camping, name: 'Camping', slug: 'camping', parentSlug: 'sports-outdoor' },
  { id: categories.bicycles, name: 'Bicycles', slug: 'bicycles', parentSlug: 'sports-outdoor' },
  { id: categories.carAccessories, name: 'Car Accessories', slug: 'car-accessories', parentSlug: 'auto-tools' },
  { id: categories.autoParts, name: 'Auto Parts', slug: 'auto-parts', parentSlug: 'auto-tools' },
  { id: categories.motorcycle, name: 'Motorcycle', slug: 'motorcycle', parentSlug: 'auto-tools' },
  { id: categories.tools, name: 'Tools', slug: 'tools', parentSlug: 'auto-tools' },
  { id: categories.maintenance, name: 'Maintenance', slug: 'maintenance', parentSlug: 'auto-tools' },
  { id: categories.dogSupplies, name: 'Dog Supplies', slug: 'dog-supplies', parentSlug: 'pets' },
  { id: categories.catSupplies, name: 'Cat Supplies', slug: 'cat-supplies', parentSlug: 'pets' },
  { id: categories.petGrooming, name: 'Grooming', slug: 'pet-grooming', parentSlug: 'pets' },
  { id: categories.petToys, name: 'Pet Toys', slug: 'pet-toys', parentSlug: 'pets' },
  { id: categories.petBeds, name: 'Pet Beds', slug: 'pet-beds', parentSlug: 'pets' },
  { id: categories.wellness, name: 'Wellness', slug: 'wellness', parentSlug: 'health-wellness' },
  { id: categories.medicalSupplies, name: 'Medical Supplies', slug: 'medical-supplies', parentSlug: 'health-wellness' },
  { id: categories.vitamins, name: 'Vitamins', slug: 'vitamins', parentSlug: 'health-wellness' },
  { id: categories.fitnessRecovery, name: 'Fitness Recovery', slug: 'fitness-recovery', parentSlug: 'health-wellness' },
  { id: categories.machines, name: 'Machines', slug: 'machines', parentSlug: 'industry-business' },
  { id: categories.packaging, name: 'Packaging', slug: 'packaging', parentSlug: 'industry-business' },
  { id: categories.officeSupplies, name: 'Office Supplies', slug: 'office-supplies', parentSlug: 'industry-business' },
  { id: categories.safetyEquipment, name: 'Safety Equipment', slug: 'safety-equipment', parentSlug: 'industry-business' },
];

async function upsertCategory(seed: CategorySeed, parentId: string | null) {
  await prisma.category.upsert({
    where: { slug: seed.slug },
    create: {
      id: seed.id,
      name: seed.name,
      slug: seed.slug,
      description: seed.description ?? null,
      parentId,
      isActive: seed.isActive ?? true,
    },
    update: {
      name: seed.name,
      description: seed.description ?? null,
      parentId,
      isActive: seed.isActive ?? true,
    },
  });
}

async function main() {
  const parentIdsBySlug = new Map<string, string>();

  for (const category of mainCategories) {
    await upsertCategory(category, null);
    const saved = await prisma.category.findUniqueOrThrow({
      where: { slug: category.slug },
      select: { id: true },
    });
    parentIdsBySlug.set(category.slug, saved.id);
  }

  for (const category of subcategories) {
    if (!category.parentSlug) {
      throw new Error(`Missing parent slug for ${category.slug}`);
    }

    const parentId = parentIdsBySlug.get(category.parentSlug);

    if (!parentId) {
      throw new Error(`Parent category not found for ${category.slug}`);
    }

    await upsertCategory(category, parentId);
  }

  console.log(
    `Category seed complete: ${mainCategories.length} main categories and ${subcategories.length} subcategories upserted.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
