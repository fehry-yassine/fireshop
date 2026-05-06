import type { Metadata } from "next";
import {
  CategoryListingPage,
  getCategoryListingMetadata,
  type CategoryListingSearchParams,
} from "@/components/category/CategoryListingPage";

type CategoryPageProps = {
  params: Promise<{
    categorySlug: string;
  }>;
  searchParams?: Promise<CategoryListingSearchParams>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;

  return getCategoryListingMetadata({ categorySlug });
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { categorySlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <CategoryListingPage
      categorySlug={categorySlug}
      searchParams={resolvedSearchParams}
    />
  );
}
