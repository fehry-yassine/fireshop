import {
  CategoryListingPage,
  type CategoryListingSearchParams,
} from "@/components/category/CategoryListingPage";

type SubcategoryPageProps = {
  params: Promise<{
    categorySlug: string;
    subcategorySlug: string;
  }>;
  searchParams?: Promise<CategoryListingSearchParams>;
};

export const dynamic = "force-dynamic";

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
