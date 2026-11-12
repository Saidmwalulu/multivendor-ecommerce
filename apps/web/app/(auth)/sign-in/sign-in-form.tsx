"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { PasswordInput } from "@/components/password-input";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/loading-button";
import api from "@/lib/axios";
import { toast } from "sonner";
import { LoginSchema } from "@repo/shared";
import { useMutation } from "@tanstack/react-query";
import { setAccessToken } from "@/lib/token-store";


type LoginValues = z.infer<typeof LoginSchema>;


export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

  const router = useRouter();

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({

    mutationFn: async ({
      email,
      password,
      rememberMe,
    }: LoginValues) => {

      const response = await api.post("/auth/login", {
          email,
          password,
          rememberMe,
        }
      );

      const { success, message } = response.data;

      if (!success) {
        throw new Error(message);
      }
      return response.data;
    },


    onSuccess: (response) => {

      toast.success(response.message || "Login successful--");

      const { user, store } = response.data;

      switch (user.role) {

        case "ADMIN":
          router.push("/dashboard/admin");
          break;


        case "SELLER":
          router.push(store?.url ? `/dashboard/seller/stores/${store.url}` : "/dashboard/seller/stores/new");
          break;


        default:
          router.push("/");
      }

    },


    onError: (error: any) => {

      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Login failed"
      );

    },

  });

  function onSubmit(values: LoginValues) {
    loginMutation.mutate(values);
  }


  async function handleSocialSignIn(
    provider: "google" | "github"
  ) {
    // TODO: Handle social sign in
  }



  return (

    <form
      id="signin-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn(
        "flex flex-col gap-6",
        className
      )}
      {...props}
    >

      <FieldGroup>


        <div className="flex flex-col items-center gap-1 text-center">

          <h1 className="text-2xl font-bold">
            Login to your account
          </h1>


          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>

        </div>



        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (

            <Field data-invalid={fieldState.invalid}>

              <FieldLabel htmlFor="email">
                Email
              </FieldLabel>


              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                aria-invalid={fieldState.invalid}
                {...field}
              />


              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                />
              )}

            </Field>

          )}
        />



        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (

            <Field data-invalid={fieldState.invalid}>


              <div className="flex items-center">

                <FieldLabel htmlFor="password">
                  Password
                </FieldLabel>


                <Link
                  href="/forgot-password"
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>

              </div>



              <PasswordInput
                autoComplete="current-password"
                placeholder="Password"
                aria-invalid={fieldState.invalid}
                {...field}
              />



              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                />
              )}


            </Field>

          )}
        />




        <Controller
          control={form.control}
          name="rememberMe"
          render={({ field }) => (

            <Field orientation="horizontal">

              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />


              <FieldLabel className="m-0 leading-none">
                Remember me
              </FieldLabel>


            </Field>

          )}
        />




        <Field>

          <LoadingButton
            type="submit"
            loading={loginMutation.isPending}
          >
            Login
          </LoadingButton>

        </Field>




        <FieldSeparator>
          Or continue with
        </FieldSeparator>




        <Field>

          <Button
            variant="outline"
            type="button"
            className="cursor-pointer"
            onClick={() => handleSocialSignIn("google")}
          >

            <GoogleIcon
              width="0.98em"
              height="1em"
            />

            Login with Google

          </Button>



          <FieldDescription className="text-center">

            Don&apos;t have an account?{" "}

            <Link
              href="/sign-up"
              className="underline underline-offset-4"
            >
              Sign up
            </Link>


          </FieldDescription>


        </Field>


      </FieldGroup>


    </form>

  );
}