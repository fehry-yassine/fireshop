import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient";
import { Container } from "@/components/ui/Container";

export default function CheckoutPage() {
  return (
    <main>
      <Container className="py-6 sm:py-10">
        <CheckoutPageClient />
      </Container>
    </main>
  );
}
