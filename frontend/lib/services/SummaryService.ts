// Note: Avoid importing supabase at module scope to keep pure helpers testable without envs.
// We'll dynamically import the client inside the async method that actually needs it.

export interface GlobalSummary {
  owedByMe: number // What I owe to others
  owedToMe: number // What others owe me
  net: number      // Global net balance
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
   * Retrieves the global summary for the user by directly querying
   * expenses and settlements from active groups.
   */
  static async getUserSummary(userId: string): Promise<{ data: GlobalSummary | null; error: any }> {
    const { supabase } = await import('../supabaseClient')

    // 1) Get only the IDs of groups where the user is active
    const { data: userGroups, error: groupErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)

    if (groupErr) return { data: null, error: groupErr }

    const activeGroupIds = (userGroups || []).map(g => g.group_id)

    // If the user belongs to no active groups, return a zero summary
    if (activeGroupIds.length === 0) {
      return {
        data: { owedByMe: 0, owedToMe: 0, net: 0, byGroup: [] },
        error: null
      }
    }

    // 2) Get all expenses for active groups with their splits
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

    // 3) Get all settlements for active groups
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

    // 4) Process expenses and settlements to compute the consolidated balance
    const { summary } = computeSummaryFromExpenses(userId, expenses || [], settlements || [])
    return { data: summary, error: null }
  }
}

function round2(n: number) { 
  return Math.round(n * 100) / 100 
}

/**
 * Processes the list of expenses and settlements, computing totals per group and the global net.
 * Extracted to enable unit testing without a Supabase dependency.
 */
export function computeSummaryFromExpenses(userId: string, expenses: any[], settlements: any[] = []) {
  const groupBalances = new Map<string, { group_id: string; group_name: string; owedByMe: number; owedToMe: number }>()

  // A) Accumulate obligations from expenses and splits
  for (const exp of expenses) {
    const group_id = exp.group_id
    const group_name = exp.groups?.name || 'Group'
    const splits = exp.expense_splits || []

    const current = groupBalances.get(group_id) || { group_id, group_name, owedByMe: 0, owedToMe: 0 }

    if (exp.paid_by === userId) {
      // If I paid the expense, add what OTHERS owe me (excluding my own share)
      for (const split of splits) {
        if (split.user_id !== userId) {
          current.owedToMe += Number(split.amount) || 0
        }
      }
    } else {
      // If SOMEONE ELSE paid, find my share among this expense's splits
      const mySplit = splits.find((s: any) => s.user_id === userId)
      if (mySplit) {
        current.owedByMe += Number(mySplit.amount) || 0
      }
    }

    groupBalances.set(group_id, current)
  }

  // B) Subtract or adjust obligations based on recorded settlements
  for (const st of settlements) {
    const group_id = st.group_id
    if (!group_id) continue

    const current = groupBalances.get(group_id)
    if (!current) continue

    const amount = Number(st.amount) || 0

    if (st.from_user_id === userId) {
      // I sent money to settle a debt -> reduces what I owe
      current.owedByMe -= amount
    } else if (st.to_user_id === userId) {
      // I received money -> reduces what others owe me
      current.owedToMe -= amount
    }
  }

  let totalOwedByMe = 0
  let totalOwedToMe = 0

  // C) Consolidate totals per group
  const byGroup = Array.from(groupBalances.values()).map(g => {
    let owedByMe = g.owedByMe
    let owedToMe = g.owedToMe

    // Handle cases where settlements reverse the direction of the balance
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