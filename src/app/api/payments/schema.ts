import { z } from 'zod'

export const CreatePaymentSchema = z.object({
  amount: z.number().int().min(100),
  orderName: z.string().min(1),
  productType: z.enum(['subscription', 'credit', 'one-time']),
  projectId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
})

export const ConfirmPaymentSchema = z.object({
  paymentKey: z.string().min(8),
  orderId: z.string().min(8),
  amount: z.number().int().min(100),
})

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>
export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>

