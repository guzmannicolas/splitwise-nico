import { z } from 'zod'

/**
 * Validation schemas para la capa de dominio
 * Responsabilidad: definir reglas de validación reutilizables
 */

// Schema base para email
export const emailSchema = z.string().email('Email inválido')

// Schema para crear/editar gastos
export const createExpenseSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida').max(200, 'Descripción muy larga'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  paid_by: z.string().uuid('ID de pagador inválido'),
  group_id: z.string().uuid('ID de grupo inválido'),
  splitType: z.enum(['equal', 'full', 'custom']),
  memberIds: z.array(z.string().uuid()).min(1, 'Debe haber al menos un miembro'),
  created_by: z.string().uuid('ID de creador inválido'),
  
  // Custom splits: solo requerido si splitType === 'custom'
  customSplits: z.record(z.string().uuid(), z.number().positive()).optional(),
  
  // Full beneficiary: requerido solo si splitType === 'full'
  fullBeneficiaryId: z.string().uuid().optional()
})
  .refine(
    (data) => {
      // Si es full, debe tener beneficiario y no puede ser el pagador
      if (data.splitType === 'full') {
        return data.fullBeneficiaryId && data.fullBeneficiaryId !== data.paid_by
      }
      return true
    },
    {
      message: 'Para split tipo "full", debe seleccionar un beneficiario distinto del pagador',
      path: ['fullBeneficiaryId']
    }
  )
  .refine(
    (data) => {
      // Si es custom, la suma de los splits debe aproximarse al total (tolerancia para decimales)
      if (data.splitType === 'custom' && data.customSplits) {
        const sum = Object.values(data.customSplits).reduce((acc, val) => acc + val, 0)
        const diff = Math.abs(sum - data.amount)
        return diff < 0.01 // tolerancia de 1 centavo
      }
      return true
    },
    {
      message: 'La suma de los montos personalizados debe coincidir con el monto total',
      path: ['customSplits']
    }
  )

// Schema para actualizar gastos (omite group_id y created_by, requiere updated_by)
export const updateExpenseSchema = createExpenseSchema
  .omit({ group_id: true, created_by: true })
  .extend({ updated_by: z.string().uuid('ID de modificador inválido') })

// Schema para invitaciones
export const inviteSchema = z.object({
  email: emailSchema,
  group_id: z.string().uuid('ID de grupo inválido'),
  invited_by: z.string().uuid('ID de invitador inválido')
})

// Schema para crear grupos
export const createGroupSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'Nombre muy largo'),
  description: z.string().max(500, 'Descripción muy larga').optional()
})

// Schema para settlements/liquidaciones
export const createSettlementSchema = z.object({
  group_id: z.string().uuid('ID de grupo inválido'),
  from_user_id: z.string().uuid('ID de deudor inválido'),
  to_user_id: z.string().uuid('ID de acreedor inválido'),
  amount: z.number().positive('El monto debe ser mayor a 0')
})
  .refine(
    (data) => data.from_user_id !== data.to_user_id,
    {
      message: 'El deudor y acreedor no pueden ser la misma persona',
      path: ['to_user_id']
    }
  )

// Helper para validar y devolver errores legibles
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
