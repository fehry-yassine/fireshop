import { OrderDetailsPageClient } from "@/components/orders/OrderDetailsPageClient";
import { Container } from "@/components/ui/Container";

type OrderDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { id } = await params;

  return (
    <main>
      <Container className="py-6 sm:py-10">
        <OrderDetailsPageClient orderId={id} />
      </Container>
    </main>
  );
}
