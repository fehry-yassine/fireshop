"use client";

import type { ReactNode } from "react";
import { BackofficeFrame } from "@/components/dashboard/BackofficeFrame";
import type { PublicUser, Vendor } from "@/types";

type VendorDashboardFrameProps = {
  children: ReactNode;
  user: PublicUser;
  vendor: Vendor;
};

const vendorLinks = [
  { href: "/vendor", label: "Tableau de bord" },
  { href: "/vendor/orders", label: "Commandes" },
  { href: "/vendor/products", label: "Produits" },
  { href: "/vendor/settings", label: "Paramètres boutique", badge: "Bientôt", disabled: true },
];

export function VendorDashboardFrame({ children, user, vendor }: VendorDashboardFrameProps) {
  return (
    <BackofficeFrame
      brand="fireshop"
      links={vendorLinks}
      logoAlt="Espace vendeur FireShop"
      logoSrc="/brand/fireshop-seller-logo.png"
      panelLabel="Espace vendeur"
      panelSubtitle={vendor.slug}
      panelTitle={vendor.storeName}
      supportText="Gérez vos produits, votre stock et vos commandes COD depuis un espace vendeur unique."
      topBadgeLabel="Espace vendeur"
      topTitle="Tableau de bord vendeur"
      user={user}
      workspacePanelTitle="Boutique"
      chrome={{
        showSupportCard: false,
        accountMenuTitle: "Compte vendeur",
        signedInAsLabel: "Connecté en tant que",
        logoutLabel: "Déconnexion",
        loggingOutLabel: "Déconnexion…",
        themeDarkLabel: "Sombre",
        themeLightLabel: "Clair",
        themeAriaDark: "Activer le mode sombre",
        themeAriaLight: "Activer le mode clair",
      }}
    >
      {children}
    </BackofficeFrame>
  );
}
