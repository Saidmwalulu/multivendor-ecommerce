"use client";

import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { ResendVerificationSchema } from "@repo/shared";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";

type ResendVerificationValues = z.infer<typeof ResendVerificationSchema>;

export function ResendVerificationForm() {
  const form = useForm<ResendVerificationValues>({
    resolver: zodResolver(ResendVerificationSchema),
    defaultValues: {
      email: "",
    },
  });


  const resendMutation = useMutation({
    mutationFn: async ({ email }: ResendVerificationValues) => {
      const { data } = await api.post("/auth/resend-verification", {
          email,
        }
      );

      if (!data.success) {
        throw new Error(data.message);
      }

      return data;
    },

    onSuccess: (data) => {
      toast.success(data.message);

      form.reset();
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Something went wrong. Please try again."
      );
    },
  });


  function onSubmit(values: ResendVerificationValues) {
    resendMutation.mutate(values);
  }


  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">
          Resend Verification Email
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FieldGroup>

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Email</FieldLabel>

                  <Input
                    type="email"
                    placeholder="your@email.com"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <LoadingButton
              type="submit"
              className="w-full"
              loading={resendMutation.isPending}
            >
              Send Verification Email
            </LoadingButton>

          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}