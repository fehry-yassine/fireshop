"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import type { PublicUser } from "@/types";

export function useCurrentUser() {
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadUser() {
      setIsLoading(true);
      const currentUser = await getCurrentUser();

      if (isActive) {
        setUser(currentUser);
        setIsLoading(false);
      }
    }

    void loadUser();

    return () => {
      isActive = false;
    };
  }, [pathname]);

  return {
    isLoading,
    refreshUser,
    setUser,
    user,
  };
}
