export type PaySchedule = 'monthly' | 'semi_monthly' | 'weekly'
export type Role = 'owner' | 'adult' | 'teen' | 'child'
export type CategoryType = 'fixed' | 'emergency' | 'other'
export type TxKind = 'expense' | 'income' | 'saving'

export interface Household {
  id: string
  name: string
  currency: string
  pay_schedule: PaySchedule
  main_goal: string | null
  emergency_target: number
}

export interface Member {
  id: string
  household_id: string
  user_id: string | null
  name: string
  role: Role
  birth_year: number | null
}

export interface Income {
  id: string
  household_id: string
  member_id: string | null
  source: string
  amount: number
  frequency: PaySchedule
}

export interface Category {
  id: string
  household_id: string
  name: string
  type: CategoryType
  monthly_budget: number
  due_day: number | null
  icon: string
  archived: boolean
}

export interface Goal {
  id: string
  household_id: string
  name: string
  target_amount: number
  target_date: string | null
  emoji: string
  is_emergency_fund: boolean
  archived: boolean
  created_at: string
}

export interface Transaction {
  id: string
  household_id: string
  member_id: string | null
  kind: TxKind
  category_id: string | null
  goal_id: string | null
  amount: number
  date: string
  note: string | null
  created_by: string | null
  created_at: string
}

export interface BillPayment {
  id: string
  household_id: string
  category_id: string
  month: string
  transaction_id: string | null
}

export interface Invite {
  id: string
  household_id: string
  member_id: string | null
  email: string | null
  role: 'adult' | 'teen'
  token: string
  expires_at: string
  accepted_at: string | null
}
