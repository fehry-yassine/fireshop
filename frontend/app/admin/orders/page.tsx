import { AdminOrdersPageClient } from "@/components/admin/AdminOrdersPageClient";
import { Container } from "@/components/ui/Container";

export default function AdminOrdersPage() {
  return (
    <main>
      <Container className="py-6 sm:py-10">
        <AdminOrdersPageClient />
      </Container>
    </main>
  );
}
