import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <Container className="flex flex-col gap-2 py-7 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-slate-900">FireShop Tunisia</p>
        <p>Cash on delivery marketplace</p>
      </Container>
    </footer>
  );
}
