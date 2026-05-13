import {
  CategoryListingPage,
  type CategoryListingSearchParams,
} from "@/components/category/CategoryListingPage";

type CategoryPageProps = {
  params: Promise<{
    categorySlug: string;
  }>;
  searchParams?: Promise<CategoryListingSearchParams>;
};

export const dynamic = "force-dynamic";

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
