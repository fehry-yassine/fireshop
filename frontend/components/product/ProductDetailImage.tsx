"use client";

import { useEffect, useMemo, useState } from "react";

type ProductDetailImageProps = {
  alt: string;
  imageUrl?: string | null;
  productName: string;
};

export function ProductDetailImage({
  alt,
  imageUrl,
  productName,
}: ProductDetailImageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const normalizedImageUrl = imageUrl ?? "";
  const showImage = normalizedImageUrl.length > 0 && !imageFailed;
  const initials = useMemo(
    () =>
      productName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(""),
    [productName],
  );

  useEffect(() => {
    setImageFailed(false);
  }, [normalizedImageUrl]);

  return (
    <div className="rounded-lg bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/5 sm:p-4">
      <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-md bg-slate-50 ring-1 ring-slate-900/5 sm:min-h-[360px] lg:min-h-[430px]">
        {showImage ? (
          <img
            alt={alt}
            className="max-h-[300px] w-full object-contain p-3 sm:max-h-[360px] lg:max-h-[430px]"
            onError={() => setImageFailed(true)}
            src={normalizedImageUrl}
          />
        ) : (
          <div className="flex h-full min-h-[300px] w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#fff7ed,#f8fafc)] p-8 text-center sm:min-h-[360px] lg:min-h-[430px]">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white text-2xl font-black text-market-800 shadow-sm ring-1 ring-market-100">
              {initials || "FS"}
            </div>
            <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-slate-600">
              {productName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
