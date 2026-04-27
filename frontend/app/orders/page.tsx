import { OrdersPageClient } from "@/components/orders/OrdersPageClient";
import { Container } from "@/components/ui/Container";

export default function OrdersPage() {
  return (
    <main>
      <Container className="py-6 sm:py-10">
        <OrdersPageClient />
      </Container>
    </main>
  );
}
