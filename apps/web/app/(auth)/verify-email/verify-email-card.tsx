"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";


export function VerifyEmailCard() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { isPending, isSuccess, isError, error } = useQuery({
    queryKey: ["verify-email", token],
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get("/auth/verify-email", {
        params: {
          token,
        },
      });

      return response.data;
    },
  });

  const message =
    (error as any)?.response?.data?.message ||
    "This verification link is invalid or has expired...";

  return (
    <Card className="w-full max-w-md shadow-lg">
      {isPending && (
        <>
          <CardHeader className="items-center text-center space-y-4">
            <div className="flex w-full justify-center">
                 <Loader2 className="h-14 w-14 animate-spin text-primary" />
            </div>
            <CardTitle>Verifying your email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address.
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center text-sm text-muted-foreground">
            This should only take a few seconds.
          </CardContent>
        </>
      )}

      {isSuccess && (
        <>
          <CardHeader className="items-center text-center space-y-4">
            <div className="flex w-full justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            

            <CardTitle>Email Verified!</CardTitle>

            <CardDescription>
              Your email address has been successfully verified.
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center text-sm text-muted-foreground">
            Your account is now active. You can continue to sign in.
          </CardContent>

          <div className="mx-5">
            <Button asChild className="w-full">
              <Link href="/sign-in">Continue to Sign In</Link>
            </Button>
          </div>
        </>
      )}

      {(isError || !token) && (
        <>
          <CardHeader className="items-center text-center space-y-4">

            <div className="flex w-full justify-center">
                <XCircle className="h-16 w-16 text-destructive" />
            </div>

            <CardTitle>Verification Failed</CardTitle>

            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center text-sm text-muted-foreground">
            You can request a new verification email.
          </CardContent>

          <div className="mx-5">
            <Button asChild className="w-full">
              <Link href="/resend-verification">
                Resend Verification Email
              </Link>
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}