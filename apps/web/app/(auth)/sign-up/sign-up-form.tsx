"use client"

import { cn } from "@/lib/utils"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { PasswordInput } from "@/components/password-input"
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod"
import { RegisterSchema } from "@repo/shared"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { LoadingButton } from "@/components/loading-button"
import api from "@/lib/axios"
import { toast } from "sonner"

type SignUpValues = z.infer<typeof RegisterSchema>;

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

    const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const form = useForm<SignUpValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit({ email, password, username, confirmPassword }: SignUpValues) {
    // TODO: Handle sign up
 
    setError(null);
    try {
      const response = await api.post("/auth/register", {
        username, email, password, confirmPassword
      })
      const { success, message, data } = response.data;
      if (success) {
        console.log(message);
        console.log(data.user);
        toast.success(message);
      } 
    } catch (error: any) {
      const message = error.response?.data?.message || "Registration failed";
      setError(message);
      console.error(message);
    }
    
  }
  const loading = form.formState.isSubmitting;

  return (
    <form id="signup-form" onSubmit={form.handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Fill in the form below to create your account
          </p>
        </div>
        <Controller
            control={form.control}
            name="username"
            render={({field, fieldState}) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Userame</FieldLabel>
                    <Input 
                        id="name" 
                        type="text" 
                        aria-invalid={fieldState.invalid}
                        placeholder="John Doe"
                        {...field}
                    />
                    {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                    )}
                </Field>
            )}
         />


        <Controller
            control={form.control}
            name="email"
            render={({field, fieldState}) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input 
                        id="email" 
                        type="email" 
                        aria-invalid={fieldState.invalid}
                        placeholder="m@example.com"
                        {...field}
                    />
                    {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                    )}

                    <FieldDescription>
                        We&apos;ll use this to contact you. We will not share your email
                        with anyone else.
                    </FieldDescription>
                </Field>
            )}
        />    
        
        <Controller
            control={form.control}
            name="password"
            render={({field, fieldState}) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput 
                        autoComplete="new-password" 
                        placeholder="Password"
                        aria-invalid={fieldState.invalid} 
                        {...field}
                    />
                    {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                    )}
                </Field>
            )}
        />
        
        <Controller
            control={form.control}
            name="confirmPassword"
            render={({field, fieldState}) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                    <PasswordInput 
                        autoComplete="new-password" 
                        placeholder="Confirm Password" 
                        aria-invalid={fieldState.invalid}
                        {...field}
                    />
                    {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                    )}
                </Field>
            )}
        />    
        
        {error && (
          <div role="alert" className="text-sm text-red-600">
            {error}
          </div>
        )}

        <Field>
          <LoadingButton type="submit" loading={loading}>Create Account</LoadingButton>
        </Field>
        
        <Field>
          <FieldDescription className="px-6 text-center">
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
