import { Container } from "@/components/ui/Container";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main>
      <Container className="flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
        <LoginForm />
      </Container>
    </main>
  );
}
