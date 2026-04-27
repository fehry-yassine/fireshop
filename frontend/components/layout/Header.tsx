import Link from "next/link";
import { AuthNav } from "@/components/auth/AuthNav";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <Container className="py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center justify-between gap-4">
            <Link className="text-xl font-bold tracking-normal text-slate-950" href="/">
              LocalMarket
            </Link>
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

          <AuthNav />
        </div>
      </Container>
    </header>
  );
}
