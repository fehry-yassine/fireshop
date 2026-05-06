import Image from "next/image";
import { Container } from "@/components/ui/Container";

const footerColumns = [
  {
    title: "Explorer",
    links: ["Tous les produits", "Toutes les categories", "Fournisseurs", "Offres speciales"],
  },
  {
    title: "Ressources",
    links: ["Centre d'aide", "Guide d'achat", "Devenir fournisseur", "Carthage Pro"],
  },
  {
    title: "A propos",
    links: ["Qui sommes-nous", "Carrieres", "Presse", "Confidentialite"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#020817] text-[#CBD5E1]">
      <Container className="max-w-[1680px] py-7">
        <div className="grid gap-7 lg:grid-cols-[1.15fr_2fr_1.15fr]">
          <div>
            <div className="relative h-12 w-[180px] overflow-hidden rounded-md">
              <Image
                alt="Carthage Market"
                className="object-cover object-left"
                fill
                sizes="180px"
                src="/branding/carthage-market-logo.png"
              />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#94A3B8]">
              La marketplace B2B & B2C de reference pour sourcer, acheter et
              developper votre business en toute confiance.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-black text-white">{column.title}</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {column.links.map((item) => (
                    <li key={item}>
                      <a className="text-[#94A3B8] transition hover:text-white" href="/search">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-black text-white">Restez informe</h2>
            <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
              Recevez nos meilleures offres et nouveautes.
            </p>
            <form className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_112px]">
              <input
                className="h-11 min-w-0 rounded-lg border border-white/[0.08] bg-[#0F172A] px-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-[#2563FF]"
                placeholder="Votre email"
                type="email"
              />
              <button className="h-11 rounded-lg bg-[#2563FF] px-4 text-sm font-black text-white transition hover:bg-[#3B82F6]">
                S'abonner
              </button>
            </form>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-white/[0.08] pt-5 text-xs text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
          <p>2026 Carthage Market. Tous droits reserves.</p>
          <p>Fabrique en Tunisie</p>
        </div>
      </Container>
    </footer>
  );
}
