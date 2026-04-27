import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export default function ProductNotFound() {
  return (
    <main>
      <Container className="flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-slate-950">Product not found</h1>
            <p className="text-sm leading-6 text-slate-500">
              This product is unavailable, unpublished, or no longer active.
            </p>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
              href="/"
            >
              Back to marketplace
            </Link>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
