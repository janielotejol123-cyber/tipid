import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { buildPlan, monthSummary, type MonthSummary, type Plan, type Snapshot } from './budget'
import { addMonths, monthStart, ymd } from './money'
import { supabase } from './supabase'
import type { Member } from './types'

interface HouseholdState {
  loading: boolean
  error: string | null
  /** null once loaded = user has no household yet → onboarding */
  data: Snapshot | null
  me: Member | null
  canManage: boolean
  thisMonth: MonthSummary | null
  plan: Plan | null
  reload: () => Promise<void>
}

const Ctx = createContext<HouseholdState | null>(null)
const HISTORY_MONTHS = 13

async function load(userId: string): Promise<{ data: Snapshot | null; me: Member | null }> {
  const { data: mine, error } = await supabase.from('members').select('*').eq('user_id', userId)
    .order('created_at').limit(1)
  if (error) throw error
  const me = (mine?.[0] as Member | undefined) ?? null
  if (!me) return { data: null, me: null }

  const hid = me.household_id
  const since = ymd(addMonths(monthStart(new Date()), -(HISTORY_MONTHS - 1)))
  const q = <T,>(p: PromiseLike<{ data: T[] | null; error: unknown }>) =>
    Promise.resolve(p).then((r) => { if (r.error) throw r.error; return r.data ?? [] })

  const [households, members, incomes, categories, goals, recent, savings, billPayments] = await Promise.all([
    q(supabase.from('households').select('*').eq('id', hid)),
    q(supabase.from('members').select('*').eq('household_id', hid).order('created_at')),
    q(supabase.from('incomes').select('*').eq('household_id', hid).order('created_at')),
    q(supabase.from('categories').select('*').eq('household_id', hid).order('created_at')),
    q(supabase.from('goals').select('*').eq('household_id', hid).order('created_at')),
    q(supabase.from('transactions').select('*').eq('household_id', hid).gte('date', since)
      .order('date', { ascending: false }).order('created_at', { ascending: false })),
    // savings are needed all-time to compute goal progress
    q(supabase.from('transactions').select('*').eq('household_id', hid).eq('kind', 'saving').lt('date', since)),
    q(supabase.from('bill_payments').select('*').eq('household_id', hid).gte('month', since)),
  ])

  const num = <T extends object>(rows: T[], keys: (keyof T)[]) =>
    rows.map((r) => { const o = { ...r }; for (const k of keys) (o as Record<keyof T, unknown>)[k] = Number(r[k] ?? 0); return o })

  return {
    me,
    data: {
      household: num(households as Snapshot['household'][], ['emergency_target'])[0],
      members: members as Member[],
      incomes: num(incomes as Snapshot['incomes'], ['amount']),
      categories: num(categories as Snapshot['categories'], ['monthly_budget']),
      goals: num(goals as Snapshot['goals'], ['target_amount']),
      transactions: num([...(recent as Snapshot['transactions']), ...(savings as Snapshot['transactions'])], ['amount']),
      billPayments: billPayments as Snapshot['billPayments'],
    },
  }
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Snapshot | null>(null)
  const [me, setMe] = useState<Member | null>(null)

  const reload = useCallback(async () => {
    if (!userId) return
    try {
      const r = await load(userId)
      setData(r.data); setMe(r.me); setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { setLoading(true); reload() }, [reload])

  // Family sync: refresh when anyone in the household changes something
  const hid = data?.household.id
  useEffect(() => {
    if (!hid) return
    const filter = `household_id=eq.${hid}`
    const ch = supabase.channel(`household-${hid}`)
    for (const table of ['transactions', 'bill_payments', 'goals']) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => reload())
    }
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [hid, reload])

  const value = useMemo<HouseholdState>(() => {
    const now = new Date()
    return {
      loading, error, data, me, reload,
      canManage: me?.role === 'owner' || me?.role === 'adult',
      thisMonth: data ? monthSummary(data, now) : null,
      plan: data ? buildPlan(data, now) : null,
    }
  }, [loading, error, data, me, reload])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useHousehold() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useHousehold outside HouseholdProvider')
  return v
}

/** For pages rendered inside the app shell, where data is guaranteed to be loaded. */
export function useData() {
  const h = useHousehold()
  if (!h.data || !h.thisMonth || !h.plan) throw new Error('household not loaded')
  return { ...h, data: h.data, thisMonth: h.thisMonth, plan: h.plan }
}
