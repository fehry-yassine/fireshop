import { AdminCategoriesPageClient } from "@/components/admin/AdminCategoriesPageClient";
import { Container } from "@/components/ui/Container";

export default function AdminCategoriesPage() {
  return (
    <main>
      <Container className="py-6 sm:py-10">
        <AdminCategoriesPageClient />
      </Container>
    </main>
  );
}
