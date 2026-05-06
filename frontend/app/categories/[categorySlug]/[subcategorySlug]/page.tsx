import type { Metadata } from "next";
import {
  CategoryListingPage,
  getCategoryListingMetadata,
  type CategoryListingSearchParams,
} from "@/components/category/CategoryListingPage";

type SubcategoryPageProps = {
  params: Promise<{
    categorySlug: string;
    subcategorySlug: string;
  }>;
  searchParams?: Promise<CategoryListingSearchParams>;
};

export async function generateMetadata({
  params,
}: SubcategoryPageProps): Promise<Metadata> {
  const { categorySlug, subcategorySlug } = await params;

  return getCategoryListingMetadata({ categorySlug, subcategorySlug });
}

export default async function SubcategoryPage({
  params,
  searchParams,
}: SubcategoryPageProps) {
  const { categorySlug, subcategorySlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <CategoryListingPage
      categorySlug={categorySlug}
      searchParams={resolvedSearchParams}
      subcategorySlug={subcategorySlug}
    />
  );
}
