import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";

const navigation = [
  { label: "Categories", href: "/#categories" },
  { label: "Products", href: "/#products" },
  { label: "Vendors", href: "/vendor" },
  { label: "Orders", href: "/orders" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <Container className="py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center justify-between gap-4">
            <Link className="text-xl font-bold tracking-normal text-slate-950" href="/">
              LocalMarket
            </Link>
            <div className="flex items-center gap-2 lg:hidden">
              <Link className="text-sm font-medium text-slate-700" href="/cart">
                Cart
              </Link>
              <Link className="text-sm font-medium text-slate-700" href="/auth">
                Sign in
              </Link>
            </div>
          </div>

          <form action="/" className="flex min-w-0 flex-1 gap-2" role="search">
            <Input
              aria-label="Search products"
              name="q"
              placeholder="Search products, vendors, or categories"
              type="search"
            />
            <Button className="shrink-0" type="submit">
              Search
            </Button>
          </form>

          <nav className="hidden items-center gap-4 text-sm font-medium text-slate-700 lg:flex">
            {navigation.map((item) => (
              <Link className="transition-colors hover:text-slate-950" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className="transition-colors hover:text-slate-950" href="/cart">
              Cart
            </Link>
            <Link className="rounded-lg bg-slate-950 px-3 py-2 text-white transition-colors hover:bg-slate-800" href="/auth">
              Sign in
            </Link>
          </nav>
        </div>
      </Container>
    </header>
  );
}
