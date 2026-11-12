import { z } from "zod";

export const postSchema = z.object({
    title: z.string().min(1,'title is required'),
    content: z.string().min(1, 'content is required')
});

export const postSchemaEdit = z.object({
    title: z.string().nullable(),
    content: z.string().nullable()
})

export const commentSchema = z.object({
    username: z.string().min(1, "username is required"),
    content: z.string().min(1, "content is required"),
    postId: z.number().int("post ID must be an integer"),
});

const passwordSchema = z
  .string()
  .min(1, { message: "Password is required" })
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[^A-Za-z0-9]/, {
    message: "Password must contain at least one special character",
});

const emailField = z.email({ message: "Please enter a valid email" })

export const emailSchema = z.object({
    email: emailField
})


export const signUpSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: emailField,
    password: passwordSchema,
    passwordConfirmation: z
      .string()
      .min(1, { message: "Please confirm password" }),
})
.refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
  email: emailField,
});

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    email: emailField,
    newPassword: passwordSchema,
    newPasswordConfirmation: z
      .string()
      .min(1, { message: "Please confirm password" }),
})
.refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "Passwords do not match",
    path: ["newPasswordConfirmation"],
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  image: z.string().min(1, 'Image is required'), // base64 string or URL
  url: z.string().trim().min(1, 'URL slug is required')
    .regex(/^[a-z0-9-]+$/, 'URL can only contain lowercase letters, numbers, and hyphens'),
  featured: z.boolean(),
});
 
export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  image: z.string().min(1).optional(), // base64 string or URL — only if replacing image
  url: z.string().trim()
    .regex(/^[a-z0-9-]+$/, 'URL can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  featured: z.boolean().optional(),
});

export const createSubCategorySchema = createCategorySchema.extend({
  categoryId: z.string().min(1, 'Category is required'),
});

export const updateSubCategorySchema = updateCategorySchema.extend({
  categoryId: z.string().min(1, 'Category is required').optional(),
});