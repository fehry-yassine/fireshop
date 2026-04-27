import { VendorHomePageClient } from "@/components/vendor/VendorHomePageClient";
import { Container } from "@/components/ui/Container";

export default function VendorPage() {
  return (
    <main>
      <Container className="py-6 sm:py-10">
        <VendorHomePageClient />
      </Container>
    </main>
  );
}
