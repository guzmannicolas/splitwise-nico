// Shared types for the services
export interface Group {
  id: string
  name: string
  description: string
  created_at: string
  created_by?: string
}

export interface Member {
  user_id: string
  profiles?: {
    full_name: string
    email?: string
  }
}

export interface Expense {
  id: string
  description: string
  amount: number
  paid_by: string
  created_at: string
  created_by?: string
  updated_at?: string
  updated_by?: string
  group_id?: string
  profiles?: {
    full_name: string
  }
}

export interface ExpenseSplit {
  expense_id: string
  user_id: string
  amount: number
}

export interface Settlement {
  id: string
  group_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  created_at: string
  created_by?: string
  deleted_at?: string | null
}

export interface Balance {
  user_id: string
  name: string
  balance: number // positive = owed to user, negative = user owes
}

export interface DebtDetail {
  from_user_id: string // who owes
  to_user_id: string // who is owed
  amount: number
  debtor_name: string
  creditor_name: string
}

export type SplitType = 'equal' | 'full' | 'custom'

export interface CreateExpenseData {
  description: string
  amount: number
  paid_by: string
  group_id: string
  splitType: SplitType
  customSplits?: Record<string, number>
  memberIds: string[]
  fullBeneficiaryId?: string // For splitType 'full': who owes the full amount
  created_by: string // User creating the expense
}

export interface UpdateExpenseData {
  description: string
  amount: number
  paid_by: string
  splitType: SplitType
  customSplits?: Record<string, number>
  memberIds: string[]
  fullBeneficiaryId?: string
  updated_by: string // User updating the expense
}
