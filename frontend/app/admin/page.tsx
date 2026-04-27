import { AdminHomePageClient } from "@/components/admin/AdminHomePageClient";
import { Container } from "@/components/ui/Container";

export default function AdminPage() {
  return (
    <main>
      <Container className="py-6 sm:py-10">
        <AdminHomePageClient />
      </Container>
    </main>
  );
}
