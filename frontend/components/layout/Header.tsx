import Image from "next/image";
import Link from "next/link";
import { AuthNav } from "@/components/auth/AuthNav";
import { CategoryMegaMenu } from "@/components/layout/CategoryMegaMenu";
import { Container } from "@/components/ui/Container";

function CarthageWordmark() {
  return (
    <span className="relative block h-14 w-[205px] overflow-hidden rounded-md sm:w-[220px]">
      <Image
        alt="Carthage Market"
        className="object-cover object-left"
        fill
        priority
        sizes="(min-width: 640px) 220px, 205px"
        src="/branding/carthage-market-logo.png"
      />
    </span>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#030712] shadow-[0_10px_44px_rgba(0,0,0,0.34)]">
      <Container className="max-w-[1680px] py-2.5">
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[235px_auto_minmax(340px,1fr)_auto_auto] xl:items-center">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <Link
              className="rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563FF]/60"
              href="/"
            >
              <CarthageWordmark />
            </Link>
          </div>

          <CategoryMegaMenu />

          <form
            action="/"
            className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_44px] gap-2 overflow-hidden rounded-full border border-white/[0.10] bg-[#020817] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_0_32px_rgba(37,99,255,0.11)] focus-within:border-[#2563FF]/70 focus-within:ring-2 focus-within:ring-[#2563FF]/20"
            role="search"
          >
            <input
              aria-label="Rechercher des produits"
              className="h-10 min-w-0 rounded-full border-transparent bg-transparent px-4 text-sm text-white outline-none placeholder:text-[#7C8AA0]"
              name="q"
              placeholder="Rechercher produits, categories, fournisseurs..."
              type="search"
            />
            <button
              aria-label="Rechercher"
              className="grid h-10 w-10 place-items-center rounded-full bg-[#2563FF] text-xs font-black text-white shadow-[0_0_26px_rgba(37,99,255,0.48)] transition hover:bg-[#3B82F6]"
              type="submit"
            >
              Go
            </button>
          </form>

          <nav
            aria-label="Marketplace"
            className="flex min-w-0 max-w-full flex-wrap items-center gap-1 overflow-hidden text-sm font-bold text-[#CBD5E1] xl:justify-center"
          >
            <Link className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white" href="/#produits">
              Produits
            </Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white" href="/#offres">
              Offres
            </Link>
          </nav>

          <AuthNav />
        </div>
      </Container>
    </header>
  );
}
