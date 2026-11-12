import type { Metadata } from "next";
import { ResendVerificationForm } from "./resend-verification-form";

export const metadata: Metadata = {
  title: "Resend verification email",
};

export default function ResendVerificationPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="space-y-6 w-full">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">
            Resend verification email
          </h1>

          <p className="text-muted-foreground">
            Enter your registered email address and we&apos;ll send you a new
            verification link.
          </p>
        </div>

        <ResendVerificationForm />
      </div>
    </main>
  );
}