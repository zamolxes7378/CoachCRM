import { useState, useMemo, useEffect } from 'react'
import { Euro, TrendingUp, TrendingDown, Minus, Users, User, UserPlus, Calendar, FileText, Hourglass, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Download, BarChart3, ArrowUpRight, ArrowDownRight, XCircle, X, PieChart, Sprout, UserCheck, Zap } from 'lucide-react'
import ClientTypeBadge from '../components/ClientTypeBadge'
import PaymentBadge from '../components/PaymentBadge'
import InvoiceBadge from '../components/InvoiceBadge'


import { useData } from '../context/DataContext'
import ClientDetailPage from './ClientDetailPage'
import { countClientsBySource, exportSponsorshipCSV } from '../services/sponsorshipService'
import { getClientName } from '../data/helpers'

const AbsenceDash = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '1em' }}>
    <Minus size={14} strokeWidth={3} style={{ color: 'var(--primary-300)' }} />
  </div>
)

const renderCell = (val) => val === '—' ? <AbsenceDash /> : val

const formatAmount = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0'
  return new Intl.NumberFormat('fr-FR').format(Math.round(val))
}

function getDefaultRate(clientId, clients, sessionRates) {
  const c = clients.find(x => x.id === clientId)
  if (!c) return sessionRates?.client || 75
  return c.sessionRate || (c.type === 'individual' ? sessionRates.individual : sessionRates.client) || 75
}

export default function FinancesPage() {
  const { clients, sessions: allSessions, recruitmentSources, sessionRates, getInvoiceForSession, settings, upsertSettings } = useData()
  const revenueObjectives = settings?.revenue_objectives || {}


  // Moved outside component if possible, but keeping it inside for now to access useData or passing params

  function getClientNameByContext(clientId) {
    const c = clients.find(x => x.id === clientId)
    if (!c) return '—'
    return getClientName(c)
  }

  function getClientType(clientId) {
    const c = clients.find(x => x.id === clientId)
    if (!c) return 'couple'
    const hasChildren = c.children && c.children.length > 0
    if (c.type === 'family' || hasChildren) return 'famille'
    if (c.type === 'individual' && !c.partnerB) return 'individuel'
    return 'couple'
  }

  function getClientSource(clientId) {
    const c = clients.find(x => x.id === clientId)
    if (!c || !c.source) return '—'
    const sTerm = c.source.toLowerCase().trim()
    const src = recruitmentSources.find(s =>
      s.key.toLowerCase() === sTerm ||
      s.label.toLowerCase() === sTerm
    )
    if (src) return src.label
    if (sTerm === 'referral') return 'Parrainage'
    if (sTerm === 'website') return 'Site web'
    if (sTerm === 'social') return 'Réseaux sociaux'
    if (sTerm === 'phone') return 'Téléphone'
    return c.source.charAt(0).toUpperCase() + c.source.slice(1)
  }

  function formatDate(d) {
    if (!d) return '—'
    try {
      const dt = new Date(d)
      if (isNaN(dt.getTime())) return 'Date invalide'
      return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    } catch (e) {
      return '—'
    }
  }

  const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const [modalClientId, setModalClientId] = useState(null)
  const [modalSessionId, setModalSessionId] = useState(null)
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  // Current objective for the specific month/year
  const objectifCA = useMemo(() => {
    const yearObj = revenueObjectives[selectedYear] || {}
    // If we have a specific month value, use it. Otherwise fallback to a general year default if it exists (for backward compatibility)
    // or the global default of 2000.
    if (yearObj[selectedMonth] !== undefined) return yearObj[selectedMonth]
    if (typeof yearObj === 'number') return yearObj // legacy support
    return 2000
  }, [revenueObjectives, selectedYear, selectedMonth])

  const saveObjectifCA = async (newVal) => {
    const currentYearObjs = revenueObjectives[selectedYear] || {}
    const updatedYearObjs = typeof currentYearObjs === 'number'
      ? { [selectedMonth]: newVal } // converting legacy
      : { ...currentYearObjs, [selectedMonth]: newVal }

    await upsertSettings({
      ...settings,
      revenue_objectives: {
        ...revenueObjectives,
        [selectedYear]: updatedYearObjs
      }
    })
  }

  const [viewPeriod, setViewPeriod] = useState('month') // month, quarter, semester, year
  const [topModal, setTopModal] = useState(null) // 'ca' | 'referrals' | null
  const [expandedAlert, setExpandedAlert] = useState(null) // 'unpaid' | 'deferred' | 'invoices' | null
  const [exportFrom, setExportFrom] = useState(`${now.getFullYear()}-01-01`)
  const [exportTo, setExportTo] = useState(`${now.getFullYear()}-12-31`)

  // All sessions
  const sessions = useMemo(() => [...(allSessions || [])], [allSessions])

  // Helper: sessions in a given month/year
  const sessionsInMonth = (m, y) => sessions.filter(s => {
    const d = new Date(s.date)
    return d.getMonth() === m && d.getFullYear() === y
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  // Monthly stats calculator
  const monthlyStats = (m, y) => {
    const ms = sessionsInMonth(m, y)
    const completed = ms.filter(s => s.status === 'completed')
    const cancelled = ms.filter(s => s.status === 'cancelled')
    const scheduled = ms.filter(s => s.status === 'scheduled')

    // CA Réalisé inclut les sessions complétées ET les annulations facturées
    const billable = ms.filter(s => s.status === 'completed' || (s.status === 'cancelled' && s.paymentAmount > 0))
    const caRealise = Math.round(billable.reduce((sum, s) => sum + (s.paymentAmount || getDefaultRate(s.clientId, clients, sessionRates)), 0))
    const caPrev = Math.round(caRealise + scheduled.reduce((sum, s) => sum + getDefaultRate(s.clientId, clients, sessionRates), 0))
    const paid = billable.filter(s => s.paymentReceived && s.paymentMethod)
    const encaisse = Math.round(paid.reduce((sum, s) => sum + (s.paymentAmount || getDefaultRate(s.clientId, clients, sessionRates)), 0))

    // Nouveaux clients: 1ère séance de ce client est dans ce mois
    const clientIds = [...new Set(ms.map(s => s.clientId))]
    const nouveauxDates = {}
    const nouveaux = clientIds.filter(cid => {
      const allClientSessions = sessions.filter(s => s.clientId === cid && s.status !== 'cancelled').sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      if (allClientSessions.length === 0) return false
      const firstDate = allClientSessions[0].date
      const first = new Date(firstDate)
      if (first.getMonth() === m && first.getFullYear() === y) {
        nouveauxDates[cid] = firstDate
        return true
      }
      return false
    }).sort((a, b) => (nouveauxDates[a] || '').localeCompare(nouveauxDates[b] || ''))

    const panierMoyen = clientIds.length > 0 ? Math.round(caRealise / clientIds.length) : 0
    const txAnnulation = (completed.length + cancelled.length) > 0
      ? Math.round((cancelled.length / (completed.length + cancelled.length)) * 100)
      : 0

    return { completed, cancelled, scheduled, caRealise, caPrev, encaisse, nouveaux, nouveauxDates, panierMoyen, txAnnulation, clientIds, allSessions: ms, paid, billable }
  }

  const currentStats = useMemo(() => monthlyStats(selectedMonth, selectedYear), [selectedMonth, selectedYear, sessions])

  // Previous month for comparison
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear
  const prevStats = useMemo(() => monthlyStats(prevMonth, prevYear), [prevMonth, prevYear, sessions])

  // 12-month chart data
  const chartData = useMemo(() => {
    const data = []
    for (let i = 11; i >= 0; i--) {
      let m = now.getMonth() - i
      let y = now.getFullYear()
      if (m < 0) { m += 12; y-- }
      const stats = monthlyStats(m, y)
      data.push({ month: m, year: y, label: MONTHS_SHORT[m], ca: stats.caRealise, objectif: objectifCA, sessions: stats.completed.length })
    }
    return data
  }, [objectifCA, sessions])

  const maxCA = Math.max(...chartData.map(d => Math.max(d.ca, d.objectif)), 1)

  // Alerts
  const alerts = useMemo(() => {
    const isActuallyBillable = (s) => s.status === 'completed' || (s.status === 'cancelled' && s.paymentAmount > 0)
    const unpaid = sessions.filter(s => isActuallyBillable(s) && !s.paymentReceived && !s.paymentMethod)
    const deferred = sessions.filter(s => isActuallyBillable(s) && s.paymentMethod && !s.paymentReceived)
    const pendingInvoices = sessions.filter(s => { const inv = getInvoiceForSession(s.id); return inv && !inv.sent })
    return { unpaid, deferred, pendingInvoices }
  }, [sessions])

  // Trend indicator
  const TrendBadge = ({ current, previous, suffix = '', invert = false }) => {
    if (previous === 0 && current === 0) return <Minus size={10} style={{ color: 'var(--text-tertiary)' }} />
    const diff = previous > 0 ? Math.round(((current - previous) / previous) * 100) : (current > 0 ? 100 : 0)
    const isPositive = invert ? diff < 0 : diff > 0
    const color = diff === 0 ? 'var(--text-tertiary)' : isPositive ? 'var(--success)' : 'var(--error)'
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.643rem', fontWeight: 600, color }}>
        {diff > 0 ? <ArrowUpRight size={10} /> : diff < 0 ? <ArrowDownRight size={10} /> : <Minus size={10} />}
        {diff > 0 ? '+' : ''}{diff}%{suffix}
      </span>
    )
  }

  const MIN_YEAR = 2000
  const MAX_YEAR = now.getFullYear() + 3

  // Navigate months
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      if (selectedYear - 1 >= MIN_YEAR) { setSelectedMonth(11); setSelectedYear(selectedYear - 1) }
    } else setSelectedMonth(selectedMonth - 1)
  }
  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      if (selectedYear + 1 <= MAX_YEAR) { setSelectedMonth(0); setSelectedYear(selectedYear + 1) }
    } else setSelectedMonth(selectedMonth + 1)
  }
  const goToPrevYear = () => { if (selectedYear - 1 >= MIN_YEAR) setSelectedYear(selectedYear - 1) }
  const goToNextYear = () => { if (selectedYear + 1 <= MAX_YEAR) setSelectedYear(selectedYear + 1) }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Euro size={22} style={{ color: 'var(--primary-500)' }} />
            Suivi financier
          </h2>
          <p style={{ fontSize: '0.857rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Tableau de bord consolidé de votre activité
          </p>
        </div>
      </div>

      {(() => {
        const currentYear = now.getFullYear()

        // Yearly stats
        const yearStats = (y) => {
          const ys = sessions.filter(s => new Date(s.date).getFullYear() === y)
          const completed = ys.filter(s => s.status === 'completed')
          const cancelled = ys.filter(s => s.status === 'cancelled')
          const scheduled = ys.filter(s => s.status === 'scheduled')

          const billable = ys.filter(s => s.status === 'completed' || (s.status === 'cancelled' && s.paymentAmount > 0))
          const ca = Math.round(billable.reduce((sum, s) => sum + (s.paymentAmount || getDefaultRate(s.clientId, clients, sessionRates)), 0))
          const caPlanned = Math.round(ca + scheduled.reduce((sum, s) => sum + getDefaultRate(s.clientId, clients, sessionRates), 0))
          const clientIds = [...new Set(ys.filter(s => s.status !== 'cancelled').map(s => s.clientId))]
          const newClients = clientIds.filter(cid => {
            const all = sessions.filter(s => s.clientId === cid && s.status !== 'cancelled').sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            return all.length > 0 && all[0].date && new Date(all[0].date).getFullYear() === y
          })
          const paid = billable.filter(s => s.paymentReceived && s.paymentMethod)
          const encaisse = Math.round(paid.reduce((sum, s) => sum + (s.paymentAmount || getDefaultRate(s.clientId, clients, sessionRates)), 0))
          const txAnnulation = (completed.length + cancelled.length) > 0
            ? Math.round((cancelled.length / (completed.length + cancelled.length)) * 100) : 0

          // YTD (Year-To-Date) logic for accurate prorata comparison
          const nowMonth = now.getMonth()
          const nowDate = now.getDate()
          const isYTD = (s) => {
            const d = new Date(s.date)
            if (d.getMonth() < nowMonth) return true
            if (d.getMonth() === nowMonth && d.getDate() <= nowDate) return true
            return false
          }
          
          const ysYTD = ys.filter(isYTD)
          const completedYTD = ysYTD.filter(s => s.status === 'completed')
          const billableYTD = ysYTD.filter(s => s.status === 'completed' || (s.status === 'cancelled' && s.paymentAmount > 0))
          const caYTD = Math.round(billableYTD.reduce((sum, s) => sum + (s.paymentAmount || getDefaultRate(s.clientId, clients, sessionRates)), 0))
          const clientIdsYTD = [...new Set(ysYTD.filter(s => s.status !== 'cancelled').map(s => s.clientId))]
          const newClientsYTD = clientIdsYTD.filter(cid => {
            const all = sessions.filter(s => s.clientId === cid && s.status !== 'cancelled').sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            return all.length > 0 && all[0].date && new Date(all[0].date).getFullYear() === y && isYTD(all[0])
          })

          return { ca, caPlanned, completed, cancelled, scheduled, clientIds, newClients, encaisse, txAnnulation, allSessions: ys, billable, caYTD, completedYTD, clientIdsYTD, newClientsYTD }
        }

        // Monthly breakdown for a year
        const monthlyBreakdown = (y) => Array.from({ length: 12 }, (_, m) => {
          const ms = sessions.filter(s => { const d = new Date(s.date); return d.getMonth() === m && d.getFullYear() === y })
          const billable = ms.filter(s => s.status === 'completed' || (s.status === 'cancelled' && s.paymentAmount > 0))
          const completed = ms.filter(s => s.status === 'completed')
          const scheduled = ms.filter(s => s.status === 'scheduled')
          const ca = Math.round(billable.reduce((sum, s) => sum + (s.paymentAmount || getDefaultRate(s.clientId, clients, sessionRates)), 0))
          const caPlanned = Math.round(scheduled.reduce((sum, s) => sum + getDefaultRate(s.clientId, clients, sessionRates), 0))
          return { month: m, ca, caPlanned, sessions: completed.length }
        })

        const selYearStats = yearStats(selectedYear)
        const prevYearStats = yearStats(selectedYear - 1)
        const selMonthly = monthlyBreakdown(selectedYear)
        const prevMonthly = monthlyBreakdown(selectedYear - 1)
        const maxMonthlyCA = Math.max(...selMonthly.map(m => m.ca + m.caPlanned), ...prevMonthly.map(m => m.ca), objectifCA, 1) * 1.15
        const objH = maxMonthlyCA > 0 ? (objectifCA / maxMonthlyCA) * 100 : 0

        // Next year projection
        const activeMonths = selMonthly.filter(m => m.ca > 0).length || 1
        const avgMonthlyCA = Math.round(selYearStats.ca / activeMonths)
        const projectedNextYear = avgMonthlyCA * 12

        return (
          <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <span style={{ fontSize: '0.857rem', fontWeight: 700, color: 'var(--text-primary)' }}>Vue consolidée annuelle</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={goToPrevYear} disabled={selectedYear <= MIN_YEAR} style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '4px', cursor: selectedYear <= MIN_YEAR ? 'not-allowed' : 'pointer', display: 'flex', opacity: selectedYear <= MIN_YEAR ? 0.3 : 1 }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 60, textAlign: 'center' }}>
                  {selectedYear}
                </span>
                <button onClick={goToNextYear} disabled={selectedYear >= MAX_YEAR} style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '4px', cursor: selectedYear >= MAX_YEAR ? 'not-allowed' : 'pointer', display: 'flex', opacity: selectedYear >= MAX_YEAR ? 0.3 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Annual KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              {[
                { label: 'CA réalisé', value: `${formatAmount(selYearStats.ca)}€`, prev: selectedYear === currentYear ? prevYearStats.caYTD : prevYearStats.ca, current: selectedYear === currentYear ? selYearStats.caYTD : selYearStats.ca, color: '#2A4365', icon: Euro },
                { label: 'CA planifié', value: `${formatAmount(selYearStats.caPlanned)}€`, prev: prevYearStats.caPlanned, current: selYearStats.caPlanned, color: 'var(--primary-600)', icon: TrendingUp, hideTrend: true },
                { label: 'Séances', value: selYearStats.completed.length, prev: selectedYear === currentYear ? prevYearStats.completedYTD.length : prevYearStats.completed.length, current: selectedYear === currentYear ? selYearStats.completedYTD.length : selYearStats.completed.length, color: '#2B6CB0', icon: Calendar },
                { label: 'Clients actifs', value: selYearStats.clientIds.length, prev: selectedYear === currentYear ? prevYearStats.clientIdsYTD.length : prevYearStats.clientIds.length, current: selectedYear === currentYear ? selYearStats.clientIdsYTD.length : selYearStats.clientIds.length, color: '#805AD5', icon: Users },
                { label: 'Nouveaux clients', value: selYearStats.newClients.length, prev: selectedYear === currentYear ? prevYearStats.newClientsYTD.length : prevYearStats.newClients.length, current: selectedYear === currentYear ? selYearStats.newClientsYTD.length : selYearStats.newClients.length, color: '#805AD5', icon: UserPlus },
                { label: 'Moy./mois', value: `${formatAmount(avgMonthlyCA)}€`, prev: prevYearStats.ca > 0 ? Math.round(prevYearStats.ca / (prevMonthly.filter(m => m.ca > 0).length || 1)) : 0, current: avgMonthlyCA, color: '#D69E2E', icon: BarChart3 },
              ].map((k, i) => (
                <div key={i} style={{ textAlign: 'center', padding: 'var(--space-xs)', borderRadius: 'var(--radius-md)', background: '#FAFAFA', border: '1px solid var(--border-light)' }}>
                  <k.icon size={20} style={{ color: k.color, marginBottom: 2 }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    {k.value}
                    {!k.hideTrend && <TrendBadge current={k.current} previous={k.prev} />}
                  </div>
                  <div style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Comparative bar chart: selected year vs previous */}
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#58718E' }} /> {selectedYear}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#CBD5E0', opacity: 0.6 }} /> {selectedYear - 1}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#E3F2FD' }} /> CA planifié
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ width: 10, height: 2, background: '#D69E2E', borderRadius: 1, borderTop: '1px dashed #D69E2E' }} /> Objectif ({formatAmount(objectifCA)}€)
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, position: 'relative' }}>
                {/* Objective line */}
                <div style={{ position: 'absolute', bottom: `${objH}%`, left: 0, right: 0, height: 0, borderTop: '2px dashed #D69E2E', opacity: 0.5, zIndex: 2 }} />
                {MONTHS_SHORT.map((label, m) => {
                  const selCA = selMonthly[m].ca
                  const selPlanned = selMonthly[m].caPlanned
                  const prevCA = prevMonthly[m].ca
                  const totalSelH = maxMonthlyCA > 0 ? ((selCA + selPlanned) / maxMonthlyCA) * 100 : 0
                  const selH = maxMonthlyCA > 0 ? (selCA / maxMonthlyCA) * 100 : 0
                  const plannedH = maxMonthlyCA > 0 ? (selPlanned / maxMonthlyCA) * 100 : 0
                  const prevH = maxMonthlyCA > 0 ? (prevCA / maxMonthlyCA) * 100 : 0
                  const isFuture = selectedYear === currentYear && m > now.getMonth()
                  const isSelected = m === selectedMonth && selectedYear === selectedYear
                  return (
                    <div key={m}
                      onClick={() => setSelectedMonth(m)}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                    >
                      <div style={{ width: '100%', height: 120, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, position: 'relative' }}>
                        {/* CA label on hover/selected */}
                        {isSelected && (selCA > 0 || selPlanned > 0) && (
                          <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: '0.714rem', fontWeight: 700, color: 'var(--primary-700)', whiteSpace: 'nowrap', zIndex: 5, background: 'white', padding: '1px 6px', borderRadius: 'var(--radius-sm)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                            {formatAmount(selCA)}{selPlanned > 0 ? `+${formatAmount(selPlanned)}` : ''}€
                            {prevCA > 0 && <span style={{ fontSize: '0.571rem', fontWeight: 500, color: '#999', marginLeft: 4 }}>({formatAmount(prevCA)}€)</span>}
                          </div>
                        )}
                        {/* Current year bar — stacked: completed + planned */}
                        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', outline: isSelected ? '2px solid var(--primary-700)' : 'none', outlineOffset: 1, borderRadius: '3px 3px 0 0', height: Math.max((totalSelH / 100) * 120, 1) }}>
                          {/* Planned CA (top, light blue) */}
                          {selPlanned > 0 && (
                            <div style={{
                              height: Math.max((plannedH / 100) * 120, 3),
                              background: '#E3F2FD', borderRadius: '3px 3px 0 0',
                              transition: 'height 0.3s'
                            }} title={`Planifié: ${selPlanned}€`} />
                          )}
                          {/* Completed CA (bottom) */}
                          <div style={{
                            flex: 1, minHeight: selCA > 0 ? 2 : 0,
                            background: isFuture ? '#E2E8F0' : selCA >= objectifCA ? 'linear-gradient(180deg, #718096, #58718E)' : '#58718E',
                            opacity: isFuture ? 0.4 : 1,
                            borderRadius: selPlanned > 0 ? '0' : '3px 3px 0 0',
                            transition: 'height 0.3s'
                          }} title={`${selectedYear}: ${selCA}€`} />
                        </div>
                        {/* Previous year bar */}
                        <div style={{
                          width: '45%',
                          height: Math.max((prevH / 100) * 120, prevCA > 0 ? 2 : 0),
                          background: '#CBD5E0',
                          opacity: 0.5,
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s'
                        }} title={`${selectedYear - 1}: ${prevCA}€`} />
                      </div>
                      <span style={{ fontSize: '0.5rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary-700)' : 'var(--text-tertiary)' }}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Liens Top Clients & Parrainages */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
              <span
                onClick={() => setTopModal('ca')}
                style={{ fontSize: '0.643rem', fontWeight: 600, color: 'var(--primary-500)', cursor: 'pointer', borderBottom: '1px dashed var(--primary-300)' }}
              >
                🏆 Top Clients CA {selectedYear}
              </span>
              <span
                onClick={() => setTopModal('referrals')}
                style={{ fontSize: '0.643rem', fontWeight: 600, color: '#805AD5', cursor: 'pointer', borderBottom: '1px dashed #D6BCFA' }}
              >
                🤝 Top Parrains {selectedYear}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                <span style={{ fontWeight: 600 }}>Objectif/mois :</span>
                <input
                  type="number" min="0" step="100"
                  defaultValue={objectifCA}
                  key={`${selectedYear}-${selectedMonth}-${objectifCA}`} // force refresh when period/data changes
                  onBlur={e => saveObjectifCA(Number(e.target.value))}
                  onKeyDown={e => { if (e.key === 'Enter') saveObjectifCA(Number(e.target.value)) }}
                  className="input"
                  style={{ fontSize: '0.714rem', fontWeight: 700, textAlign: 'center', width: 70, padding: '2px 4px' }}
                />
                <span style={{ fontWeight: 600 }}>€</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Source Performance Widget + Parrainage Widget — Moved Up */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        {/* Source Performance */}
        {(() => {
          const sourceCounts = countClientsBySource(clients, selectedYear, recruitmentSources)
          const sourceLabels = {}
          recruitmentSources.forEach(s => { sourceLabels[s.key] = s.label })
          sourceLabels['unknown'] = 'Non renseigné'
          const entries = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])
          const maxCount = entries.length > 0 ? entries[0][1] : 1
          const totalClients = entries.reduce((sum, [, count]) => sum + count, 0)
          return (
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-md)' }}>
                <PieChart size={16} style={{ color: 'var(--primary-500)' }} />
                <span style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-primary)' }}>Canaux d'acquisition</span>
                <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{selectedYear} · {totalClients} client{totalClients > 1 ? 's' : ''}</span>
              </div>
              {entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-tertiary)', fontSize: '0.786rem' }}>Aucune donnée</div>
              ) : entries.map(([key, count]) => {
                const pct = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: 90, textAlign: 'right' }}>
                      {sourceLabels[key] || key}
                    </span>
                    <div style={{ flex: 1, height: 14, background: '#F0F0F0', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 'var(--radius-sm)',
                        background: '#A0AEC0',
                        width: `${(count / maxCount) * 100}%`,
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.786rem', fontWeight: 700, color: '#A0AEC0', minWidth: 24, textAlign: 'right' }}>{count}</span>
                    <span style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--text-tertiary)', minWidth: 28 }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Répartition par type de client */}
        {(() => {
          const activeClients = clients.filter(c => {
            const clientSessions = sessions.filter(s => s.clientId === c.id && s.status !== 'cancelled' && new Date(s.date).getFullYear() === selectedYear)
            return clientSessions.length > 0
          })
          const typeCounts = { couple: 0, individuel: 0, famille: 0 }
          activeClients.forEach(c => {
            const t = getClientType(c.id)
            if (typeCounts[t] !== undefined) typeCounts[t]++
            else typeCounts.couple++
          })
          const typeConfig = [
            { key: 'couple', label: 'Couple', color: '#EC4899', bg: '#FBCFE8' },
            { key: 'individuel', label: 'Individuel', color: '#6366F1', bg: '#C7D2FE' },
            { key: 'famille', label: 'Famille', color: '#F59E0B', bg: '#FDE68A' },
          ]
          const totalTypes = Object.values(typeCounts).reduce((s, v) => s + v, 0)
          const maxTypeCount = Math.max(...Object.values(typeCounts), 1)
          return (
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-md)' }}>
                <Users size={16} style={{ color: 'var(--primary-500)' }} />
                <span style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-primary)' }}>Types de clients</span>
                <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{selectedYear} · {totalTypes} client{totalTypes > 1 ? 's' : ''}</span>
              </div>
              {totalTypes === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-tertiary)', fontSize: '0.786rem' }}>Aucune donnée</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-xs)' }}>
                  {/* The Donut Chart */}
                  <div style={{
                    width: 100, height: 100, borderRadius: '50%', flexShrink: 0,
                    background: `conic-gradient(${(() => {
                      let current = 0
                      return typeConfig.map(config => {
                        const count = typeCounts[config.key]
                        const pct = totalTypes > 0 ? (count / totalTypes) * 100 : 0
                        if (pct === 0) return null
                        const start = current
                        current += pct
                        return `${config.bg} ${start}% ${current}%`
                      }).filter(Boolean).join(', ')
                    })()})`,
                    position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--border-light)',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02)'
                  }}>
                    {/* Inner hole for donut effect */}
                    <div style={{ width: '60%', height: '60%', background: 'white', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
                  </div>

                  {/* Legend */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {typeConfig.map(({ key, label, color, bg }) => {
                      const count = typeCounts[key]
                      const pct = totalTypes > 0 ? Math.round((count / totalTypes) * 100) : 0
                      if (count === 0) return null
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '3px', background: bg, border: `1px solid ${color}40` }} />
                          <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
                          <span style={{ fontSize: '0.786rem', fontWeight: 700, color: color }}>{count}</span>
                          <span style={{ fontSize: '0.643rem', fontWeight: 600, color: 'var(--text-tertiary)', minWidth: 28 }}>{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Zone 3 — Détail mensuel (KPIs + Tableau) */}
      <div className="card" style={{ padding: 'var(--space-md)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <span style={{ fontSize: '0.857rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Vue détaillée — {MONTHS_FR[selectedMonth]} {selectedYear}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={goToPrevMonth} disabled={selectedYear <= MIN_YEAR && selectedMonth === 0} style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '4px', cursor: selectedYear <= MIN_YEAR && selectedMonth === 0 ? 'not-allowed' : 'pointer', display: 'flex', opacity: selectedYear <= MIN_YEAR && selectedMonth === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 100, textAlign: 'center' }}>
              {MONTHS_FR[selectedMonth]} {selectedYear}
            </span>
            <button onClick={goToNextMonth} disabled={selectedYear >= MAX_YEAR && selectedMonth === 11} style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '4px', cursor: selectedYear >= MAX_YEAR && selectedMonth === 11 ? 'not-allowed' : 'pointer', display: 'flex', opacity: selectedYear >= MAX_YEAR && selectedMonth === 11 ? 0.3 : 1 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* KPIs mensuels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          {[
            { label: 'CA réalisé', value: `${formatAmount(currentStats.caRealise)}€`, prev: prevStats.caRealise, current: currentStats.caRealise, color: '#2A4365', icon: Euro },
            { label: 'CA planifié', value: `${formatAmount(currentStats.caPrev)}€`, prev: prevStats.caPrev, current: currentStats.caPrev, color: 'var(--primary-600)', icon: TrendingUp, hideTrend: true },
            { label: 'Séances', value: null, customRender: true, color: '#2B6CB0', icon: Calendar },
            { label: 'Nouveaux clients', value: currentStats.nouveaux.length, prev: prevStats.nouveaux.length, current: currentStats.nouveaux.length, color: '#805AD5', icon: UserPlus },
            { label: 'Panier moyen', value: `${formatAmount(currentStats.panierMoyen)}€`, prev: prevStats.panierMoyen, current: currentStats.panierMoyen, color: '#D69E2E', icon: BarChart3 },
            { label: 'Taux encaissement', value: `${currentStats.caRealise > 0 ? Math.round((currentStats.encaisse / currentStats.caRealise) * 100) : 0}%`, prev: prevStats.caRealise > 0 ? Math.round((prevStats.encaisse / prevStats.caRealise) * 100) : 0, current: currentStats.caRealise > 0 ? Math.round((currentStats.encaisse / currentStats.caRealise) * 100) : 0, color: currentStats.caRealise > 0 && currentStats.encaisse >= currentStats.caRealise ? '#2A4365' : '#D69E2E', icon: Download },
            { label: 'Taux annulation', value: `${currentStats.txAnnulation}%`, prev: prevStats.txAnnulation, current: currentStats.txAnnulation, color: 'var(--error)', icon: XCircle, invert: true },
          ].map((kpi, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 'var(--space-xs)', borderRadius: 'var(--radius-md)', background: '#FAFAFA', border: '1px solid var(--border-light)' }}>
              <kpi.icon size={20} style={{ color: kpi.color, marginBottom: 2 }} />
              {kpi.customRender ? (
                <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <span style={{ color: '#2A4365' }}>{currentStats.completed.length}</span>
                  {currentStats.scheduled.length > 0 && (
                    <>
                      <span style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>+</span>
                      <span style={{ color: 'var(--primary-500)' }}>{currentStats.scheduled.length}</span>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  {kpi.value}
                  {!kpi.hideTrend && <TrendBadge current={kpi.current} previous={kpi.prev} invert={kpi.invert} />}
                </div>
              )}
              <div style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table-standard">
            <thead>
              <tr>
                {['Date', 'Type', 'Client', 'Source', 'Statut', 'Montant', 'Paiement', 'Encaissé', 'Facture'].map(h => (
                  <th key={h} style={{ textAlign: ['Date', 'Client'].includes(h) ? 'left' : 'center' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentStats.allSessions.map(s => {
                const isCancelled = s.status === 'cancelled'
                const isScheduled = s.status === 'scheduled'
                const isToConfirm = s.isToConfirm
                const isConfirmed = s.isConfirmed
                const isPaid = s.paymentReceived

                return (
                  <tr key={s.id} style={{
                    borderBottom: '1px solid var(--border-light)',
                    opacity: isCancelled ? 0.5 : isToConfirm ? 0.9 : 1,
                    background: isCancelled ? '#FFF5F5' : 'transparent',
                    transition: 'background 0.1s'
                  }}
                    onMouseEnter={e => { if (!isCancelled) e.currentTarget.style.background = 'var(--primary-50)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isCancelled ? '#FFF5F5' : 'transparent' }}
                  >
                    <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{renderCell(formatDate(s.date))}</td>
                    <td style={{ textAlign: 'center' }}>
                      {(() => {
                        const cType = getClientType(s.clientId)
                        return <ClientTypeBadge type={cType} size={28} />
                      })()}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span
                        onClick={() => { setModalClientId(s.clientId); setModalSessionId(s.id) }}
                        style={{
                          cursor: 'pointer',
                          color: 'var(--primary-600)',
                          textDecoration: 'none',
                          borderBottom: '1px dashed var(--primary-300)',
                          maxWidth: '300px',
                          display: 'inline-block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'bottom'
                        }}
                        onMouseEnter={e => e.target.style.color = 'var(--primary-800)'}
                        onMouseLeave={e => e.target.style.color = 'var(--primary-600)'}
                        title={getClientNameByContext(s.clientId)}
                      >
                        {renderCell(getClientNameByContext(s.clientId))}
                      </span>
                      {(() => {
                        const clientSessions = sessions.filter(cs => cs.clientId === s.clientId && cs.status !== 'cancelled').sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                        return clientSessions.length > 0 && clientSessions[0].id === s.id ? (
                          <span style={{ fontSize: '0.643rem', fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: '#FAF5FF', color: '#805AD5', marginLeft: 6 }}>1er RDV</span>
                        ) : null
                      })()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>{renderCell(getClientSource(s.clientId))}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.643rem', fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                        background: isCancelled ? '#FED7D7' : isToConfirm ? '#FFFBEB' : isScheduled ? '#F0F0F0' : 'transparent',
                        color: isCancelled ? 'var(--error)' : isToConfirm ? '#D97706' : isScheduled ? 'var(--text-tertiary)' : 'var(--success)'
                      }}>
                        {isCancelled ? (s.paymentAmount > 0 ? 'Annulation facturée' : 'Annulée') : isToConfirm ? 'À confirmer' : isScheduled ? 'Planifiée' : 'Réalisée'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: isPaid ? 'var(--text-primary)' : (isScheduled && !isToConfirm ? 'var(--text-tertiary)' : 'var(--error)') }}>
                      {s.paymentAmount === 0 ? <AbsenceDash /> : `${formatAmount(s.paymentAmount ?? getDefaultRate(s.clientId, clients, sessionRates))}€`}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {s.paymentMethod ? (
                        <PaymentBadge method={s.paymentMethod} received={isPaid} size="sm" />
                      ) : (
                        <AbsenceDash />
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {(isScheduled || isToConfirm || (isCancelled && !s.paymentAmount) || s.paymentAmount === 0) ? <AbsenceDash /> : isPaid ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#C6F6D5', color: '#2A4365', fontSize: '0.714rem', fontWeight: 700 }} title="Encaissé">€</div>
                      ) : (
                        <Hourglass size={14} style={{ color: 'var(--error)' }} title="En attente d'encaissement" />
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {(() => {
                        const inv = getInvoiceForSession(s.id); return inv ? (
                          <InvoiceBadge sent={inv.sent} />
                        ) : <AbsenceDash />
                      })()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Totals */}
            <tfoot>
              <tr style={{ background: 'var(--primary-50)', borderTop: '2px solid var(--primary-100)' }}>
                <td colSpan={5} style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.786rem' }}>
                  Total — {MONTHS_FR[selectedMonth]}
                </td>
                <td style={{ fontWeight: 800, color: '#2A4365', fontSize: '0.857rem' }}>
                  {formatAmount(currentStats.caRealise)}€
                </td>
                <td colSpan={2} style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>
                  {currentStats.paid.length}/{currentStats.billable.length} encaissé{currentStats.paid.length > 1 ? 's' : ''}
                </td>
                <td style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  {currentStats.allSessions.filter(s => !!getInvoiceForSession(s.id)).length} facture{currentStats.allSessions.filter(s => !!getInvoiceForSession(s.id)).length > 1 ? 's' : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>




      {/* Export section — moved to bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        {/* Export clients */}
        <div className="card" style={{ padding: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-sm)' }}>
            <Download size={16} style={{ color: 'var(--primary-500)' }} />
            <span style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-primary)' }}>Export suivi financier</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Du</label>
            <input
              type="date"
              className="input"
              value={exportFrom}
              onChange={e => setExportFrom(e.target.value)}
              style={{ fontSize: '0.714rem', fontFamily: 'inherit', padding: '4px 8px', width: 130 }}
            />
            <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Au</label>
            <input
              type="date"
              className="input"
              value={exportTo}
              onChange={e => setExportTo(e.target.value)}
              style={{ fontSize: '0.714rem', fontFamily: 'inherit', padding: '4px 8px', width: 130 }}
            />
          </div>
          <button
            onClick={() => {
              const filtered = sessions.filter(s => {
                const d = s.date
                return d >= exportFrom && d <= exportTo
              })
              const rows = [
                ['Date', 'Client', 'Type', 'Statut', 'Montant', 'Paiement', 'Encaissé', 'Facture'],
                ...[...filtered].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(s => [
                  formatDate(s.date),
                  getClientNameByContext(s.clientId),
                  getClientType(s.clientId),
                  s.status === 'cancelled' ? 'Annulée' : s.isToConfirm ? 'À confirmer' : s.status === 'scheduled' ? 'Planifiée' : 'Réalisée',
                  s.paymentAmount || getDefaultRate(s.clientId, clients, sessionRates),
                  s.paymentMethod ? { cheque: 'Chèque', virement: 'Virement', especes: 'Espèces' }[s.paymentMethod] || '' : '',
                  s.paymentReceived ? 'Oui' : 'Non',
                  (() => { const inv = getInvoiceForSession(s.id); return inv ? (inv.sent ? 'Émise' : 'À émettre') : '' })()
                ])
              ]
              const csv = rows.map(r => r.join(';')).join('\n')
              const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `suivi_financier_${exportFrom}_${exportTo}.csv`
              a.click(); URL.revokeObjectURL(url)
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', padding: '8px 16px' }}
          >
            <Download size={14} /> Exporter
          </button>
        </div>

        {/* Export CSV Parrainages */}
        <div className="card" style={{ padding: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-sm)' }}>
            <Download size={16} style={{ color: 'var(--primary-500)' }} />
            <span style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-primary)' }}>Export Parrainages</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.714rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Du</label>
            <input
              type="date"
              value={exportFrom}
              onChange={e => setExportFrom(e.target.value)}
              className="input"
              style={{ fontSize: '0.714rem', padding: '4px 8px', width: 130 }}
            />
            <label style={{ fontSize: '0.714rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Au</label>
            <input
              type="date"
              value={exportTo}
              onChange={e => setExportTo(e.target.value)}
              className="input"
              style={{ fontSize: '0.714rem', padding: '4px 8px', width: 130 }}
            />
          </div>
          <button
            onClick={() => {
              const csv = exportSponsorshipCSV(clients, getClientName, { startDate: exportFrom, endDate: exportTo })
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `parrainages_${exportFrom}_${exportTo}.csv`
              a.click(); URL.revokeObjectURL(url)
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', padding: '8px 16px' }}
          >
            <Download size={14} /> Exporter
          </button>
        </div>
      </div>


      {/* Modal — Client Detail */}
      {/* Top Modal */}
      {topModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setTopModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', width: 520, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {topModal === 'ca' ? `🏆 Classement CA — ${selectedYear}` : `🤝 Classement Parrains — ${selectedYear}`}
              </span>
              <button onClick={() => setTopModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {topModal === 'ca' ? (() => {
                const clientCA = {}
                sessions.filter(s => s.status === 'completed' && new Date(s.date).getFullYear() === selectedYear).forEach(s => {
                  if (!clientCA[s.clientId]) clientCA[s.clientId] = { name: getClientNameByContext(s.clientId), ca: 0, sessions: 0 }
                  clientCA[s.clientId].ca += (s.paymentAmount || getDefaultRate(s.clientId, clients, sessionRates))
                  clientCA[s.clientId].sessions++
                })
                const ranked = Object.entries(clientCA).sort((a, b) => b[1].ca - a[1].ca)
                if (ranked.length === 0) return <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-tertiary)' }}>Aucune donnée</div>
                const maxCA = ranked[0][1].ca
                return ranked.map(([cid, c], i) => (
                  <div key={cid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.714rem', fontWeight: 800, color: i < 3 ? '#D69E2E' : 'var(--text-tertiary)', minWidth: 24, textAlign: 'center' }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`}
                    </span>
                    <span
                      onClick={() => { setTopModal(null); setModalClientId(cid) }}
                      style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer', borderBottom: '1px dashed var(--primary-300)', flex: 1 }}
                    >
                      {renderCell(c.name)}
                    </span>
                    <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>{c.sessions} séances</span>
                    <div style={{ width: 80, height: 5, background: '#E2E8F0', borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: '#38A169', width: `${(c.ca / maxCA) * 100}%` }} />
                    </div>
                    <span style={{ fontSize: '0.857rem', fontWeight: 800, color: '#2A4365', minWidth: 50, textAlign: 'right' }}>{formatAmount(c.ca)}€</span>
                  </div>
                ))
              })() : (() => {
                const referralCounts = {}
                clients.forEach(c => {
                  if (c.referredBy) {
                    if (c.startDate && new Date(c.startDate).getFullYear() === selectedYear) {
                      if (!referralCounts[c.referredBy]) referralCounts[c.referredBy] = { name: getClientName(c.referredBy), count: 0, referredNames: [] }
                      referralCounts[c.referredBy].count++
                      referralCounts[c.referredBy].referredNames.push(getClientName(c.id))
                    }
                  }
                })
                const ranked = Object.entries(referralCounts).sort((a, b) => b[1].count - a[1].count)
                if (ranked.length === 0) return <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-tertiary)' }}>Aucun parrainage en {selectedYear}</div>
                const maxCount = ranked[0][1].count
                return ranked.map(([cid, c], i) => (
                  <div key={cid} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.714rem', fontWeight: 800, color: i < 3 ? '#D69E2E' : 'var(--text-tertiary)', minWidth: 24, textAlign: 'center' }}>
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`}
                      </span>
                      <span
                        onClick={() => { setTopModal(null); setModalClientId(cid) }}
                        style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer', borderBottom: '1px dashed var(--primary-300)', flex: 1 }}
                      >
                        {renderCell(c.name)}
                      </span>
                      <div style={{ width: 80, height: 5, background: '#E2E8F0', borderRadius: 3 }}>
                        <div style={{ height: '100%', borderRadius: 3, background: '#805AD5', width: `${(c.count / maxCount) * 100}%` }} />
                      </div>
                      <span style={{ fontSize: '0.857rem', fontWeight: 800, color: '#805AD5', minWidth: 30, textAlign: 'right' }}>{c.count}</span>
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>filleul{c.count > 1 ? 's' : ''}</span>
                    </div>
                    {c.referredNames.length > 0 && (
                      <div style={{ marginLeft: 34, marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {c.referredNames.map((name, idx) => (
                          <span key={idx} style={{ fontSize: '0.643rem', fontWeight: 600, color: '#6B46C1', background: '#FAF5FF', padding: '1px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #E8D8FE' }}>
                            {renderCell(name)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {modalClientId && (
        <div className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setModalClientId(null) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setModalClientId(null) }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{
            width: '90vw', maxWidth: 1100, height: '90vh',
            background: '#ffffff', borderRadius: 'var(--radius-lg)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            overflow: 'auto', padding: 'var(--space-lg)',
            position: 'relative',
            animation: 'slideUp 0.25s ease'
          }}>
            <button
              onClick={() => setModalClientId(null)}
              style={{
                position: 'sticky', top: 0, float: 'right',
                background: 'white', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-full)', width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <X size={16} />
            </button>
            <ClientDetailPage
              clientIdProp={modalClientId}
              sessionIdProp={modalSessionId}
              onClose={() => { setModalClientId(null); setModalSessionId(null); }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
