import { z } from 'zod'

/**
 * Validation schemas for the domain layer
 * Responsibility: define reusable validation rules
 */

// Base email schema
export const emailSchema = z.string().email('Invalid email')

// Schema for creating/editing expenses
export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200, 'Description is too long'),
  amount: z.number().positive('Amount must be greater than 0'),
  paid_by: z.string().uuid('Invalid payer ID'),
  group_id: z.string().uuid('Invalid group ID'),
  splitType: z.enum(['equal', 'full', 'custom']),
  memberIds: z.array(z.string().uuid()).min(1, 'At least one member is required'),
  created_by: z.string().uuid('Invalid creator ID'),

  // Custom splits: only required when splitType === 'custom'
  customSplits: z.record(z.string().uuid(), z.number().positive()).optional(),

  // Full beneficiary: only required when splitType === 'full'
  fullBeneficiaryId: z.string().uuid().optional()
})
  .refine(
    (data) => {
      if (data.splitType === 'full') {
        return data.fullBeneficiaryId && data.fullBeneficiaryId !== data.paid_by
      }
      return true
    },
    {
      message: 'For a "full" split, select a beneficiary different from the payer',
      path: ['fullBeneficiaryId']
    }
  )
  .refine(
    (data) => {
      // Custom splits must sum to the total (1-cent tolerance for floating point)
      if (data.splitType === 'custom' && data.customSplits) {
        const sum = Object.values(data.customSplits).reduce((acc, val) => acc + val, 0)
        const diff = Math.abs(sum - data.amount)
        return diff < 0.01
      }
      return true
    },
    {
      message: 'The sum of custom amounts must match the total amount',
      path: ['customSplits']
    }
  )

// Schema for updating expenses (omits group_id and created_by, requires updated_by)
export const updateExpenseSchema = createExpenseSchema
  .omit({ group_id: true, created_by: true })
  .extend({ updated_by: z.string().uuid('Invalid updater ID') })

// Schema for invitations
export const inviteSchema = z.object({
  email: emailSchema,
  group_id: z.string().uuid('Invalid group ID'),
  invited_by: z.string().uuid('Invalid inviter ID')
})

// Schema for creating groups
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional()
})

// Schema for settlements
export const createSettlementSchema = z.object({
  group_id: z.string().uuid('Invalid group ID'),
  from_user_id: z.string().uuid('Invalid debtor ID'),
  to_user_id: z.string().uuid('Invalid creditor ID'),
  amount: z.number().positive('Amount must be greater than 0')
})
  .refine(
    (data) => data.from_user_id !== data.to_user_id,
    {
      message: 'Debtor and creditor cannot be the same person',
      path: ['to_user_id']
    }
  )

// Helper to validate and return readable errors
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    errors: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
  }
}
