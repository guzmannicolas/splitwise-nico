import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Layout from '../../components/Layout'

interface Group {
  id: string
  name: string
  description: string
  created_at: string
  created_by?: string
}

interface Member {
  user_id: string
  profiles?: {
    full_name: string
    email?: string
  }
}

interface Expense {
  id: string
  description: string
  amount: number
  paid_by: string
  created_at: string
  profiles?: {
    full_name: string
  }
}

interface ExpenseSplit {
  expense_id: string
  user_id: string
  amount: number
}

interface Balance {
  user_id: string
  name: string
  balance: number // positivo = le deben, negativo = debe
}

interface Settlement {
  id: string
  group_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  created_at: string
}

export default function GroupDetail() {
  const router = useRouter()
  const { id } = router.query
  
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null)
  // Invitar miembro
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  
  // Estado para crear nuevo gasto
  const [newExpenseDesc, setNewExpenseDesc] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [paidBy, setPaidBy] = useState<string>('') // user_id de quien pagó
  const [splitType, setSplitType] = useState<'equal' | 'full' | 'custom'>('equal') // equal = dividir, full = todo el monto, custom = montos personalizados
  const [customSplitsCreate, setCustomSplitsCreate] = useState<Record<string, string>>({}) // user_id -> monto string
  // Edición de gasto
  const [editingId, setEditingId] = useState<string>('')
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editPaidBy, setEditPaidBy] = useState<string>('')
  const [editSplitType, setEditSplitType] = useState<'equal' | 'full' | 'custom'>('equal')
  const [editCustomSplits, setEditCustomSplits] = useState<Record<string, string>>({})
  // UI: expandir/cerrar detalles por gasto
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // UI: liquidar deuda
  const [settleFrom, setSettleFrom] = useState<string>('')
  const [settleTo, setSettleTo] = useState<string>('')
  const [settleAmount, setSettleAmount] = useState<string>('')
  const [settling, setSettling] = useState<boolean>(false)

  useEffect(() => {
    if (id) {
      fetchGroupData()
    }
  }, [id])

  function shortId(uid: string) {
    return uid?.slice(0, 8) || ''
  }

  function calculateBalances(membersData: any[], expensesData: any[], splitsData: ExpenseSplit[], settlementsData: Settlement[] = []) {
    // Mapa de user_id -> balance neto
    const balanceMap: { [key: string]: number } = {}
    
    // Inicializar todos los miembros en 0
    membersData.forEach(m => {
      balanceMap[m.user_id] = 0
    })

    // Para cada gasto: quien pagó suma el monto, quien debe resta su split
    expensesData.forEach((expense: any) => {
      // El que pagó suma el monto total
      balanceMap[expense.paid_by] = (balanceMap[expense.paid_by] || 0) + expense.amount
    })

    // Restar los splits (lo que cada uno debe)
    splitsData.forEach(split => {
      balanceMap[split.user_id] = (balanceMap[split.user_id] || 0) - split.amount
    })

    // Aplicar liquidaciones (pagos entre miembros)
    settlementsData.forEach(s => {
      // quien paga (from) aumenta su balance (menos deuda)
      balanceMap[s.from_user_id] = (balanceMap[s.from_user_id] || 0) + s.amount
      // quien recibe (to) reduce su balance (menos a su favor)
      balanceMap[s.to_user_id] = (balanceMap[s.to_user_id] || 0) - s.amount
    })

    // Convertir a array de Balance con nombres
    const balancesArray: Balance[] = membersData.map(m => {
      const profile = m.profiles?.[0] || m.profiles
      return {
        user_id: m.user_id,
        name: profile?.full_name || (currentUser && m.user_id === currentUser.id ? currentUser.email || shortId(m.user_id) : shortId(m.user_id)),
        balance: balanceMap[m.user_id] || 0
      }
    })

    setBalances(balancesArray)
  }

  async function ensureProfileName(u: { id: string; email: string | null } | null) {
    try {
      if (!u) return
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', u.id)
        .single()
      if (error) return
      if (!profile?.full_name) {
        await supabase
          .from('profiles')
          .upsert({ id: u.id, full_name: u.email || 'Usuario' }, { onConflict: 'id' })
      }
    } catch {}
  }

  async function fetchGroupData() {
    try {
      console.log('=== Cargando datos del grupo ===')
      // Usuario actual (para mostrar email como fallback y completar perfil si falta nombre)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user ? { id: user.id, email: user.email || null } : null)
      await ensureProfileName(user ? { id: user.id, email: user.email || null } : null)
      
      // Obtener información del grupo
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single()

      console.log('Grupo:', { groupData, groupError })
      if (groupError) throw groupError
      setGroup(groupData)

      // Obtener miembros del grupo
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('group_id', id)

      console.log('Miembros:', { membersData, membersError })
      if (membersError) {
        console.error('Error obteniendo miembros:', membersError)
        alert('Error al obtener miembros: ' + membersError.message)
      }
      setMembers((membersData as any) || [])

      // Obtener gastos del grupo
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          id, description, amount, paid_by, created_at,
          profiles:paid_by ( full_name )
        `)
        .eq('group_id', id)
        .order('created_at', { ascending: false })

      console.log('Gastos:', { expensesData, expensesError })
      if (expensesError) {
        console.error('Error obteniendo gastos:', expensesError)
        alert('Error al obtener gastos: ' + expensesError.message)
      }
      setExpenses((expensesData as any) || [])

      // Obtener splits de todos los gastos del grupo (local para cálculo)
      const expenseIds = expensesData?.map(e => e.id) || []
      let splitsLocal: ExpenseSplit[] = []
      if (expenseIds.length > 0) {
        const { data: splitsData, error: splitsError } = await supabase
          .from('expense_splits')
          .select('*')
          .in('expense_id', expenseIds)

        console.log('Splits:', { splitsData, splitsError })
        if (!splitsError && splitsData) {
          setSplits(splitsData as any)
          splitsLocal = splitsData as any
        } else {
          setSplits([])
          splitsLocal = []
        }
      } else {
        setSplits([])
        splitsLocal = []
      }

      // Intentar obtener liquidaciones (puede no existir la tabla aún)
      let settlementsLocal: Settlement[] = []
      try {
        const { data: settlementsData, error: settlementsError } = await supabase
          .from('settlements')
          .select('*')
          .eq('group_id', id)
          .order('created_at', { ascending: false })
        if (!settlementsError && settlementsData) {
          setSettlements(settlementsData as any)
          settlementsLocal = settlementsData as any
        } else {
          setSettlements([])
          settlementsLocal = []
        }
      } catch (e) {
        console.warn('No se pudieron cargar liquidaciones (posible tabla inexistente)', e)
        setSettlements([])
        settlementsLocal = []
      }

      // Filtrar liquidaciones antiguas si no hay gastos, ignora todas; si hay, considera solo las posteriores al gasto más antiguo
      let settlementsForCalc: Settlement[] = []
      if ((expensesData || []).length === 0) {
        settlementsForCalc = []
      } else {
        const oldestExpenseTs = Math.min(...(expensesData || []).map(e => new Date(e.created_at).getTime()))
        settlementsForCalc = (settlementsLocal || []).filter(s => new Date(s.created_at).getTime() >= oldestExpenseTs)
      }

      // Recalcular balances con datos locales (evita estado obsoleto)
      calculateBalances(membersData || [], expensesData || [], splitsLocal || [], settlementsForCalc || [])

    } catch (error) {
      console.error('Error fetching group data:', error)
      alert('Error al cargar el grupo: ' + (error instanceof Error ? error.message : JSON.stringify(error)))
    } finally {
      setLoading(false)
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail || !currentUser) return
    
    try {
      setInviting(true)
      
      // Verificar si el usuario ya es miembro
      const isAlreadyMember = members.some(m => 
        m.profiles?.email === inviteEmail || m.user_id === inviteEmail
      )
      
      if (isAlreadyMember) {
        alert('Este usuario ya es miembro del grupo')
        setInviteEmail('')
        setInviting(false)
        return
      }
      
      // Crear invitación
      const { data, error } = await supabase
        .from('group_invitations')
        .insert({
          group_id: id,
          invited_email: inviteEmail,
          invited_by: currentUser.id,
          status: 'pending'
        })
        .select()
      
      if (error) throw error
      
      // Enviar email de invitación
      if (data && data[0]) {
        const token = data[0].token
        const inviteLink = `${window.location.origin}/accept-invite?token=${token}`
        
        // Obtener nombre del grupo y del invitador
        const invitedByName = members.find(m => m.user_id === currentUser.id)?.profiles?.full_name || currentUser.email || 'Alguien'
        const groupName = group?.name || 'un grupo'
        
        try {
          // Llamar a Edge Function para enviar email
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
            body: {
              invitedEmail: inviteEmail,
              invitedByName: invitedByName,
              groupName: groupName,
              token: token,
              siteUrl: window.location.origin
            }
          })
          
          if (emailError) {
            console.error('Error al enviar email:', emailError)
            // Si falla el email, mostrar link manual como fallback
            alert(`Invitación creada, pero no se pudo enviar el email.\n\nComparte este link manualmente:\n\n${inviteLink}`)
            await navigator.clipboard.writeText(inviteLink)
          } else {
            // Email enviado exitosamente
            alert(`✅ Invitación enviada a ${inviteEmail}!\n\nTambién puedes compartir este link:\n${inviteLink}`)
            await navigator.clipboard.writeText(inviteLink)
          }
        } catch (emailErr) {
          console.error('Error al invocar función de email:', emailErr)
          // Fallback: mostrar link manual
          alert(`Invitación creada. Comparte este link:\n\n${inviteLink}`)
          await navigator.clipboard.writeText(inviteLink)
        }
      }
      
      setInviteEmail('')
      await fetchGroupData()
    } catch (err: any) {
      console.error('Error completo al invitar:', err)
      
      // Extraer mensaje de error de Supabase
      let errorMsg = 'Error desconocido'
      if (err?.message) {
        errorMsg = err.message
      } else if (err?.error_description) {
        errorMsg = err.error_description
      } else if (err?.details) {
        errorMsg = err.details
      } else if (typeof err === 'string') {
        errorMsg = err
      } else {
        errorMsg = JSON.stringify(err)
      }
      
      alert('No se pudo crear la invitación: ' + errorMsg)
    } finally {
      setInviting(false)
    }
  }

  async function deleteExpense(expenseId: string) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      alert('Gasto eliminado')
      fetchGroupData()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Error al eliminar: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  function toggleExpand(expenseId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(expenseId)) next.delete(expenseId)
      else next.add(expenseId)
      return next
    })
  }

  function displayNameFor(userId: string) {
    const m = members.find(mm => mm.user_id === userId)
    if (!m) return shortId(userId)
    return m.profiles?.full_name || (currentUser && userId === currentUser.id ? currentUser.email || shortId(userId) : shortId(userId))
  }

  async function submitSettlement(e: React.FormEvent) {
    e.preventDefault()
    if (!settleFrom || !settleTo) {
      alert('Selecciona quién paga y quién recibe')
      return
    }
    if (settleFrom === settleTo) {
      alert('Las personas deben ser distintas')
      return
    }
    const amount = parseFloat(settleAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Monto inválido')
      return
    }
    try {
      setSettling(true)
      const { error } = await supabase
        .from('settlements')
        .insert([
          { group_id: id, from_user_id: settleFrom, to_user_id: settleTo, amount }
        ])
      if (error) throw error
      setSettleFrom('')
      setSettleTo('')
      setSettleAmount('')
      await fetchGroupData()
      alert('Liquidación registrada')
    } catch (err: any) {
      console.error('Error registrando liquidación', err)
      // Si la tabla no existe, dar instrucciones rápidas
      const msg = err?.message || String(err)
      if (msg.includes('relation') && msg.includes('does not exist')) {
        alert('Falta crear la tabla settlements en Supabase. Te mostraré los pasos en la pantalla.')
      } else {
        alert('No se pudo registrar la liquidación: ' + msg)
      }
    } finally {
      setSettling(false)
    }
  }

  async function deleteSettlement(settlementId: string) {
    if (!confirm('¿Eliminar esta liquidación?')) return
    try {
      const { error } = await supabase
        .from('settlements')
        .delete()
        .eq('id', settlementId)
      if (error) throw error
      await fetchGroupData()
      alert('Liquidación eliminada')
    } catch (err: any) {
      console.error('Error eliminando liquidación', err)
      alert('No se pudo eliminar: ' + (err?.message || String(err)))
    }
  }

  async function createExpense(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario autenticado')

      const amount = parseFloat(newExpenseAmount)
      if (isNaN(amount) || amount <= 0) {
        alert('Por favor ingresa un monto válido')
        return
      }

      if (!paidBy) {
        alert('Por favor selecciona quién pagó')
        return
      }

      // Crear el gasto
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert([
          {
            group_id: id,
            description: newExpenseDesc,
            amount: amount,
            paid_by: paidBy
          }
        ])
        .select()
        .single()

      if (expenseError) throw expenseError

      // Calcular splits según el tipo
  let splits
      if (splitType === 'equal') {
        // Dividir entre todos los miembros
        const amountPerPerson = amount / members.length
        splits = members.map(member => ({
          expense_id: expenseData.id,
          user_id: member.user_id,
          amount: amountPerPerson
        }))
      } else if (splitType === 'full') {
        // full: A quien pagó se le adeuda el monto total.
        // El pagador NO debe nada, los demás deben el total repartido entre ellos.
        const others = members.filter(m => m.user_id !== paidBy)
        const perOther = others.length > 0 ? amount / others.length : 0
        splits = members.map(member => ({
          expense_id: expenseData.id,
          user_id: member.user_id,
          amount: member.user_id === paidBy ? 0 : perOther
        }))
      } else {
        // custom: montos personalizados por usuario
        const amounts = members.map(m => ({
          user_id: m.user_id,
          amount: parseFloat(customSplitsCreate[m.user_id] || '0') || 0
        }))
        const sum = amounts.reduce((acc, x) => acc + x.amount, 0)
        const epsilon = 0.01
        if (Math.abs(sum - amount) > epsilon) {
          alert(`La suma de los montos personalizados ($${sum.toFixed(2)}) debe ser igual al monto total ($${amount.toFixed(2)})`)
          return
        }
        splits = amounts.map(a => ({ expense_id: expenseData.id, user_id: a.user_id, amount: a.amount }))
      }

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)

      if (splitsError) throw splitsError

      // Limpiar formulario y recargar datos
      setNewExpenseDesc('')
      setNewExpenseAmount('')
      setPaidBy('')
      setSplitType('equal')
      setShowExpenseForm(false)
      fetchGroupData()
      
      alert('Gasto creado exitosamente')
    } catch (error) {
      console.error('Error creating expense:', error)
      alert('Error al crear gasto: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  function detectSplitTypeFor(expense: Expense, expenseSplits: ExpenseSplit[], membersList: Member[]): 'equal' | 'full' | 'custom' {
    const amount = expense.amount
    const epsilon = 0.01
    if (membersList.length === 0) return 'custom'
    const equalShare = amount / membersList.length
    const allEqual = membersList.every(m => {
      const s = expenseSplits.find(x => x.user_id === m.user_id)
      return s ? Math.abs(s.amount - equalShare) < epsilon : Math.abs(0 - equalShare) < epsilon
    })
    if (allEqual) return 'equal'
    const others = membersList.filter(m => m.user_id !== expense.paid_by)
    const perOther = others.length > 0 ? amount / others.length : 0
    const isFull = membersList.every(m => {
      const s = expenseSplits.find(x => x.user_id === m.user_id)
      if (m.user_id === expense.paid_by) return Math.abs((s?.amount || 0) - 0) < epsilon
      return s ? Math.abs(s.amount - perOther) < epsilon : Math.abs(0 - perOther) < epsilon
    })
    if (isFull) return 'full'
    return 'custom'
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id)
    setEditDesc(expense.description)
    setEditAmount(expense.amount.toString())
    setEditPaidBy(expense.paid_by)
    const expSplits = splits.filter(s => s.expense_id === expense.id)
    const kind = detectSplitTypeFor(expense, expSplits, members)
    setEditSplitType(kind)
    const map: Record<string, string> = {}
    members.forEach(m => {
      const s = expSplits.find(x => x.user_id === m.user_id)
      map[m.user_id] = s ? s.amount.toString() : '0'
    })
    setEditCustomSplits(map)
  }

  function cancelEdit() {
    setEditingId('')
    setEditDesc('')
    setEditAmount('')
    setEditPaidBy('')
    setEditSplitType('equal')
    setEditCustomSplits({})
  }

  async function saveEdit(expenseId: string, e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Monto inválido')
      return
    }
    if (!editPaidBy) {
      alert('Selecciona quién paga')
      return
    }
    try {
      // Actualizar gasto
      const { error: updError } = await supabase
        .from('expenses')
        .update({ description: editDesc, amount, paid_by: editPaidBy })
        .eq('id', expenseId)
      if (updError) throw updError

      // Reemplazar splits
      const { error: delError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId)
      if (delError) throw delError

      let newSplits: ExpenseSplit[] = []
      if (editSplitType === 'equal') {
        const per = amount / members.length
        newSplits = members.map(m => ({ expense_id: expenseId, user_id: m.user_id, amount: per }))
      } else if (editSplitType === 'full') {
        const others = members.filter(m => m.user_id !== editPaidBy)
        const perOther = others.length > 0 ? amount / others.length : 0
        newSplits = members.map(m => ({ expense_id: expenseId, user_id: m.user_id, amount: m.user_id === editPaidBy ? 0 : perOther }))
      } else {
        const amounts = members.map(m => ({ user_id: m.user_id, amount: parseFloat(editCustomSplits[m.user_id] || '0') || 0 }))
        const sum = amounts.reduce((acc, x) => acc + x.amount, 0)
        const epsilon = 0.01
        if (Math.abs(sum - amount) > epsilon) {
          alert(`La suma de los montos personalizados ($${sum.toFixed(2)}) debe ser igual al monto total ($${amount.toFixed(2)})`)
          return
        }
        newSplits = amounts.map(a => ({ expense_id: expenseId, user_id: a.user_id, amount: a.amount }))
      }

      const { error: insError } = await supabase
        .from('expense_splits')
        .insert(newSplits as any)
      if (insError) throw insError

      cancelEdit()
      await fetchGroupData()
      alert('Gasto actualizado')
    } catch (err: any) {
      console.error('Error al actualizar gasto', err)
      alert('No se pudo actualizar: ' + (err?.message || String(err)))
    }
  }

  async function leaveGroup() {
    if (!currentUser) return
    if (!confirm('¿Estás seguro de salir de este grupo? Esta acción no se puede deshacer.')) return
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', currentUser.id)
      if (error) throw error
      alert('Has salido del grupo')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error al salir del grupo', err)
      alert('No se pudo salir: ' + (err?.message || String(err)))
    }
  }

  async function deleteGroup() {
    if (!currentUser || !group) return
    if (group.created_by !== currentUser.id) {
      alert('Solo el creador del grupo puede eliminarlo')
      return
    }
    if (!confirm('¿Estás seguro de eliminar este grupo? Se eliminarán todos los gastos y liquidaciones. Esta acción no se puede deshacer.')) return
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id)
      if (error) throw error
      alert('Grupo eliminado')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error al eliminar grupo', err)
      alert('No se pudo eliminar: ' + (err?.message || String(err)))
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    )
  }

  if (!group) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400 text-lg">Grupo no encontrado</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6 px-2 py-4">
        {/* Header del grupo */}
        <div className="bg-gradient-to-br from-white to-blue-50 shadow-xl rounded-2xl p-6 border border-blue-100">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold text-blue-700">{group.name}</h1>
              {group.description && (
                <p className="text-gray-600 mt-2 text-lg">{group.description}</p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={leaveGroup}
                className="px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                title="Salir del grupo"
              >
                Salir del grupo
              </button>
              {group.created_by === currentUser?.id && (
                <button
                  onClick={deleteGroup}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Eliminar grupo"
                >
                  Eliminar grupo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Miembros */}
        <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Miembros ({members.length})</h2>
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.user_id} className="flex items-center bg-blue-50 p-3 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                  <span className="text-sm">{(member.profiles?.full_name || 'U')[0].toUpperCase()}</span>
                </div>
                <span className="ml-3 font-semibold text-gray-700">
                  {member.profiles?.full_name || (currentUser && member.user_id === currentUser.id ? currentUser.email : shortId(member.user_id))}
                </span>
              </div>
            ))}
          </div>
          {/* Invitar por email */}
          <form onSubmit={inviteMember} className="mt-6 flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="Email del miembro"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              required
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50 transition-all"
            >
              {inviting ? 'Invitando...' : 'Invitar'}
            </button>
          </form>
        </div>

        {/* Balances */}
        <div className="bg-gradient-to-br from-white to-indigo-50 shadow-xl rounded-2xl p-6 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Balances</h2>
          {balances.length > 0 ? (
            <div className="space-y-3">
              {balances.map(b => {
                if (Math.abs(b.balance) < 0.01) {
                  return (
                    <div key={b.user_id} className="flex items-center justify-between text-gray-500">
                      <span className="font-semibold text-gray-700">{b.name}</span>
                      <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Saldado ✓</span>
                    </div>
                  )
                } else if (b.balance > 0) {
                  return (
                    <div key={b.user_id} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                      <span className="font-semibold text-gray-700">{b.name}</span>
                      <span className="text-green-700 font-bold text-lg">
                        le deben ${b.balance.toFixed(2)}
                      </span>
                    </div>
                  )
                } else {
                  // Si es el usuario actual y debe, ofrecer botón rápido para prellenar liquidación
                  const isCurrent = currentUser && b.user_id === currentUser.id
                  return (
                    <div key={b.user_id} className="flex items-center justify-between gap-3 bg-red-50 p-3 rounded-lg">
                      <span className="font-semibold text-gray-700">{b.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-red-700 font-bold text-lg">
                          debe ${Math.abs(b.balance).toFixed(2)}
                        </span>
                        {isCurrent && (
                          <button
                            onClick={() => {
                              // Elegir el mayor acreedor
                              const creditors = balances.filter(x => x.balance > 0).sort((a,b)=>b.balance - a.balance)
                              if (creditors.length === 0) {
                                alert('No hay a quién pagar ahora mismo')
                                return
                              }
                              const to = creditors[0]
                              const amount = Math.min(Math.abs(b.balance), to.balance)
                              setSettleFrom(b.user_id)
                              setSettleTo(to.user_id)
                              setSettleAmount(amount.toFixed(2))
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="text-xs px-3 py-1 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No hay balances todavía</p>
          )}

          {/* Liquidar deuda */}
          <div className="mt-6 border-t border-blue-200 pt-6">
            <h3 className="text-xl font-bold text-blue-700 mb-4">Liquidar deuda</h3>
            <form onSubmit={submitSettlement} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quién paga</label>
                <select value={settleFrom} onChange={(e) => setSettleFrom(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Seleccionar</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{displayNameFor(m.user_id)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">A quién</label>
                <select value={settleTo} onChange={(e) => setSettleTo(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Seleccionar</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{displayNameFor(m.user_id)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Monto</label>
                <input type="number" step="0.01" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="0.00"/>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={settling || !settleFrom || !settleTo || settleFrom === settleTo || (parseFloat(settleAmount) || 0) <= 0}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50 transition-all"
                >
                  {settling ? 'Registrando...' : 'Liquidar'}
                </button>
              </div>
            </form>

            {/* Nota rápida si falta la tabla */}
            {settlements.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">Si aún no configuraste la tabla de liquidaciones, al intentar registrar verás un aviso con pasos para crearla.</p>
            )}

            {/* Historial de liquidaciones */}
            {settlements.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-medium mb-2">Historial de liquidaciones</h4>
                <ul className="divide-y">
                  {settlements.slice(0, 10).map(s => (
                    <li key={s.id} className="py-2 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{displayNameFor(s.from_user_id)}</span>
                        <span> pagó </span>
                        <span className="font-medium">${s.amount.toFixed(2)}</span>
                        <span> a </span>
                        <span className="font-medium">{displayNameFor(s.to_user_id)}</span>
                        <span className="text-gray-500"> — {new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                      <button onClick={() => deleteSettlement(s.id)} className="text-xs text-red-600 hover:text-red-800">Eliminar</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Botón para añadir gasto */}
        <div className="bg-gradient-to-br from-white to-green-50 shadow-xl rounded-2xl p-6 border border-green-100">
          {!showExpenseForm ? (
            <button
              onClick={() => setShowExpenseForm(true)}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold rounded-lg shadow-md hover:from-green-700 hover:to-teal-600 transition-all"
            >
              + Añadir Gasto
            </button>
          ) : (
            <form onSubmit={createExpense} className="space-y-4">
              <h2 className="text-2xl font-bold text-green-700">Nuevo Gasto</h2>
              
              <input
                type="text"
                placeholder="Descripción del gasto"
                value={newExpenseDesc}
                onChange={e => setNewExpenseDesc(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                required
              />
              
              <input
                type="number"
                step="0.01"
                placeholder="Monto"
                value={newExpenseAmount}
                onChange={e => setNewExpenseAmount(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Quién pagó?
                </label>
                <div className="space-y-2">
                  {members.map(member => {
                    const memberName = member.profiles?.full_name || (currentUser && member.user_id === currentUser.id ? currentUser.email : shortId(member.user_id))
                    return (
                      <label key={member.user_id} className="flex items-center">
                        <input
                          type="radio"
                          name="paidBy"
                          value={member.user_id}
                          checked={paidBy === member.user_id}
                          onChange={(e) => setPaidBy(e.target.value)}
                          className="mr-2"
                        />
                        <span>{memberName}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Cómo dividir?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="splitType"
                      value="equal"
                      checked={splitType === 'equal'}
                      onChange={() => setSplitType('equal')}
                      className="mr-2"
                    />
                    <span>Quien pagó — dividir entre todos por igual</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="splitType"
                      value="full"
                      checked={splitType === 'full'}
                      onChange={() => setSplitType('full')}
                      className="mr-2"
                    />
                    <span>Quien pagó es adeudado el monto total (los demás deben todo)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="splitType"
                      value="custom"
                      checked={splitType === 'custom'}
                      onChange={() => setSplitType('custom')}
                      className="mr-2"
                    />
                    <span>Montos personalizados</span>
                  </label>
                </div>
              </div>

              {splitType === 'custom' && (
                <div className="border rounded p-3 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2">Ingresa los montos para cada persona (deben sumar el total)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {members.map(m => (
                      <div key={m.user_id} className="flex items-center justify-between gap-2">
                        <span className="text-sm">{displayNameFor(m.user_id)}</span>
                        <input
                          type="number"
                          step="0.01"
                          value={customSplitsCreate[m.user_id] ?? ''}
                          onChange={e => setCustomSplitsCreate(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                          className="w-32 p-2 border rounded"
                          placeholder="0.00"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold rounded-lg hover:from-green-700 hover:to-teal-600 transition-all"
                >
                  Crear Gasto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseForm(false)
                    setNewExpenseDesc('')
                    setNewExpenseAmount('')
                    setPaidBy('')
                    setSplitType('equal')
                  }}
                  className="flex-1 py-3 bg-gray-200 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Lista de gastos */}
        <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-700 mb-6">Gastos</h2>
          {expenses.length > 0 ? (
            <div className="space-y-4">
              {expenses.map(expense => (
                <div key={expense.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-lg text-gray-800">{expense.description}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Pagado por <span className="font-semibold">{expense.profiles?.full_name || (currentUser && expense.paid_by === currentUser.id ? currentUser.email : shortId(expense.paid_by))}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(expense.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xl font-extrabold text-blue-700">${expense.amount.toFixed(2)}</p>
                      <button
                        onClick={() => startEdit(expense)}
                        className="text-sm px-3 py-1 bg-blue-200 hover:bg-blue-300 rounded-lg transition-colors"
                        title="Editar gasto"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => toggleExpand(expense.id)}
                        className="text-sm px-3 py-1 bg-indigo-200 text-indigo-800 hover:bg-indigo-300 rounded-lg transition-colors font-semibold"
                      >
                        {expanded.has(expense.id) ? 'Ocultar' : 'Ver detalles'}
                      </button>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-sm px-3 py-1 bg-red-200 hover:bg-red-300 rounded-lg transition-colors"
                        title="Eliminar gasto"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {/* Editor inline */}
                  {editingId === expense.id && (
                    <form onSubmit={(e)=>saveEdit(expense.id, e)} className="mt-3 space-y-3 bg-gray-50 rounded p-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editDesc}
                          onChange={e=>setEditDesc(e.target.value)}
                          className="p-2 border rounded"
                          placeholder="Descripción"
                          required
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={e=>setEditAmount(e.target.value)}
                          className="p-2 border rounded"
                          placeholder="Monto"
                          required
                        />
                        <select value={editPaidBy} onChange={e=>setEditPaidBy(e.target.value)} className="p-2 border rounded">
                          <option value="">¿Quién pagó?</option>
                          {members.map(m => (
                            <option key={m.user_id} value={m.user_id}>{displayNameFor(m.user_id)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="flex gap-4 flex-wrap text-sm">
                          <label className="flex items-center gap-1">
                            <input type="radio" name={`editSplitType-${expense.id}`} value="equal" checked={editSplitType==='equal'} onChange={()=>setEditSplitType('equal')} />
                            Igualitario
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="radio" name={`editSplitType-${expense.id}`} value="full" checked={editSplitType==='full'} onChange={()=>setEditSplitType('full')} />
                            Full al pagador
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="radio" name={`editSplitType-${expense.id}`} value="custom" checked={editSplitType==='custom'} onChange={()=>setEditSplitType('custom')} />
                            Personalizado
                          </label>
                        </div>
                        {editSplitType==='custom' && (
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {members.map(m => (
                              <div key={m.user_id} className="flex items-center justify-between gap-2">
                                <span className="text-sm">{displayNameFor(m.user_id)}</span>
                                <input type="number" step="0.01" value={editCustomSplits[m.user_id] ?? ''} onChange={e=>setEditCustomSplits(prev=>({...prev, [m.user_id]: e.target.value}))} className="w-32 p-2 border rounded" placeholder="0.00"/>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Guardar</button>
                        <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                      </div>
                    </form>
                  )}
                  {expanded.has(expense.id) && (
                    <div className="mt-3 bg-gray-50 rounded p-3">
                      <p className="text-sm text-gray-600 mb-2">División de este gasto</p>
                      <ul className="space-y-1">
                        {members.map(m => {
                          const split = splits.find(s => s.expense_id === expense.id && s.user_id === m.user_id)
                          const amount = split ? split.amount : 0
                          const name = displayNameFor(m.user_id)
                          return (
                            <li key={m.user_id} className="flex items-center justify-between text-sm">
                              <span>{name}</span>
                              <span className={amount > 0 ? 'text-red-600' : 'text-gray-500'}>
                                {amount > 0 ? `debe $${amount.toFixed(2)}` : '(no debe)'}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No hay gastos todavía</p>
          )}
        </div>
      </div>
    </Layout>
  )
}
