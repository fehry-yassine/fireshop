import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="flex flex-col gap-2 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>LocalMarket Tunisia</p>
        <p>Cash on delivery marketplace foundation</p>
      </Container>
    </footer>
  );
}
