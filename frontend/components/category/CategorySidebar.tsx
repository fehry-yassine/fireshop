import Link from "next/link";
import type { Category } from "@/types";
import { categoryRoute } from "@/lib/categoryRoutes";
import { cn } from "@/lib/utils";

const fallbackCategories: Array<Pick<Category, "id" | "name" | "slug">> = [
  {
    id: "electronics",
    name: "Electronics & Accessories",
    slug: "electronics-accessories",
  },
  { id: "home", name: "Home & Kitchen", slug: "home-kitchen" },
  { id: "fashion", name: "Fashion", slug: "fashion" },
  {
    id: "beauty",
    name: "Beauty & Personal Care",
    slug: "beauty-personal-care",
  },
  { id: "sports", name: "Sports & Fitness", slug: "sports-fitness" },
  { id: "baby", name: "Baby & Toys", slug: "baby-toys" },
  { id: "car", name: "Car Accessories", slug: "car-accessories" },
  { id: "local", name: "Local Handmade", slug: "local-handmade" },
];

type CategorySidebarProps = {
  categories?: Category[];
  activeSlug?: string;
};

export function CategorySidebar({ categories, activeSlug }: CategorySidebarProps) {
  const topLevelCategories = (categories?.length ? categories : fallbackCategories)
    .filter((category) => !("parentId" in category) || !category.parentId)
    .slice(0, 10);

  return (
    <aside
      className="rounded-lg border border-slate-200/80 bg-white shadow-sm shadow-slate-200/70 lg:sticky lg:top-24 lg:self-start"
      id="categories"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-950">Categories</h2>
      </div>
      <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible">
        {topLevelCategories.map((category) => (
          <Link
            className={cn(
              "block min-w-max rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2 lg:min-w-0",
              activeSlug === category.slug && "bg-market-50 text-market-800",
            )}
            href={categoryRoute(category.slug)}
            key={category.id}
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
