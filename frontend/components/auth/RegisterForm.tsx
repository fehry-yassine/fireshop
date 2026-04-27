"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/auth";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "");
    const phone = String(formData.get("phone") ?? "").trim();

    try {
      const response = await api.auth.register({
        email,
        fullName,
        password,
        ...(phone ? { phone } : {}),
      });

      if (response.user.role !== "BUYER") {
        throw new Error("New customer accounts must use the BUYER role.");
      }

      await api.auth.login({ email, password });
      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-950">Create account</h1>
          <p className="text-sm text-slate-500">Start shopping from Tunisian vendors.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="fullName">
              Full name
            </label>
            <Input autoComplete="name" id="fullName" name="fullName" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="email">
              Email
            </label>
            <Input autoComplete="email" id="email" name="email" required type="email" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="phone">
              Phone
            </label>
            <Input autoComplete="tel" id="phone" name="phone" type="tel" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <Input
              autoComplete="new-password"
              id="password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating account" : "Create account"}
          </Button>
        </form>

        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-semibold text-market-700 hover:text-market-600" href="/auth/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
