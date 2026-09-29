// Note: Avoid importing supabase at module scope to keep pure helpers testable without envs.
// We'll dynamically import the client inside the async method that actually needs it.

export interface GlobalSummary {
  owedByMe: number // Lo que debo pagar a otros
  owedToMe: number // Lo que otros me deben a mí
  net: number      // Balance neto global
  byGroup: Array<{
    group_id: string
    group_name: string
    owedByMe: number
    owedToMe: number
    net: number
  }>
}

export class SummaryService {
  /**
   * Obtiene el resumen global para el usuario consultando directamente
   * los gastos y las liquidaciones de los grupos activos.
   */
  static async getUserSummary(userId: string): Promise<{ data: GlobalSummary | null; error: any }> {
    const { supabase } = await import('../supabaseClient')

    // 1) Obtener únicamente los IDs de los grupos donde el usuario está activo
    const { data: userGroups, error: groupErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)

    if (groupErr) return { data: null, error: groupErr }

    const activeGroupIds = (userGroups || []).map(g => g.group_id)

    // Si no perteneces a ningún grupo activo, retornamos un resumen en cero
    if (activeGroupIds.length === 0) {
      return {
        data: { owedByMe: 0, owedToMe: 0, net: 0, byGroup: [] },
        error: null
      }
    }

    // 2) Obtener todos los gastos de los grupos activos con sus divisiones (splits)
    const { data: expenses, error: expensesErr } = await supabase
      .from('expenses')
      .select(`
        id,
        group_id,
        paid_by,
        groups:group_id(name),
        expense_splits(user_id, amount)
      `)
      .in('group_id', activeGroupIds)

    if (expensesErr) return { data: null, error: expensesErr }

    // 3) Obtener todas las liquidaciones (settlements) de los grupos activos
    const { data: settlements, error: settlementsErr } = await supabase
      .from('settlements')
      .select(`
        id,
        group_id,
        from_user_id,
        to_user_id,
        amount
      `)
      .in('group_id', activeGroupIds)

    if (settlementsErr) return { data: null, error: settlementsErr }

    // 4) Procesar los gastos y liquidaciones para calcular el balance consolidado
    const { summary } = computeSummaryFromExpenses(userId, expenses || [], settlements || [])
    return { data: summary, error: null }
  }
}

function round2(n: number) { 
  return Math.round(n * 100) / 100 
}

/**
 * Procesa la lista de gastos y liquidaciones, calculando el total por grupo y el neto global.
 * Extraída para facilitar pruebas unitarias sin dependencia de Supabase.
 */
export function computeSummaryFromExpenses(userId: string, expenses: any[], settlements: any[] = []) {
  const groupBalances = new Map<string, { group_id: string; group_name: string; owedByMe: number; owedToMe: number }>()

  // A) Sumar obligaciones según gastos y divisiones
  for (const exp of expenses) {
    const group_id = exp.group_id
    const group_name = exp.groups?.name || 'Grupo'
    const splits = exp.expense_splits || []

    const current = groupBalances.get(group_id) || { group_id, group_name, owedByMe: 0, owedToMe: 0 }

    if (exp.paid_by === userId) {
      // Si YO pagué el gasto, sumo lo que los DEMÁS me deben (excluyendo mi propia cuota)
      for (const split of splits) {
        if (split.user_id !== userId) {
          current.owedToMe += Number(split.amount) || 0
        }
      }
    } else {
      // Si pagó OTRO, busco mi cuota dentro de las divisiones de este gasto
      const mySplit = splits.find((s: any) => s.user_id === userId)
      if (mySplit) {
        current.owedByMe += Number(mySplit.amount) || 0
      }
    }

    groupBalances.set(group_id, current)
  }

  // B) Restar o ajustar obligaciones según las liquidaciones realizadas
  for (const st of settlements) {
    const group_id = st.group_id
    if (!group_id) continue

    const current = groupBalances.get(group_id)
    if (!current) continue

    const amount = Number(st.amount) || 0

    if (st.from_user_id === userId) {
      // Yo envié dinero para saldar una deuda -> reduce lo que debo
      current.owedByMe -= amount
    } else if (st.to_user_id === userId) {
      // A mí me enviaron dinero -> reduce lo que me deben
      current.owedToMe -= amount
    }
  }

  let totalOwedByMe = 0
  let totalOwedToMe = 0

  // C) Consolidar totales por grupo
  const byGroup = Array.from(groupBalances.values()).map(g => {
    let owedByMe = g.owedByMe
    let owedToMe = g.owedToMe

    // Manejar casos donde las liquidaciones invierten la dirección del saldo
    if (owedByMe < 0) {
      owedToMe += Math.abs(owedByMe)
      owedByMe = 0
    }
    if (owedToMe < 0) {
      owedByMe += Math.abs(owedToMe)
      owedToMe = 0
    }

    owedByMe = round2(owedByMe)
    owedToMe = round2(owedToMe)
    const net = round2(owedToMe - owedByMe)

    totalOwedByMe += owedByMe
    totalOwedToMe += owedToMe

    return {
      group_id: g.group_id,
      group_name: g.group_name,
      owedByMe,
      owedToMe,
      net
    }
  })

  const net = round2(totalOwedToMe - totalOwedByMe)

  return {
    summary: {
      owedByMe: round2(totalOwedByMe),
      owedToMe: round2(totalOwedToMe),
      net,
      byGroup
    }
  }
} 