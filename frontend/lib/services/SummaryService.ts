// Note: Avoid importing supabase at module scope to keep pure helpers testable without envs.
// We'll dynamically import the client inside the async method that actually needs it.

export interface GlobalSummary {
  owedByMe: number // lo que debo pagar a otros
  owedToMe: number // lo que otros me deben
  net: number
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
   * Calcula sumario global para el usuario usando agregaciones server-side.
   * - owedByMe: suma de expense_splits.amount donde user_id = currentUser
   * - owedToMe: suma de expense_splits.amount join expenses donde paid_by = currentUser
   */
  static async getUserSummary(userId: string): Promise<{ data: GlobalSummary | null; error: any }> {
    const { supabase } = await import('../supabaseClient')
    // 1) Suma de lo que yo debo por grupo
    const { data: owedRows, error: owedErr } = await supabase
      .from('expense_splits')
      .select('amount, expense_id, expenses:expense_id(group_id, groups:group_id(name))')
      .eq('user_id', userId)

    if (owedErr) return { data: null, error: owedErr }

    // 2) Suma de lo que me deben (como pagador)
    const { data: toMeRows, error: toMeErr } = await supabase
      .from('expense_splits')
      .select('amount, expense_id, expenses:expense_id(group_id, paid_by, groups:group_id(name))')

    if (toMeErr) return { data: null, error: toMeErr }

    const { summary } = computeSummaryFromRows(userId, owedRows || [], toMeRows || [])
    return { data: summary, error: null }
  }
}

function round2(n: number) { return Math.round(n * 100) / 100 }

// Extraído para facilitar testeo con fixtures (sin Supabase)
export function computeSummaryFromRows(
  userId: string,
  owedRows: any[],
  toMeRows: any[],
) {
  const owedByGroup = new Map<string, { group_id: string; group_name: string; sum: number }>()
  let owedByMe = 0
  for (const row of owedRows) {
    const group_id = row.expenses?.group_id as string
    const group_name = row.expenses?.groups?.name as string
    const amount = Number(row.amount) || 0
    owedByMe += amount
    const acc = owedByGroup.get(group_id) || { group_id, group_name: group_name || '', sum: 0 }
    acc.sum += amount
    owedByGroup.set(group_id, acc)
  }

  const toMeByGroup = new Map<string, { group_id: string; group_name: string; sum: number }>()
  let owedToMe = 0
  for (const row of toMeRows) {
    if (row.expenses?.paid_by !== userId) continue
    const group_id = row.expenses?.group_id as string
    const group_name = row.expenses?.groups?.name as string
    const amount = Number(row.amount) || 0
    owedToMe += amount
    const acc = toMeByGroup.get(group_id) || { group_id, group_name: group_name || '', sum: 0 }
    acc.sum += amount
    toMeByGroup.set(group_id, acc)
  }

  const groupIds = new Set<string>([...owedByGroup.keys(), ...toMeByGroup.keys()])
  const byGroup = Array.from(groupIds).map(gid => {
    const owed = owedByGroup.get(gid)?.sum || 0
    const toMe = toMeByGroup.get(gid)?.sum || 0
    const group_name = toMeByGroup.get(gid)?.group_name || owedByGroup.get(gid)?.group_name || ''
    return {
      group_id: gid,
      group_name,
      owedByMe: round2(owed),
      owedToMe: round2(toMe),
      net: round2(toMe - owed)
    }
  })

  const summary: GlobalSummary = {
    owedByMe: round2(owedByMe),
    owedToMe: round2(owedToMe),
    net: round2(owedToMe - owedByMe),
    byGroup,
  }

  return { summary }
}
