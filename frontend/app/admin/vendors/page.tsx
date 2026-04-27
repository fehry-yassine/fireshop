import { AdminVendorsPageClient } from "@/components/admin/AdminVendorsPageClient";
import { Container } from "@/components/ui/Container";

export default function AdminVendorsPage() {
  return (
    <main>
      <Container className="py-6 sm:py-10">
        <AdminVendorsPageClient />
      </Container>
    </main>
  );
}
