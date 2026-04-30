import { VendorProductDetailsPageClient } from "@/components/vendor/VendorProductDetailsPageClient";

type VendorProductDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VendorProductDetailsPage({
  params,
}: VendorProductDetailsPageProps) {
  const { id } = await params;

  return <VendorProductDetailsPageClient productId={id} />;
}
