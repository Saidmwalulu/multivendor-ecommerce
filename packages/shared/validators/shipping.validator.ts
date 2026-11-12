import { z } from 'zod';

export const ShippingDetailsSchema = z
  .object({
    defaultShippingService: z.string().min(1),
    defaultShippingFeeFixed: z.number().min(0),
    defaultShippingFeePerItem: z.number().min(0),
    defaultShippingFeeForAdditionalItem: z.number().min(0),
    defaultShippingFeePerKg: z.number().min(0),
    defaultDeliveryTimeMin: z.number().int().min(1),
    defaultDeliveryTimeMax: z.number().int().min(1),
    returnPolicy: z.string().min(1),
  })
  .refine((v) => v.defaultDeliveryTimeMin <= v.defaultDeliveryTimeMax, {
    message: 'Max must be greater than or equal to min',
    path: ['defaultDeliveryTimeMax'],
  });

export const ShippingRateSchema = z
  .object({
    shippingService: z.string().min(1),
    shippingFeeFixed: z.number().min(0),
    shippingFeePerItem: z.number().min(0),
    shippingFeeForAdditionalItem: z.number().min(0),
    shippingFeePerKg: z.number().min(0),
    deliveryTimeMin: z.number().int().min(1),
    deliveryTimeMax: z.number().int().min(1),
    returnPolicy: z.string().min(1),
  })
  .refine((v) => v.deliveryTimeMin <= v.deliveryTimeMax, {
    message: "Max must be greater than or equal to min",
    path: ["deliveryTimeMax"],
  });

export type ShippingRateDto = z.infer<typeof ShippingRateSchema>;
export type ShippingDetailsDto = z.infer<typeof ShippingDetailsSchema>;