import Link from "next/link";
import { AuthNav } from "@/components/auth/AuthNav";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/60 backdrop-blur">
      <Container className="py-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <div className="flex items-center justify-between gap-4">
            <Link
              className="rounded-md text-xl font-bold tracking-normal text-slate-950 outline-none transition-colors hover:text-market-700 focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
              href="/"
            >
              LocalMarket
            </Link>
          </div>

          <form
            action="/"
            className="flex min-w-0 flex-1 gap-2 rounded-lg bg-slate-100/70 p-1"
            role="search"
          >
            <Input
              aria-label="Search products"
              className="border-transparent bg-white shadow-sm shadow-slate-200/60"
              name="q"
              placeholder="Search products, vendors, or categories"
              type="search"
            />
            <Button className="shrink-0 px-4" type="submit">
              Search
            </Button>
          </form>

          <AuthNav />
        </div>
      </Container>
    </header>
  );
}
