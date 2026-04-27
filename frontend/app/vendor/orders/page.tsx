import { VendorOrdersPageClient } from "@/components/vendor/VendorOrdersPageClient";
import { Container } from "@/components/ui/Container";

export default function VendorOrdersPage() {
  return (
    <main>
      <Container className="py-6 sm:py-10">
        <VendorOrdersPageClient />
      </Container>
    </main>
  );
}
