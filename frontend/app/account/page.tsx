import { BuyerAccountDashboardClient } from "@/components/account/BuyerAccountDashboardClient";
import { Container } from "@/components/ui/Container";

export default function AccountPage() {
  return (
    <main>
      <Container className="max-w-[1500px] py-6 sm:py-10">
        <BuyerAccountDashboardClient />
      </Container>
    </main>
  );
}
