import Link from "next/link";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

const fallbackCategories: Array<Pick<Category, "id" | "name" | "slug">> = [
  { id: "fashion", name: "Mode & Accessoires", slug: "fashion" },
  { id: "electronics", name: "Electronique", slug: "electronics" },
  { id: "home", name: "Maison & Jardin", slug: "home-garden" },
  { id: "sports", name: "Sports & Loisirs", slug: "sports-leisure" },
  { id: "beauty", name: "Beaute & Sante", slug: "beauty-health" },
  { id: "jewelry", name: "Bijoux & Montres", slug: "jewelry-watches" },
  { id: "auto", name: "Auto & Moto", slug: "auto-moto" },
  { id: "kids", name: "Bebe & Jouets", slug: "baby-toys" },
  { id: "office", name: "Bureau", slug: "office" },
  { id: "local", name: "Produits locaux", slug: "local-products" },
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
      className="rounded-lg border border-slate-200 bg-white lg:sticky lg:top-24 lg:self-start"
      id="categories"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">Categories</h2>
      </div>
      <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible">
        {topLevelCategories.map((category) => (
          <Link
            className={cn(
              "block min-w-max rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 lg:min-w-0",
              activeSlug === category.slug && "bg-slate-100 text-slate-950",
            )}
            href={`/?category=${category.slug}`}
            key={category.id}
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
