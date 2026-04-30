import { redirect } from "next/navigation";

type VendorEditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VendorEditProductPage({
  params,
}: VendorEditProductPageProps) {
  await params;

  redirect("/vendor/products");
}
