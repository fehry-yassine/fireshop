import { CartPageClient } from "@/components/cart/CartPageClient";
import { Container } from "@/components/ui/Container";

export default function CartPage() {
  return (
    <main>
      <Container className="py-6 sm:py-10">
        <CartPageClient />
      </Container>
    </main>
  );
}
