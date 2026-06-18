import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-market-100/80 bg-white">
      <Container className="max-w-[1680px] py-8 text-sm text-slate-600">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="max-w-sm">
            <p className="text-base font-extrabold text-slate-950">
              FireShop Tunisia
            </p>
            <p className="mt-2 leading-6">
              Marketplace tunisien multi-vendeur avec paiement a la livraison.
            </p>
          </div>

          <FooterColumn
            links={[
              { href: "/#categories", label: "Categories" },
              { href: "/#produits", label: "Produits" },
              { href: "/#offres", label: "Offres" },
            ]}
            title="Marketplace"
          />
          <FooterColumn
            links={[
              { href: "/auth/login", label: "Se connecter" },
              { href: "/auth/register", label: "Creer un compte" },
              { href: "/cart", label: "Panier" },
            ]}
            title="Compte"
          />
          <FooterColumn
            links={[
              { href: "/", label: "Support" },
              { href: "/", label: "Conditions" },
              { href: "/", label: "Confidentialite" },
            ]}
            title="Aide"
          />
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 FireShop Tunisia. Projet PFE marketplace COD.</p>
          <p>Interface de demonstration pour le marche tunisien.</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  links,
  title,
}: {
  links: Array<{ href: string; label: string }>;
  title: string;
}) {
  return (
    <div>
      <p className="font-extrabold text-slate-950">{title}</p>
      <nav className="mt-3 grid gap-2">
        {links.map((link) => (
          <Link
            className="w-fit transition hover:text-market-800"
            href={link.href}
            key={`${title}-${link.label}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
