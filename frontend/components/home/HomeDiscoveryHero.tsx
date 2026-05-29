"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { categoryRoute } from "@/lib/categoryRoutes";
import { cn } from "@/lib/utils";
import type { Category, HomepagePromo } from "@/types";

type HomeDiscoveryHeroProps = {
  activeCategorySlug?: string;
  categories: Category[];
  heroSlides?: HomepagePromo[];
  promoCards?: HomepagePromo[];
};

type PromoVisualType = "devices" | "delivery" | "beauty" | "market";
type BannerVisualType = "daily" | "shipping" | "new";

type HomePromoCard = {
  alt: string;
  eyebrow: string;
  href: string;
  id: string;
  imageUrl?: string | null;
  title: string;
  visualType: PromoVisualType;
};

type HomeBannerSlide = {
  alt: string;
  ctaLabel: string;
  href: string;
  id: string;
  imageUrl?: string | null;
  subtitle?: string | null;
  title: string;
  visualType: BannerVisualType;
};

const visiblePromoSlots = 3;
const slideIntervalMs = 5500;

const fallbackPromoCards: HomePromoCard[] = [
  {
    alt: "Selection high-tech FireShop",
    eyebrow: "Recherches frequentes",
    href: "/search",
    id: "popular-tech",
    title: "High-tech & accessoires",
    visualType: "devices",
  },
  {
    alt: "Livraison rapide FireShop",
    eyebrow: "Recherches frequentes",
    href: "/search",
    id: "fast-delivery",
    title: "Livraison rapide",
    visualType: "delivery",
  },
  {
    alt: "Nouveautes beaute FireShop",
    eyebrow: "Recherches frequentes",
    href: "/categories/beauty",
    id: "beauty-new",
    title: "Beaute & soins",
    visualType: "beauty",
  },
  {
    alt: "Offres marketplace FireShop",
    eyebrow: "Produits populaires",
    href: "/search",
    id: "marketplace-offers",
    title: "Offres du moment",
    visualType: "market",
  },
];

const fallbackBannerSlides: HomeBannerSlide[] = [
  {
    alt: "Offres du jour FireShop",
    ctaLabel: "Voir plus",
    href: "/search",
    id: "banner-daily",
    title: "Offres du jour",
    visualType: "daily",
  },
  {
    alt: "Livraison rapide FireShop",
    ctaLabel: "Explorer",
    href: "/search",
    id: "banner-shipping",
    title: "Livraison rapide",
    visualType: "shipping",
  },
  {
    alt: "Nouveautes FireShop",
    ctaLabel: "Decouvrir",
    href: "/#produits",
    id: "banner-new",
    title: "Nouveautes FireShop",
    visualType: "new",
  },
];

const promoVisuals: PromoVisualType[] = ["devices", "delivery", "beauty", "market"];
const bannerVisuals: BannerVisualType[] = ["daily", "shipping", "new"];

function buildPromoCards(promos: HomepagePromo[]): HomePromoCard[] {
  const activePromos = promos.filter((promo) => promo.isActive !== false);

  if (activePromos.length === 0) {
    return fallbackPromoCards;
  }

  return activePromos
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((promo, index) => {
      const title = promo.title.trim();
      const subtitle = promo.subtitle?.trim() ?? "";

      return {
        alt: title || subtitle || "Homepage promo",
        eyebrow: subtitle,
        href: promo.linkUrl || "/search",
        id: promo.id,
        imageUrl: promo.imageUrl,
        title,
        visualType: promoVisuals[index % promoVisuals.length],
      };
    });
}

function buildBannerSlides(promos: HomepagePromo[]): HomeBannerSlide[] {
  const activePromos = promos.filter((promo) => promo.isActive !== false);

  if (activePromos.length === 0) {
    return fallbackBannerSlides;
  }

  return activePromos
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((promo, index) => {
      const title = promo.title.trim();
      const subtitle = promo.subtitle?.trim() ?? "";

      return {
        alt: title || subtitle || "Homepage promo",
        ctaLabel: "Voir plus",
        href: promo.linkUrl || "/search",
        id: promo.id,
        imageUrl: promo.imageUrl,
        subtitle,
        title,
        visualType: bannerVisuals[index % bannerVisuals.length],
      };
    });
}

export function HomeDiscoveryHero({
  activeCategorySlug,
  categories,
  heroSlides = [],
  promoCards = [],
}: HomeDiscoveryHeroProps) {
  const [promoOffset, setPromoOffset] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const homePromoCards = useMemo(
    () => buildPromoCards(promoCards),
    [promoCards],
  );
  const homeBannerSlides = useMemo(
    () => buildBannerSlides(heroSlides),
    [heroSlides],
  );
  const visiblePromoCards = homePromoCards.slice(
    promoOffset,
    promoOffset + visiblePromoSlots,
  );
  const canBrowsePromos = homePromoCards.length > visiblePromoSlots;
  const activeSlide = homeBannerSlides[activeSlideIndex] ?? homeBannerSlides[0];

  useEffect(() => {
    if (homeBannerSlides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((current) => (current + 1) % homeBannerSlides.length);
    }, slideIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [homeBannerSlides.length]);

  useEffect(() => {
    setPromoOffset(0);
  }, [homePromoCards.length]);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [homeBannerSlides.length]);

  function browsePromos(direction: "next" | "previous") {
    const maxOffset = Math.max(homePromoCards.length - visiblePromoSlots, 0);

    setPromoOffset((current) => {
      if (direction === "next") {
        return current >= maxOffset ? 0 : current + 1;
      }

      return current <= 0 ? maxOffset : current - 1;
    });
  }

  function browseSlides(direction: "next" | "previous") {
    setActiveSlideIndex((current) => {
      if (direction === "next") {
        return (current + 1) % homeBannerSlides.length;
      }

      return (current - 1 + homeBannerSlides.length) % homeBannerSlides.length;
    });
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-3 lg:min-h-[368px] lg:grid-cols-[292px_minmax(0,1fr)_470px] xl:grid-cols-[304px_minmax(0,1fr)_500px]">
        <aside className="order-2 overflow-hidden rounded-lg bg-[#f7f7f7] lg:order-1 lg:h-[368px]">
          <nav
            aria-label="Categories pour vous"
            className="overflow-x-auto p-2 lg:h-full lg:overflow-y-auto lg:overflow-x-hidden [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/70 [&::-webkit-scrollbar-track]:bg-transparent"
          >
            <ul className="flex gap-2 lg:grid lg:gap-0.5">
              {categories.map((category) => {
                const isActive =
                  category.slug === activeCategorySlug ||
                  Boolean(
                    category.children?.some(
                      (child) => child.slug === activeCategorySlug,
                    ),
                  );

                return (
                  <li className="min-w-[188px] lg:min-w-0" key={category.id}>
                    <Link
                      className={cn(
                        "group grid h-11 grid-cols-[28px_minmax(0,1fr)_16px] items-center gap-2.5 rounded-md px-3 text-sm font-bold text-slate-800 transition hover:bg-white hover:text-market-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25",
                        isActive && "bg-white text-market-900 shadow-sm",
                      )}
                      href={categoryRoute(category.slug)}
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-xs font-black text-market-900 ring-1 ring-slate-200 group-hover:ring-market-200">
                        {categoryInitial(category)}
                      </span>
                      <span className="line-clamp-2 break-words" dir="auto">
                        {category.name}
                      </span>
                      <span className="text-lg font-light text-slate-500 transition group-hover:text-market-700">
                        {">"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <section className="relative order-3 min-w-0 lg:order-2 lg:h-[368px]">
          {canBrowsePromos ? (
            <>
              <button
                aria-label="Promotions precedentes"
                className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-2xl font-light text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.15)] transition hover:bg-white hover:text-market-900"
                onClick={() => browsePromos("previous")}
                type="button"
              >
                {"<"}
              </button>
              <button
                aria-label="Promotions suivantes"
                className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-2xl font-light text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.15)] transition hover:bg-white hover:text-market-900"
                onClick={() => browsePromos("next")}
                type="button"
              >
                {">"}
              </button>
            </>
          ) : null}

          <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:h-full lg:grid-cols-3 lg:overflow-visible lg:pb-0">
            {visiblePromoCards.map((promo) => (
              <PromoSearchCard key={promo.id} promo={promo} />
            ))}
          </div>
        </section>

        <section className="relative order-1 overflow-hidden rounded-lg bg-market-50 lg:order-3 lg:h-[368px]">
          <Link
            aria-label={activeSlide.alt}
            className="group block h-full min-h-[292px] overflow-hidden rounded-lg lg:min-h-0"
            href={activeSlide.href}
          >
            <BannerVisual slide={activeSlide} />
          </Link>

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {homeBannerSlides.map((slide, index) => (
              <button
                aria-label={`Afficher la banniere ${index + 1}`}
                className={cn(
                  "h-2.5 rounded-full transition",
                  index === activeSlideIndex
                    ? "w-7 bg-white"
                    : "w-2.5 bg-slate-700/35 hover:bg-white/75",
                )}
                key={slide.id}
                onClick={() => setActiveSlideIndex(index)}
                type="button"
              />
            ))}
          </div>

          <button
            aria-label="Banniere precedente"
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/82 text-xl font-light text-slate-700 shadow-sm transition hover:bg-white hover:text-market-900"
            onClick={() => browseSlides("previous")}
            type="button"
          >
            {"<"}
          </button>
          <button
            aria-label="Banniere suivante"
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/82 text-xl font-light text-slate-700 shadow-sm transition hover:bg-white hover:text-market-900"
            onClick={() => browseSlides("next")}
            type="button"
          >
            {">"}
          </button>
        </section>
      </div>

    </section>
  );
}

function PromoSearchCard({ promo }: { promo: HomePromoCard }) {
  const hasText = promo.eyebrow.length > 0 || promo.title.length > 0;

  return (
    <Link
      className="group block min-w-[250px] overflow-hidden rounded-lg bg-[#f7f7f7] p-5 outline-none transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)] focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2 lg:min-w-0"
      href={promo.href}
    >
      <article className="flex h-full min-h-[338px] flex-col lg:min-h-0">
        {hasText ? (
          <div>
            {promo.eyebrow ? (
              <p className="text-2xl font-extrabold leading-tight text-slate-950">
                {promo.eyebrow}
              </p>
            ) : null}
            {promo.title ? (
              <p
                className="mt-1 text-lg font-bold leading-tight text-slate-800"
                dir="auto"
              >
                {promo.title}
              </p>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            "flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-white p-4",
            hasText && "mt-5",
          )}
        >
          {promo.imageUrl ? (
            <img
              alt={promo.alt}
              className="h-full max-h-[220px] w-full object-contain transition duration-300 group-hover:scale-[1.03]"
              src={promo.imageUrl}
            />
          ) : (
            <PromoVisual type={promo.visualType} />
          )}
        </div>
      </article>
    </Link>
  );
}

function PromoVisual({ type }: { type: PromoVisualType }) {
  if (type === "delivery") {
    return (
      <div className="relative h-full min-h-[190px] w-full overflow-hidden rounded-md bg-[linear-gradient(135deg,#eef6ff,#fff7ed)]">
        <div className="absolute bottom-10 left-1/2 h-20 w-44 -translate-x-1/2 rounded-xl bg-white shadow-[0_18px_36px_rgba(15,23,42,0.12)] ring-1 ring-market-100" />
        <div className="absolute bottom-[78px] left-[52%] h-12 w-20 rounded-t-xl bg-market-600 shadow-md" />
        <div className="absolute bottom-[54px] left-[24%] h-12 w-24 rounded-lg bg-market-300 shadow-md" />
        <div className="absolute bottom-8 left-[32%] h-8 w-8 rounded-full border-[6px] border-slate-800 bg-white" />
        <div className="absolute bottom-8 right-[24%] h-8 w-8 rounded-full border-[6px] border-slate-800 bg-white" />
        <div className="absolute right-8 top-8 grid h-12 w-12 place-items-center rounded-xl bg-white text-sm font-black text-market-800 shadow-sm">
          COD
        </div>
      </div>
    );
  }

  if (type === "beauty") {
    return (
      <div className="relative h-full min-h-[190px] w-full overflow-hidden rounded-md bg-[radial-gradient(circle_at_70%_20%,rgba(255,184,112,0.38),transparent_28%),linear-gradient(135deg,#fff7f1,#f8fafc)]">
        <div className="absolute bottom-10 left-[22%] h-28 w-12 rounded-full bg-white shadow-[0_18px_34px_rgba(15,23,42,0.12)] ring-1 ring-market-100" />
        <div className="absolute bottom-28 left-[25%] h-8 w-6 rounded-t-md bg-market-500" />
        <div className="absolute bottom-9 left-[46%] h-36 w-14 rounded-2xl bg-market-100 shadow-[0_18px_34px_rgba(15,23,42,0.12)] ring-1 ring-market-200" />
        <div className="absolute bottom-[74px] right-[20%] h-20 w-20 rounded-full bg-white shadow-[0_18px_34px_rgba(15,23,42,0.12)] ring-1 ring-market-100" />
        <div className="absolute bottom-[92px] right-[25%] h-9 w-9 rounded-full bg-market-500/85" />
      </div>
    );
  }

  if (type === "market") {
    return (
      <div className="relative h-full min-h-[190px] w-full overflow-hidden rounded-md bg-[linear-gradient(135deg,#fff7ed,#eef2ff)]">
        <div className="absolute bottom-9 left-[18%] h-24 w-24 rotate-[-8deg] rounded-xl bg-white shadow-[0_18px_34px_rgba(15,23,42,0.12)] ring-1 ring-market-100" />
        <div className="absolute bottom-14 left-[42%] h-28 w-24 rotate-[5deg] rounded-xl bg-market-100 shadow-[0_18px_34px_rgba(15,23,42,0.12)] ring-1 ring-market-200" />
        <div className="absolute bottom-8 right-[16%] h-24 w-24 rotate-[10deg] rounded-xl bg-white shadow-[0_18px_34px_rgba(15,23,42,0.12)] ring-1 ring-market-100" />
        <div className="absolute left-[29%] top-12 h-3 w-28 rounded-full bg-market-500/70" />
        <div className="absolute right-[22%] top-16 h-3 w-20 rounded-full bg-slate-300" />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[190px] w-full overflow-hidden rounded-md bg-[radial-gradient(circle_at_76%_20%,rgba(255,184,112,0.36),transparent_28%),linear-gradient(135deg,#f8fafc,#fff7ed)]">
      <div className="absolute bottom-8 left-[12%] h-24 w-40 rounded-xl bg-slate-900 shadow-[0_18px_34px_rgba(15,23,42,0.16)]" />
      <div className="absolute bottom-12 left-[16%] h-16 w-32 rounded-md bg-[linear-gradient(135deg,#fef3c7,#fb923c)]" />
      <div className="absolute bottom-7 left-[22%] h-2 w-24 rounded-full bg-slate-300" />
      <div className="absolute bottom-9 right-[20%] h-32 w-16 rotate-[-12deg] rounded-2xl bg-white shadow-[0_18px_34px_rgba(15,23,42,0.12)] ring-1 ring-slate-200" />
      <div className="absolute bottom-[66px] right-[24%] h-16 w-8 rounded-md bg-[linear-gradient(135deg,#ffedd5,#fb923c)]" />
    </div>
  );
}

function BannerVisual({ slide }: { slide: HomeBannerSlide }) {
  const hasTitle = slide.title.length > 0;
  const hasSubtitle = Boolean(slide.subtitle?.trim());

  return (
    <div className="relative h-full min-h-[292px] overflow-hidden rounded-lg bg-[linear-gradient(135deg,#ffe3c4,#fff7ed_48%,#fed7aa)] lg:min-h-0">
      {slide.imageUrl ? (
        <img
          alt={slide.alt}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          src={slide.imageUrl}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(255,255,255,0.9),transparent_28%),radial-gradient(circle_at_76%_22%,rgba(255,106,45,0.20),transparent_26%)]" />
          <div className="absolute inset-x-0 bottom-16 top-20">
            <BannerShape type={slide.visualType} />
          </div>
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-white/72 via-white/18 to-market-900/12" />
      <div className="relative z-[1] grid h-full min-h-[292px] grid-rows-[auto_minmax(0,1fr)_auto] p-7 lg:min-h-0">
        <div>
          {hasTitle ? (
            <h2 className="max-w-[280px] text-4xl font-black leading-none tracking-tight text-slate-950">
              {slide.title}
            </h2>
          ) : null}
          {hasSubtitle ? (
            <p
              className={cn(
                "max-w-[260px] text-sm font-semibold leading-5 text-slate-700",
                hasTitle && "mt-3",
              )}
            >
              {slide.subtitle}
            </p>
          ) : null}
        </div>
        <div />
        <span className="mx-auto mb-7 inline-flex h-12 items-center rounded-full bg-slate-950 px-10 text-base font-extrabold text-white shadow-[0_16px_30px_rgba(15,23,42,0.22)] transition group-hover:bg-market-800">
          {slide.ctaLabel}
        </span>
      </div>
    </div>
  );
}

function BannerShape({ type }: { type: BannerVisualType }) {
  if (type === "shipping") {
    return (
      <div className="absolute inset-x-4 bottom-4 top-3">
        <div className="absolute bottom-14 left-[20%] h-24 w-48 rounded-2xl bg-white shadow-[0_22px_44px_rgba(15,23,42,0.14)] ring-1 ring-white" />
        <div className="absolute bottom-[102px] right-[18%] h-16 w-24 rounded-t-2xl bg-market-600 shadow-lg" />
        <div className="absolute bottom-[72px] left-[20%] h-16 w-32 rounded-xl bg-market-200" />
        <div className="absolute bottom-10 left-[31%] h-12 w-12 rounded-full border-[8px] border-slate-900 bg-white" />
        <div className="absolute bottom-10 right-[26%] h-12 w-12 rounded-full border-[8px] border-slate-900 bg-white" />
      </div>
    );
  }

  if (type === "new") {
    return (
      <div className="absolute inset-x-4 bottom-4 top-3">
        <div className="absolute bottom-12 left-[18%] h-36 w-28 rotate-[-8deg] rounded-3xl bg-white shadow-[0_22px_44px_rgba(15,23,42,0.14)] ring-1 ring-market-100" />
        <div className="absolute bottom-20 left-[42%] h-40 w-28 rotate-[7deg] rounded-3xl bg-market-100 shadow-[0_22px_44px_rgba(15,23,42,0.14)] ring-1 ring-market-200" />
        <div className="absolute bottom-10 right-[16%] h-32 w-28 rotate-[12deg] rounded-3xl bg-white shadow-[0_22px_44px_rgba(15,23,42,0.14)] ring-1 ring-market-100" />
      </div>
    );
  }

  return (
    <div className="absolute inset-x-4 bottom-4 top-3">
      <div className="absolute bottom-8 left-[8%] h-28 w-36 rounded-3xl bg-slate-950 shadow-[0_24px_46px_rgba(15,23,42,0.20)]" />
      <div className="absolute bottom-14 left-[15%] h-16 w-24 rounded-xl bg-[linear-gradient(135deg,#fde68a,#fb923c)]" />
      <div className="absolute bottom-12 left-[43%] h-36 w-24 rotate-[-10deg] rounded-[30px] bg-white shadow-[0_24px_46px_rgba(15,23,42,0.16)] ring-1 ring-slate-200" />
      <div className="absolute bottom-16 right-[8%] h-32 w-32 rounded-[30px] bg-market-100 shadow-[0_24px_46px_rgba(15,23,42,0.16)] ring-1 ring-market-200" />
      <div className="absolute bottom-[96px] right-[15%] h-14 w-14 rounded-full bg-market-500/90" />
    </div>
  );
}

function categoryInitial(category: Category) {
  return category.name.trim().slice(0, 1).toUpperCase();
}
