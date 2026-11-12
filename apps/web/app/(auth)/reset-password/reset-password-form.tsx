"use client";

import { LoadingButton } from "@/components/loading-button";
import { PasswordInput } from "@/components/password-input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ResetPasswordSchema } from "@repo/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";


type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
}


export function ResetPasswordForm({ token }: ResetPasswordFormProps) {

  const router = useRouter();


  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      token: "",
      newPassword: "",
    },
  });


  const resetPasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: ResetPasswordValues) => {

      const { data } = await api.post("/auth/reset-password",{
          token,
          newPassword,
        }
      );

      if (!data.success) {
        throw new Error(data.message);
      }
      return data;
    },

    onSuccess: (data) => {

      toast.success(
        data.message || "Password reset successfully"
      );

      form.reset();

      setTimeout(() => {
        router.push("/sign-in");
      }, 1500);

    },


    onError: (error: any) => {

      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Failed to reset password"
      );

    },
  });

  function onSubmit(values: ResetPasswordValues) {
    resetPasswordMutation.mutate(values);
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >

          <FieldGroup>

            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>

                  <FieldLabel>
                    New password
                  </FieldLabel>

                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}

                </Field>
              )}
            />


            {/* <Controller
              control={form.control}
              name="onfirmation"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>

                  <FieldLabel>
                    Confirm New Password
                  </FieldLabel>

                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}

                </Field>
              )}
            /> */}


            <LoadingButton
              type="submit"
              className="w-full"
              loading={resetPasswordMutation.isPending}
            >
              Reset password
            </LoadingButton>


          </FieldGroup>

        </form>

      </CardContent>
    </Card>
  );
}