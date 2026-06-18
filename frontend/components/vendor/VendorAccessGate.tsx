"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { BuyerAccountSidebar } from "@/components/account/BuyerAccountSidebar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PublicUser, Vendor, VendorApplication } from "@/types";

type VendorAccessGateProps = {
  children: (context: { user: PublicUser; vendor: Vendor }) => ReactNode;
};

const MAIN_CATEGORIES = [
  "Maison et décoration",
  "Mode et accessoires",
  "Beauté et bien-être",
  "Électronique",
  "Sport et loisirs",
  "Produits artisanaux",
  "Bébé et enfant",
  "Autre",
];

const TUNISIAN_GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "La Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
];

const DESCRIPTION_DETAILS_TITLE =
  "Informations complémentaires pour l'administration FireShop";

export function VendorAccessGate({ children }: VendorAccessGateProps) {
  const router = useRouter();
  const { isLoading: isUserLoading, refreshUser, setUser, user } = useCurrentUser();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isVendorLoading, setIsVendorLoading] = useState(true);
  const [isApplicationLoading, setIsApplicationLoading] = useState(false);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    const currentUser = user;

    if (!currentUser) {
      router.replace("/auth/login");
      return;
    }

    let isActive = true;

    async function loadVendorArea(currentUser: PublicUser) {
      setVendor(null);
      setApplication(null);
      setMessage(null);

      if (currentUser.role === "BUYER") {
        setIsVendorLoading(false);
        setIsApplicationLoading(true);

        try {
          const response = await api.vendors.myApplication();

          if (isActive) {
            setApplication(response.application);
          }
        } catch {
          if (isActive) {
            setApplication(null);
          }
        } finally {
          if (isActive) {
            setIsApplicationLoading(false);
          }
        }

        return;
      }

      if (currentUser.role === "ADMIN") {
        setIsVendorLoading(false);
        return;
      }

      setIsVendorLoading(true);

      try {
        const response = await api.vendors.me();

        if (isActive) {
          setVendor(response.vendor);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/auth/login");
          return;
        }

        if (isActive) {
          setMessage("Impossible de charger votre profil vendeur pour le moment.");
        }
      } finally {
        if (isActive) {
          setIsVendorLoading(false);
        }
      }
    }

    void loadVendorArea(currentUser);

    return () => {
      isActive = false;
    };
  }, [isUserLoading, router, user]);

  if (isUserLoading || (!user && !isUserLoading)) {
    return <VendorLoadingState label="Vérification de votre session" />;
  }

  if (!user) {
    return <VendorLoadingState label="Vérification de votre session" />;
  }

  if (user.role === "BUYER") {
    return (
      <BuyerVendorGuidance
        application={application}
        isApplicationLoading={isApplicationLoading}
        onApplicationUpdated={setApplication}
        onRefreshUser={refreshUser}
        setUser={setUser}
        user={user}
      />
    );
  }

  if (user.role === "ADMIN") {
    return <AdminVendorGuidance />;
  }

  if (isVendorLoading) {
    return <VendorLoadingState label="Chargement de votre espace vendeur" />;
  }

  if (message || !vendor) {
    return (
      <Card className="vendor-card mx-auto mt-12 max-w-xl">
        <CardContent className="space-y-4 py-10 text-center">
          <h1 className="vendor-title text-2xl font-bold">Profil vendeur indisponible</h1>
          <p className="text-sm text-red-300">
            {message ?? "Votre profil vendeur actif est introuvable."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return children({ user, vendor });
}

function BuyerVendorGuidance({
  application,
  isApplicationLoading,
  onApplicationUpdated,
  onRefreshUser,
  setUser,
  user,
}: {
  application: VendorApplication | null;
  isApplicationLoading: boolean;
  onApplicationUpdated: (application: VendorApplication) => void;
  onRefreshUser: () => Promise<void>;
  setUser: (user: PublicUser | null) => void;
  user: PublicUser;
}) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(application?.storeName ?? "");
  const [mainCategory, setMainCategory] = useState("");
  const [businessPhone, setBusinessPhone] = useState(() =>
    getEditablePhoneValue(user.phone),
  );
  const [governorate, setGovernorate] = useState("");
  const [storeDescription, setStoreDescription] = useState(
    extractEditableDescription(application?.description),
  );
  const [socialLink, setSocialLink] = useState("");
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingAccess, setIsRefreshingAccess] = useState(false);

  useEffect(() => {
    if (!application) {
      return;
    }

    setStoreName(application.storeName);
    setStoreDescription(extractEditableDescription(application.description));
  }, [application]);

  const canSubmit =
    !isSubmitting &&
    !isApplicationLoading &&
    storeName.trim().length >= 3 &&
    mainCategory.length > 0 &&
    businessPhone.trim().length >= 8 &&
    governorate.length > 0 &&
    storeDescription.trim().length >= 12 &&
    hasConfirmed &&
    (application?.status === "REJECTED" || !application);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await api.vendors.apply({
        storeName: storeName.trim(),
        description: buildApplicationDescription({
          businessPhone,
          governorate,
          mainCategory,
          socialLink,
          storeDescription,
        }),
      });

      onApplicationUpdated(response.application);
      setMessage({
        tone: "success",
        text: "Votre demande vendeur a été envoyée. Elle sera vérifiée par l'équipe FireShop.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: getVendorApplicationError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshSellerAccess() {
    setIsRefreshingAccess(true);
    setMessage(null);

    try {
      await onRefreshUser();
      router.refresh();
      setMessage({
        tone: "success",
        text: "Votre espace vendeur est prêt.",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "Impossible d'ouvrir votre espace vendeur pour le moment. Réessayez dans quelques instants.",
      });
    } finally {
      setIsRefreshingAccess(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setIsLoggingOut(false);
      router.push("/");
      router.refresh();
    }
  }

  const showForm = !application || application.status === "REJECTED";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-10 xl:px-8">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <BuyerAccountSidebar
              activeItem="vendor"
              isLoggingOut={isLoggingOut}
              onLogout={handleLogout}
              user={user}
            />

            <div className="min-w-0 space-y-5">
              <VendorApplicationHeader />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card className="overflow-hidden border-slate-200/90 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <CompactBenefitRow />

                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <h2 className="text-lg font-bold text-slate-950">
                            Demande de partenariat vendeur
                          </h2>
                          <p className="text-sm leading-6 text-slate-600">
                            Les informations envoyées sont relues par l'administration
                            FireShop avant l'activation de votre boutique.
                          </p>
                        </div>
                        {!isApplicationLoading && application ? (
                          <VendorApplicationStatusBadge status={application.status} />
                        ) : null}
                      </div>
                    </div>

                    {isApplicationLoading ? (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Vérification de votre demande vendeur.
                      </p>
                    ) : null}

                    {!isApplicationLoading && application ? (
                      <ApplicationStatusPanel
                        application={application}
                        isRefreshingAccess={isRefreshingAccess}
                        onRefreshSellerAccess={refreshSellerAccess}
                      />
                    ) : null}

                    {showForm && !isApplicationLoading ? (
                      <form className="space-y-4" id="application" onSubmit={submitApplication}>
                        <div className="grid gap-3.5 md:grid-cols-2">
                      <Field label="Nom de la boutique" htmlFor="storeName">
                        <Input
                          id="storeName"
                          maxLength={70}
                          onChange={(event) => setStoreName(event.target.value)}
                          placeholder="Exemple : Tunis Home Deals"
                          required
                          value={storeName}
                        />
                      </Field>

                      <Field label="Catégorie principale" htmlFor="mainCategory">
                        <select
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                          id="mainCategory"
                          onChange={(event) => setMainCategory(event.target.value)}
                          required
                          value={mainCategory}
                        >
                          <option value="">Choisir une catégorie</option>
                          {MAIN_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Téléphone professionnel" htmlFor="businessPhone">
                        <Input
                          id="businessPhone"
                          inputMode="tel"
                          maxLength={20}
                          onChange={(event) => setBusinessPhone(event.target.value)}
                          placeholder="Exemple : 98 765 432"
                          required
                          type="tel"
                          value={businessPhone}
                        />
                      </Field>

                      <Field label="Ville / Gouvernorat" htmlFor="governorate">
                        <select
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                          id="governorate"
                          onChange={(event) => setGovernorate(event.target.value)}
                          required
                          value={governorate}
                        >
                          <option value="">Sélectionnez votre ville</option>
                          {TUNISIAN_GOVERNORATES.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Field label="Description de la boutique" htmlFor="storeDescription">
                      <textarea
                        className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                        id="storeDescription"
                        maxLength={600}
                        onChange={(event) => setStoreDescription(event.target.value)}
                        placeholder="Que vendez-vous et à qui s'adressent vos produits ?"
                        required
                        value={storeDescription}
                      />
                    </Field>

                    <Field label="Lien Facebook / Instagram" htmlFor="socialLink" optional>
                      <Input
                        id="socialLink"
                        inputMode="url"
                        maxLength={180}
                        onChange={(event) => setSocialLink(event.target.value)}
                        placeholder="https://facebook.com/votrepage ou https://instagram.com/votreprofil"
                        value={socialLink}
                      />
                    </Field>

                    <DisabledDocumentsPanel />

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <input
                          checked={hasConfirmed}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-market-600 focus:ring-market-600"
                          id="vendorConfirmation"
                          onChange={(event) => setHasConfirmed(event.target.checked)}
                          required
                          type="checkbox"
                        />
                        <label
                          className="text-sm font-medium leading-6 text-slate-700"
                          htmlFor="vendorConfirmation"
                        >
                          Je confirme que les informations fournies sont exactes et
                          j'accepte les conditions vendeur FireShop.
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
                      <p className="flex-1 text-sm leading-6 text-slate-500">
                        Après soumission, votre demande apparaîtra dans l'espace
                        admin pour approbation ou refus.
                      </p>
                      <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:shrink-0">
                        <Link
                          className="inline-flex h-10 w-full min-w-[205px] items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                          href="/account"
                        >
                          Retour au tableau de bord
                        </Link>
                        <Button
                          className="w-full min-w-[170px]"
                          disabled={!canSubmit}
                          type="submit"
                        >
                          {isSubmitting
                            ? "Envoi en cours"
                            : application?.status === "REJECTED"
                              ? "Renvoyer ma demande"
                              : "Envoyer ma demande"}
                        </Button>
                      </div>
                        </div>
                      </form>
                    ) : null}

                    {message ? (
                      <p
                        className={
                          message.tone === "success"
                            ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                            : "rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                        }
                      >
                        {message.text}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                  <ProcessPanel />
                  <KnowBeforePanel />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function VendorApplicationHeader() {
  return (
    <div className="space-y-2">
      <Badge tone="warning">Compte acheteur</Badge>
      <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        Devenir vendeur sur FireShop
      </h1>
      <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
        Postulez pour ouvrir votre boutique et commencez à recevoir des commandes
        COD après validation de votre profil vendeur.
      </p>
    </div>
  );
}

function CompactBenefitRow() {
  return (
    <div className="grid gap-1.5 rounded-lg border border-slate-100 bg-slate-50/70 p-1.5 md:grid-cols-3">
      <CompactBenefitItem
        icon="store"
        text="Gérez vos produits facilement."
        title="Boutique personnalisée"
      />
      <CompactBenefitItem
        icon="box"
        text="Suivez vos commandes vendeur."
        title="Commandes COD"
      />
      <CompactBenefitItem
        icon="shield"
        text="Activation après vérification."
        title="Validation rapide"
      />
    </div>
  );
}

function CompactBenefitItem({
  icon,
  text,
  title,
}: {
  icon: BenefitIconName;
  text: string;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-market-700 ring-1 ring-market-100">
        <BenefitIcon name={icon} />
      </span>
      <div className="min-w-0">
        <h3 className="truncate text-xs font-bold leading-4 text-slate-950">{title}</h3>
        <p className="truncate text-[11px] leading-4 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function Field({
  children,
  htmlFor,
  label,
  optional,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700" htmlFor={htmlFor}>
        {label}
        {optional ? <span className="font-normal text-slate-400"> optionnel</span> : null}
      </label>
      {children}
    </div>
  );
}

type BenefitIconName = "box" | "shield" | "store";

function BenefitIcon({ name }: { name: BenefitIconName }) {
  if (name === "box") {
    return (
      <BaseIcon>
        <path d="m12 4 7 4-7 4-7-4 7-4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M5 8v8l7 4 7-4V8M12 12v8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </BaseIcon>
    );
  }

  if (name === "shield") {
    return (
      <BaseIcon>
        <path d="M12 3.5 18 6v5.2c0 3.7-2.5 6.7-6 8.3-3.5-1.6-6-4.6-6-8.3V6l6-2.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="m9.4 11.8 1.8 1.8 3.6-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </BaseIcon>
    );
  }

  return (
    <BaseIcon>
      <path d="M5 10h14l-1 9H6l-1-9Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M7 10V7l2-2h6l2 2v3M9 14h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function BaseIcon({
  children,
  className = "h-5 w-5",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function ApplicationStatusPanel({
  application,
  isRefreshingAccess,
  onRefreshSellerAccess,
}: {
  application: VendorApplication;
  isRefreshingAccess: boolean;
  onRefreshSellerAccess: () => void;
}) {
  if (application.status === "PENDING") {
    return <PendingApplicationPanel application={application} />;
  }

  if (application.status === "APPROVED") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-black text-emerald-900">Votre boutique est activée.</p>
        <p className="mt-1 text-sm leading-6 text-emerald-800">
          Cliquez ci-dessous pour ouvrir vos outils vendeur et gérer vos commandes
          COD.
        </p>
        <Button
          className="mt-4 w-full sm:w-auto"
          disabled={isRefreshingAccess}
          onClick={onRefreshSellerAccess}
          type="button"
        >
          {isRefreshingAccess ? "Ouverture" : "Accéder à mon espace vendeur"}
        </Button>
      </div>
    );
  }

  if (application.status === "REJECTED") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
        <p className="font-black">Votre demande a été refusée.</p>
        <p className="mt-1">
          Vous pouvez corriger les informations et renvoyer une demande. Elle
          repassera ensuite en vérification auprès de l'équipe FireShop.
        </p>
        {application.adminNote ? (
          <p className="mt-3 rounded-lg bg-white px-3 py-2 text-red-800">
            Note admin : {application.adminNote}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm leading-6 text-slate-700">
      <p className="font-black">Votre accès vendeur est suspendu.</p>
      <p className="mt-1">
        Cette situation doit être traitée par l'administration FireShop. La
        resoumission n'est pas activée pour ce statut.
      </p>
    </div>
  );
}

function PendingApplicationPanel({ application }: { application: VendorApplication }) {
  const submittedAt = formatVendorApplicationDate(application.createdAt);

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm shadow-amber-100/70">
      <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
              <PendingReviewIcon />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                Statut de la candidature
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                Demande en vérification
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Votre boutique est en file de contrôle. L'équipe FireShop vérifie
                les informations envoyées avant d'activer vos outils vendeur.
              </p>
            </div>
          </div>
          <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-800">
            En cours
          </span>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-3">
        <StatusFact label="Boutique" value={application.storeName} />
        <StatusFact label="Date d'envoi" value={submittedAt} />
        <StatusFact label="Délai estimé" value="1 à 3 jours ouvrés" />
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
        <div>
          <h4 className="text-sm font-black text-slate-950">Suivi de votre demande</h4>
          <div className="mt-4 space-y-3">
            <ReviewStep
              done
              text="Votre demande a bien été transmise à l'administration FireShop."
              title="Soumission reçue"
            />
            <ReviewStep
              current
              text="Les informations de la boutique sont contrôlées avant activation."
              title="Vérification FireShop"
            />
            <ReviewStep
              text="Après validation, votre espace vendeur et vos commandes COD seront accessibles."
              title="Activation de la boutique"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-black text-slate-950">Aucune action requise</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Vous pouvez continuer à utiliser votre compte acheteur. Une décision
            apparaîtra ici dès que la vérification sera terminée.
          </p>
          <Link
            className="mt-4 inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            href="/account"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function ReviewStep({
  current,
  done,
  text,
  title,
}: {
  current?: boolean;
  done?: boolean;
  text: string;
  title: string;
}) {
  return (
    <div className="flex gap-3">
      <span
        className={
          done
            ? "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : current
              ? "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              : "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200"
        }
      >
        {done ? <CheckIcon /> : current ? <PendingDotIcon /> : <span className="h-2 w-2 rounded-full bg-current" />}
      </span>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function PendingReviewIcon() {
  return (
    <BaseIcon>
      <path d="M12 6v6l3.2 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M5.6 5.9a9 9 0 1 1-1.9 3.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M3.5 4.5v4h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function CheckIcon() {
  return (
    <BaseIcon className="h-4 w-4">
      <path d="m5 12 4 4 10-10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </BaseIcon>
  );
}

function PendingDotIcon() {
  return (
    <BaseIcon className="h-4 w-4">
      <path d="M12 6v6l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeWidth="2" />
    </BaseIcon>
  );
}

function DisabledDocumentsPanel() {
  return (
    <div
      aria-disabled="true"
      className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800">Documents de vérification</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Bientôt disponible — les documents seront demandés lors d'une validation
            avancée du vendeur.
          </p>
        </div>
        <span className="inline-flex h-8 items-center justify-center rounded-full bg-slate-200 px-3 text-xs font-bold text-slate-600">
          Désactivé
        </span>
      </div>
    </div>
  );
}

function ProcessPanel() {
  const steps = [
    {
      title: "Soumission",
      text: "Remplissez le formulaire et envoyez votre demande de partenariat.",
    },
    {
      title: "Vérification",
      text: "Notre équipe vérifie vos informations avant validation.",
    },
    {
      title: "Activation de la boutique",
      text: "Une fois validé, vous aurez accès à vos outils vendeur et pourrez recevoir des commandes COD.",
    },
  ];

  return (
    <Card className="border-slate-200/90 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Après votre demande</h2>
        </div>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div className="flex gap-3" key={step.title}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-market-50 text-xs font-black text-market-700 ring-1 ring-market-100">
                {index + 1}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KnowBeforePanel() {
  return (
    <Card className="border-market-100 bg-market-50/50 shadow-sm shadow-market-100/50">
      <CardContent className="space-y-2 p-5">
        <h2 className="text-lg font-black text-market-800">Bon à savoir</h2>
        <p className="text-sm leading-6 text-slate-700">
          Les outils vendeur seront disponibles après validation de votre profil.
          Assurez-vous de fournir des informations exactes et complètes pour
          accélérer le processus.
        </p>
      </CardContent>
    </Card>
  );
}

function AdminVendorGuidance() {
  return (
    <section className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="space-y-5 py-10 text-center">
          <Badge tone="neutral">Compte admin</Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">Utilisez le tableau de bord admin</h1>
            <p className="text-sm leading-6 text-slate-500">
              Les outils vendeur sont réservés aux boutiques validées. Les
              candidatures se consultent et se traitent depuis l'espace admin.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            href="/admin"
          >
            Accéder à l'espace admin
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

function VendorLoadingState({ label }: { label: string }) {
  return (
    <Card className="vendor-card mx-auto mt-12 max-w-xl">
      <CardContent className="py-10 text-center">
        <p className="vendor-title text-sm font-semibold">{label}</p>
        <p className="vendor-muted mt-2 text-sm">Veuillez patienter un instant.</p>
      </CardContent>
    </Card>
  );
}

function buildApplicationDescription({
  businessPhone,
  governorate,
  mainCategory,
  socialLink,
  storeDescription,
}: {
  businessPhone: string;
  governorate: string;
  mainCategory: string;
  socialLink: string;
  storeDescription: string;
}) {
  const details = [
    ["Catégorie principale", mainCategory],
    ["Téléphone professionnel", businessPhone],
    ["Ville / Gouvernorat", governorate],
    ["Lien social", socialLink],
  ]
    .filter(([, value]) => value.trim().length > 0)
    .map(([label, value]) => `- ${label} : ${value.trim()}`);

  const sections = [storeDescription.trim()];

  if (details.length > 0) {
    sections.push(`${DESCRIPTION_DETAILS_TITLE}\n${details.join("\n")}`);
  }

  return sections.filter(Boolean).join("\n\n") || undefined;
}

function extractEditableDescription(value?: string | null) {
  if (!value) {
    return "";
  }

  const detailsIndex = value.indexOf(DESCRIPTION_DETAILS_TITLE);

  if (detailsIndex === -1) {
    return value;
  }

  return value.slice(0, detailsIndex).trim();
}

function getEditablePhoneValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length >= 6 && /^0+$/.test(digits)) {
    return "";
  }

  return value;
}

function formatVendorApplicationDate(value?: string | null) {
  if (!value) {
    return "Aujourd'hui";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Aujourd'hui";
  }

  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function VendorApplicationStatusBadge({
  status,
}: {
  status: VendorApplication["status"];
}) {
  if (status === "APPROVED") {
    return <Badge tone="success">Approuvée</Badge>;
  }

  if (status === "PENDING") {
    return <Badge tone="warning">En vérification</Badge>;
  }

  if (status === "REJECTED") {
    return (
      <Badge className="bg-red-50 text-red-700" tone="neutral">
        Refusée
      </Badge>
    );
  }

  return <Badge tone="neutral">Suspendue</Badge>;
}

function getVendorApplicationError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Une demande vendeur existe déjà pour ce compte ou ce nom de boutique est déjà utilisé.";
    }

    if (error.status === 403) {
      return "Seuls les comptes acheteurs peuvent envoyer une demande vendeur.";
    }

    if (error.status === 401) {
      return "Votre session a expiré. Veuillez vous reconnecter avant d'envoyer la demande.";
    }

    if (error.status === 400) {
      return "Vérifiez les champs du formulaire avant d'envoyer la demande.";
    }
  }

  return "Impossible d'envoyer la demande vendeur.";
}

