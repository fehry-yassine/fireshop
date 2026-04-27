import { RegisterForm } from "@/components/auth/RegisterForm";
import { Container } from "@/components/ui/Container";

export default function RegisterPage() {
  return (
    <main>
      <Container className="flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
        <RegisterForm />
      </Container>
    </main>
  );
}
