"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type HomeProductImageProps = {
  alt: string;
  className?: string;
  productName: string;
  src?: string | null;
};

export function HomeProductImage({
  alt,
  className,
  productName,
  src,
}: HomeProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const initials = productName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    setHasError(false);

    if (!src) {
      return;
    }

    const probe = new Image();
    probe.onload = () => setHasError(false);
    probe.onerror = () => setHasError(true);
    probe.src = src;
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_25%_18%,rgba(37,99,255,0.30),transparent_34%),linear-gradient(135deg,#020817,#0F172A_55%,#111827)] p-3 text-center",
          className,
        )}
      >
        <span className="absolute inset-x-6 top-4 h-px bg-gradient-to-r from-transparent via-[#2563FF]/70 to-transparent" />
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-xs font-black text-[#030712] shadow-[0_10px_26px_rgba(37,99,255,0.22)] ring-1 ring-[#2563FF]/40">
          {initials || "CM"}
        </span>
        <span className="mt-2 line-clamp-2 max-w-full break-words text-[11px] font-semibold leading-4 text-[#CBD5E1]">
          {productName}
        </span>
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      decoding="async"
      loading="lazy"
      onError={() => setHasError(true)}
      src={src}
    />
  );
}
