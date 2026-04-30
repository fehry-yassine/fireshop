import Image from "next/image";
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
              className="flex items-center gap-2 rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
              href="/"
            >
              <Image
                alt="FireShop"
                className="h-9 w-auto object-contain"
                height={48}
                src="/branding/fireshop-mark.png"
                width={160}
              />
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

          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-market-300 bg-market-50 px-4 text-sm font-semibold text-market-800 transition hover:border-market-500 hover:bg-market-100"
            href="/search"
          >
            Search
          </Link>

          <AuthNav />
        </div>
      </Container>
    </header>
  );
}
