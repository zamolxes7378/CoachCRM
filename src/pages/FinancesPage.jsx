import { useState, useMemo, useEffect } from 'react'
import { Euro, TrendingUp, TrendingDown, Minus, Users, UserPlus, Calendar, AlertTriangle, FileText, Hourglass, HelpCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Download, BarChart3, ArrowUpRight, ArrowDownRight, XCircle, X, RefreshCw, PieChart } from 'lucide-react'
import { useData } from '../context/DataContext'
import CoupleDetailPage from './CoupleDetailPage'
import { countClientsBySource, exportSponsorshipCSV } from '../services/sponsorshipService'
import { getCoupleName } from '../data/mockData'

const DEFAULT_RATE = 75 // fallback

export default function FinancesPage() {
  const { clients: mockCouples, sessions: mockSessions, recruitmentSources, sessionRates } = useData()

  function getDefaultRate(coupleId) {
    const c = mockCouples.find(x => x.id === coupleId)
    return c && c.type === 'individual' ? sessionRates.individual : sessionRates.couple
  }

  function getClientName(coupleId) {
    const c = mockCouples.find(x => x.id === coupleId)
    if (!c) return '—'
    if (c.partnerB) return `${c.partnerA.firstName} & ${c.partnerB.firstName} ${c.partnerA.lastName}`
    return `${c.partnerA.firstName} ${c.partnerA.lastName}`
  }

  function getClientType(coupleId) {
    const c = mockCouples.find(x => x.id === coupleId)
    if (!c) return 'couple'
    return c.type === 'individual' ? 'individuel' : 'couple'
  }

  function getClientSource(coupleId) {
    const c = mockCouples.find(x => x.id === coupleId)
    if (!c || !c.source) return '—'
    const src = recruitmentSources.find(s => s.key === c.source)
    return src ? src.label : c.source
  }

  function formatDate(d) {
    const dt = new Date(d)
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const [modalCoupleId, setModalCoupleId] = useState(null)
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [objectifCAByYear, setObjectifCAByYear] = useState({ 2025: 2000, 2026: 2000 })
  const objectifCA = objectifCAByYear[selectedYear] || 2000
  const setObjectifCA = (v) => setObjectifCAByYear(prev => ({ ...prev, [selectedYear]: v }))
  const [viewPeriod, setViewPeriod] = useState('month') // month, quarter, semester, year
  const [topModal, setTopModal] = useState(null) // 'ca' | 'referrals' | null
  const [expandedAlert, setExpandedAlert] = useState(null) // 'unpaid' | 'deferred' | 'invoices' | null
  const [exportFrom, setExportFrom] = useState(`${now.getFullYear()}-01-01`)
  const [exportTo, setExportTo] = useState(`${now.getFullYear()}-12-31`)
  const [refreshKey, setRefreshKey] = useState(0)

  // All sessions — spread to force re-evaluation on refresh
  const sessions = useMemo(() => [...mockSessions], [refreshKey])

  // Helper: sessions in a given month/year
  const sessionsInMonth = (m, y) => sessions.filter(s => {
    const d = new Date(s.date)
    return d.getMonth() === m && d.getFullYear() === y
  })

  // Monthly stats calculator
  const monthlyStats = (m, y) => {
    const ms = sessionsInMonth(m, y)
    const completed = ms.filter(s => s.status === 'completed')
    const cancelled = ms.filter(s => s.status === 'cancelled')
    const scheduled = ms.filter(s => s.status === 'scheduled')
    const caRealise = completed.reduce((sum, s) => sum + (s.paymentAmount || DEFAULT_RATE), 0)
    const caPrev = caRealise + scheduled.reduce((sum, s) => sum + DEFAULT_RATE, 0)
    const paid = completed.filter(s => s.paymentReceived)
    const encaisse = paid.reduce((sum, s) => sum + (s.paymentAmount || DEFAULT_RATE), 0)

    // Nouveaux clients: 1ère séance de ce client est dans ce mois
    const clientIds = [...new Set(ms.map(s => s.coupleId))]
    const nouveaux = clientIds.filter(cid => {
      const allClientSessions = sessions.filter(s => s.coupleId === cid && s.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date))
      if (allClientSessions.length === 0) return false
      const first = new Date(allClientSessions[0].date)
      return first.getMonth() === m && first.getFullYear() === y
    })

    const panierMoyen = clientIds.length > 0 ? Math.round(caRealise / clientIds.length) : 0
    const txAnnulation = (completed.length + cancelled.length) > 0
      ? Math.round((cancelled.length / (completed.length + cancelled.length)) * 100)
      : 0

    return { completed, cancelled, scheduled, caRealise, caPrev, encaisse, nouveaux, panierMoyen, txAnnulation, clientIds, allSessions: ms, paid }
  }

  const currentStats = useMemo(() => monthlyStats(selectedMonth, selectedYear), [selectedMonth, selectedYear])

  // Previous month for comparison
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear
  const prevStats = useMemo(() => monthlyStats(prevMonth, prevYear), [prevMonth, prevYear])

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
  }, [objectifCA])

  const maxCA = Math.max(...chartData.map(d => Math.max(d.ca, d.objectif)), 1)

  // Alerts
  const alerts = useMemo(() => {
    const unpaid = sessions.filter(s => s.status === 'completed' && !s.paymentReceived && !s.paymentMethod)
    const deferred = sessions.filter(s => s.status === 'completed' && s.paymentMethod && !s.paymentReceived)
    const pendingInvoices = sessions.filter(s => s.needsInvoice && !s.invoiceSent)
    return { unpaid, deferred, pendingInvoices }
  }, [sessions, refreshKey])

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

  // Navigate months
  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1) }
    else setSelectedMonth(selectedMonth - 1)
  }
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1) }
    else setSelectedMonth(selectedMonth + 1)
  }

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', fontWeight: 600, color: 'var(--text-tertiary)', background: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            <RefreshCw size={11} /> Rafraîchir
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {[
              { label: 'Paiements en attente', count: alerts.unpaid.length + alerts.deferred.length, badgeBg: '#FFF5F5', badgeColor: '#C53030', target: 'zone-paiements' },
              { label: 'Séances à confirmer', count: alerts.unpaid.length, badgeBg: '#FEFCBF', badgeColor: '#B7791F', target: 'zone-seances' },
              { label: 'Factures à émettre', count: alerts.pendingInvoices.length, badgeBg: '#EBF8FF', badgeColor: '#1A365D', target: 'zone-factures' },
            ].map((a, i, arr) => (
              <span key={a.target} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span
                  onClick={() => document.getElementById(a.target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: '0.643rem', fontWeight: 600, color: 'var(--text-tertiary)',
                    cursor: 'pointer', transition: 'opacity 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {a.label}
                  {a.count > 0 && <span style={{ minWidth: 16, height: 16, borderRadius: 'var(--radius-full)', background: a.badgeBg, color: a.badgeColor, fontSize: '0.571rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{a.count}</span>}
                </span>
                {i < arr.length - 1 && <span style={{ color: 'var(--border-light)', fontSize: '0.571rem' }}>·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {(() => {
        const currentYear = now.getFullYear()
        const availableYears = [...new Set(sessions.map(s => new Date(s.date).getFullYear()))].sort()
        if (!availableYears.includes(currentYear)) availableYears.push(currentYear)
        if (!availableYears.includes(currentYear + 1)) availableYears.push(currentYear + 1)
        availableYears.sort()

        // Yearly stats
        const yearStats = (y) => {
          const ys = sessions.filter(s => new Date(s.date).getFullYear() === y)
          const completed = ys.filter(s => s.status === 'completed')
          const cancelled = ys.filter(s => s.status === 'cancelled')
          const scheduled = ys.filter(s => s.status === 'scheduled')
          const ca = completed.reduce((sum, s) => sum + (s.paymentAmount || DEFAULT_RATE), 0)
          const caPlanned = ca + scheduled.reduce((sum, s) => sum + DEFAULT_RATE, 0)
          const clientIds = [...new Set(ys.filter(s => s.status !== 'cancelled').map(s => s.coupleId))]
          const newClients = clientIds.filter(cid => {
            const all = sessions.filter(s => s.coupleId === cid && s.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date))
            return all.length > 0 && new Date(all[0].date).getFullYear() === y
          })
          const paid = completed.filter(s => s.paymentReceived)
          const encaisse = paid.reduce((sum, s) => sum + (s.paymentAmount || DEFAULT_RATE), 0)
          const txAnnulation = (completed.length + cancelled.length) > 0
            ? Math.round((cancelled.length / (completed.length + cancelled.length)) * 100) : 0
          return { ca, caPlanned, completed, cancelled, scheduled, clientIds, newClients, encaisse, txAnnulation, allSessions: ys }
        }

        // Monthly breakdown for a year
        const monthlyBreakdown = (y) => Array.from({ length: 12 }, (_, m) => {
          const ms = sessions.filter(s => { const d = new Date(s.date); return d.getMonth() === m && d.getFullYear() === y })
          const completed = ms.filter(s => s.status === 'completed')
          const scheduled = ms.filter(s => s.status === 'scheduled')
          const ca = completed.reduce((sum, s) => sum + (s.paymentAmount || DEFAULT_RATE), 0)
          const caPlanned = scheduled.length * DEFAULT_RATE
          return { month: m, ca, caPlanned, sessions: completed.length }
        })

        const selYearStats = yearStats(selectedYear)
        const prevYearStats = yearStats(selectedYear - 1)
        const selMonthly = monthlyBreakdown(selectedYear)
        const prevMonthly = monthlyBreakdown(selectedYear - 1)
        const maxMonthlyCA = Math.max(...selMonthly.map(m => m.ca + m.caPlanned), ...prevMonthly.map(m => m.ca), objectifCA, 1)
        const objH = maxMonthlyCA > 0 ? (objectifCA / maxMonthlyCA) * 100 : 0

        // Next year projection
        const activeMonths = selMonthly.filter(m => m.ca > 0).length || 1
        const avgMonthlyCA = Math.round(selYearStats.ca / activeMonths)
        const projectedNextYear = avgMonthlyCA * 12

        return (
          <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <span style={{ fontSize: '0.857rem', fontWeight: 700, color: 'var(--text-primary)' }}>Vue consolidée annuelle</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  <span style={{ fontWeight: 600 }}>Objectif/mois :</span>
                  <input
                    type="number" min="0" step="100"
                    value={objectifCAByYear[selectedYear] || 2000}
                    onChange={e => setObjectifCAByYear(prev => ({ ...prev, [selectedYear]: Number(e.target.value) }))}
                    className="input"
                    style={{ fontSize: '0.714rem', fontWeight: 700, textAlign: 'center', width: 70, padding: '2px 4px' }}
                  />
                  <span style={{ fontWeight: 600 }}>€</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {availableYears.map(y => (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      style={{
                        padding: '5px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.857rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        background: selectedYear === y ? 'var(--primary-500)' : 'transparent',
                        color: selectedYear === y ? 'white' : 'var(--text-tertiary)',
                        border: selectedYear === y ? 'none' : '1px solid var(--border-light)'
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Annual KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              {[
                { label: 'CA réalisé', value: `${selYearStats.ca}€`, prev: prevYearStats.ca, current: selYearStats.ca, color: '#276749', icon: Euro },
                { label: 'CA planifié', value: `${selYearStats.caPlanned}€`, prev: prevYearStats.caPlanned, current: selYearStats.caPlanned, color: 'var(--primary-600)', icon: TrendingUp },
                { label: 'Séances', value: selYearStats.completed.length, prev: prevYearStats.completed.length, current: selYearStats.completed.length, color: '#2B6CB0', icon: Calendar },
                { label: 'Clients actifs', value: selYearStats.clientIds.length, prev: prevYearStats.clientIds.length, current: selYearStats.clientIds.length, color: '#805AD5', icon: Users },
                { label: 'Nouveaux clients', value: selYearStats.newClients.length, prev: prevYearStats.newClients.length, current: selYearStats.newClients.length, color: '#805AD5', icon: UserPlus },
                { label: 'Moy./mois', value: `${avgMonthlyCA}€`, prev: prevYearStats.ca > 0 ? Math.round(prevYearStats.ca / (prevMonthly.filter(m => m.ca > 0).length || 1)) : 0, current: avgMonthlyCA, color: '#D69E2E', icon: BarChart3 },
              ].map((k, i) => (
                <div key={i} style={{ textAlign: 'center', padding: 'var(--space-xs)', borderRadius: 'var(--radius-md)', background: '#FAFAFA', border: '1px solid var(--border-light)' }}>
                  <k.icon size={20} style={{ color: k.color, marginBottom: 2 }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    {k.value}
                    <TrendBadge current={k.current} previous={k.prev} />
                  </div>
                  <div style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Comparative bar chart: selected year vs previous */}
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--primary-500)' }} /> {selectedYear}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#CBD5E0', opacity: 0.6 }} /> {selectedYear - 1}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#E3F2FD' }} /> CA planifié
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ width: 10, height: 2, background: '#D69E2E', borderRadius: 1, borderTop: '1px dashed #D69E2E' }} /> Objectif ({objectifCA}€)
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
                          <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: '0.714rem', fontWeight: 700, color: 'var(--primary-700)', whiteSpace: 'nowrap', zIndex: 5, background: 'white', padding: '1px 6px', borderRadius: 'var(--radius-sm)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                            {selCA}{selPlanned > 0 ? `+${selPlanned}` : ''}€
                            {prevCA > 0 && <span style={{ fontSize: '0.571rem', fontWeight: 500, color: '#999', marginLeft: 4 }}>({prevCA}€)</span>}
                          </div>
                        )}
                        {/* Previous year bar */}
                        <div style={{
                          width: '35%', height: `${Math.max(prevH, 0.5)}%`, minHeight: 1, borderRadius: '3px 3px 0 0',
                          background: '#CBD5E0', opacity: 0.5, transition: 'height 0.3s'
                        }} title={`${selectedYear - 1}: ${prevCA}€`} />
                        {/* Current year bar — stacked: completed + planned */}
                        <div style={{ width: '35%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', outline: isSelected ? '2px solid var(--primary-700)' : 'none', outlineOffset: 1, borderRadius: '3px 3px 0 0', height: Math.max((totalSelH / 100) * 120, 1) }}>
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
                            background: isFuture ? '#E2E8F0' : selCA >= objectifCA ? 'linear-gradient(180deg, #68D391, #38A169)' : 'var(--primary-500)',
                            opacity: isFuture ? 0.4 : 1,
                            borderRadius: selPlanned > 0 ? '0' : '3px 3px 0 0',
                            transition: 'height 0.3s'
                          }} title={`${selectedYear}: ${selCA}€`} />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.5rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary-700)' : 'var(--text-tertiary)' }}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Liens Top Clients & Parrainages */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
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
            </div>
          </div>
        )
      })()}

      {/* Zone 3 — Détail mensuel (KPIs + Tableau) */}
      <div className="card" style={{ padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <span style={{ fontSize: '0.857rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Vue détaillée du mois
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={goToPrevMonth} style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '4px', cursor: 'pointer', display: 'flex' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 100, textAlign: 'center' }}>
              {MONTHS_FR[selectedMonth]} {selectedYear}
            </span>
            <button onClick={goToNextMonth} style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '4px', cursor: 'pointer', display: 'flex' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* KPIs mensuels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          {[
            { label: 'CA réalisé', value: `${currentStats.caRealise}€`, prev: prevStats.caRealise, current: currentStats.caRealise, color: '#276749', icon: Euro },
            { label: 'CA planifié', value: `${currentStats.caPrev}€`, prev: prevStats.caPrev, current: currentStats.caPrev, color: 'var(--primary-600)', icon: TrendingUp },
            { label: 'Séances', value: null, customRender: true, color: '#2B6CB0', icon: Calendar },
            { label: 'Nouveaux clients', value: currentStats.nouveaux.length, prev: prevStats.nouveaux.length, current: currentStats.nouveaux.length, color: '#805AD5', icon: UserPlus },
            { label: 'Panier moyen', value: `${currentStats.panierMoyen}€`, prev: prevStats.panierMoyen, current: currentStats.panierMoyen, color: '#D69E2E', icon: BarChart3 },
            { label: 'Taux encaissement', value: `${currentStats.caRealise > 0 ? Math.round((currentStats.encaisse / currentStats.caRealise) * 100) : 0}%`, prev: prevStats.caRealise > 0 ? Math.round((prevStats.encaisse / prevStats.caRealise) * 100) : 0, current: currentStats.caRealise > 0 ? Math.round((currentStats.encaisse / currentStats.caRealise) * 100) : 0, color: currentStats.caRealise > 0 && currentStats.encaisse >= currentStats.caRealise ? '#276749' : '#D69E2E', icon: Download },
            { label: 'Taux annulation', value: `${currentStats.txAnnulation}%`, prev: prevStats.txAnnulation, current: currentStats.txAnnulation, color: 'var(--error)', icon: XCircle, invert: true },
          ].map((kpi, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 'var(--space-xs)', borderRadius: 'var(--radius-md)', background: '#FAFAFA', border: '1px solid var(--border-light)' }}>
              <kpi.icon size={20} style={{ color: kpi.color, marginBottom: 2 }} />
              {kpi.customRender ? (
                <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <span style={{ color: '#276749' }}>{currentStats.completed.length}</span>
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
                  <TrendBadge current={kpi.current} previous={kpi.prev} invert={kpi.invert} />
                </div>
              )}
              <div style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.786rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                {['Date', 'Client', 'Source', 'Type', 'Statut', 'Montant', 'Paiement', 'Encaissé', 'Facture'].map(h => (
                  <th key={h} style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.643rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentStats.allSessions.sort((a, b) => b.date.localeCompare(a.date)).map(s => {
                const isCancelled = s.status === 'cancelled'
                const isScheduled = s.status === 'scheduled'
                const isPaid = s.paymentReceived
                return (
                  <tr key={s.id} style={{
                    borderBottom: '1px solid var(--border-light)',
                    opacity: isCancelled ? 0.5 : isScheduled ? 0.7 : 1,
                    background: isCancelled ? '#FFF5F5' : 'transparent',
                    transition: 'background 0.1s'
                  }}
                    onMouseEnter={e => { if (!isCancelled) e.currentTarget.style.background = 'var(--primary-50)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isCancelled ? '#FFF5F5' : 'transparent' }}
                  >
                    <td style={{ padding: '8px 6px', fontWeight: 500, color: 'var(--text-secondary)' }}>{formatDate(s.date)}</td>
                    <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span
                        onClick={() => setModalCoupleId(s.coupleId)}
                        style={{ cursor: 'pointer', color: 'var(--primary-600)', textDecoration: 'none', borderBottom: '1px dashed var(--primary-300)' }}
                        onMouseEnter={e => e.target.style.color = 'var(--primary-800)'}
                        onMouseLeave={e => e.target.style.color = 'var(--primary-600)'}
                      >
                        {getClientName(s.coupleId)}
                      </span>
                      {(() => {
                        const clientSessions = sessions.filter(cs => cs.coupleId === s.coupleId && cs.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date))
                        return clientSessions.length > 0 && clientSessions[0].id === s.id ? (
                          <span style={{ fontSize: '0.643rem', fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: '#FAF5FF', color: '#805AD5', marginLeft: 6 }}>1er RDV</span>
                        ) : null
                      })()}
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>{getClientSource(s.coupleId)}</span>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{
                        fontSize: '0.643rem', fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                        background: getClientType(s.coupleId) === 'individuel' ? '#FAF5FF' : '#EBF8FF',
                        color: getClientType(s.coupleId) === 'individuel' ? '#805AD5' : '#2B6CB0'
                      }}>
                        {getClientType(s.coupleId) === 'individuel' ? 'Individuel' : 'Couple'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{
                        fontSize: '0.643rem', fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                        background: isCancelled ? '#FED7D7' : isScheduled ? '#F0F0F0' : (!s.paymentMethod ? '#FEFCBF' : '#C6F6D5'),
                        color: isCancelled ? 'var(--error)' : isScheduled ? 'var(--text-tertiary)' : (!s.paymentMethod ? '#B7791F' : '#276749')
                      }}>
                        {isCancelled ? 'Annulée' : isScheduled ? 'Planifiée' : 'Réalisée'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px', fontWeight: 700, color: isPaid ? '#276749' : isCancelled ? 'var(--error)' : 'var(--text-primary)' }}>
                      {s.paymentAmount || DEFAULT_RATE}€
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      {s.paymentMethod ? (
                        <span style={{ fontSize: '0.643rem', fontWeight: isPaid ? 700 : 400, color: isPaid ? 'var(--success)' : 'var(--text-tertiary)' }}>
                          {{ cheque: 'Chèque', virement: 'Virement', especes: 'Espèces' }[s.paymentMethod]}
                        </span>
                      ) : (
                        isScheduled ? <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>—</span> : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.571rem', fontWeight: 700, color: 'var(--error)', letterSpacing: '0.02em' }}>
                            <AlertTriangle size={9} /> PAIEMENT
                          </span>
                        )
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      {isScheduled || isCancelled ? '—' : isPaid ? (
                        <span style={{ fontSize: '0.643rem', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: '#C6F6D5', color: '#276749' }}>€</span>
                      ) : (
                        <span style={{ fontSize: '0.643rem', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: '#FED7D7', color: '#C53030' }}>Non</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      {s.needsInvoice ? (
                        <span style={{ fontSize: '0.571rem', fontWeight: 700, color: s.invoiceSent ? 'var(--success)' : 'var(--error)', letterSpacing: '0.02em' }}>
                          FACTURE{s.invoiceSent ? ' ✓' : ''}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Totals */}
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--primary-200)', background: 'var(--primary-50)' }}>
                <td colSpan={5} style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.786rem' }}>
                  Total — {MONTHS_FR[selectedMonth]}
                </td>
                <td style={{ padding: '8px 6px', fontWeight: 800, color: '#276749', fontSize: '0.857rem' }}>
                  {currentStats.caRealise}€
                </td>
                <td colSpan={2} style={{ padding: '8px 6px', fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>
                  {currentStats.paid.length}/{currentStats.completed.length} encaissé{currentStats.paid.length > 1 ? 's' : ''}
                </td>
                <td style={{ padding: '8px 6px', fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                  {currentStats.allSessions.filter(s => s.needsInvoice).length} facture{currentStats.allSessions.filter(s => s.needsInvoice).length > 1 ? 's' : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Meilleurs clients + À régulariser + Factures à émettre — 33/33/33 */}
      {(() => {
        const clientPayments = {}
        sessions.filter(s => s.status === 'completed').forEach(s => {
          if (!clientPayments[s.coupleId]) clientPayments[s.coupleId] = { name: getClientName(s.coupleId), totalDue: 0, totalPaid: 0 }
          const amt = s.paymentAmount || DEFAULT_RATE
          clientPayments[s.coupleId].totalDue += amt
          if (s.paymentReceived) clientPayments[s.coupleId].totalPaid += amt
        })
        const outstanding = Object.entries(clientPayments).filter(([, c]) => c.totalPaid < c.totalDue).sort((a, b) => (b[1].totalDue - b[1].totalPaid) - (a[1].totalDue - a[1].totalPaid))

        const invoiceClients = {}
        sessions.filter(s => s.needsInvoice && !s.invoiceSent).forEach(s => {
          if (!invoiceClients[s.coupleId]) invoiceClients[s.coupleId] = { name: getClientName(s.coupleId), sessions: 0, total: 0 }
          invoiceClients[s.coupleId].sessions++
          invoiceClients[s.coupleId].total += (s.paymentAmount || DEFAULT_RATE)
        })
        const pendingInvoices = Object.entries(invoiceClients).sort((a, b) => b[1].total - a[1].total)

        const doubtfulByClient = {}
        sessions.filter(s => s.status === 'completed' && !s.paymentMethod).forEach(s => {
          if (!doubtfulByClient[s.coupleId]) doubtfulByClient[s.coupleId] = { name: getClientName(s.coupleId), sessions: [], total: 0 }
          doubtfulByClient[s.coupleId].sessions.push(s)
          doubtfulByClient[s.coupleId].total += (s.paymentAmount || DEFAULT_RATE)
        })
        const doubtfulClients = Object.entries(doubtfulByClient).sort((a, b) => b[1].sessions.length - a[1].sessions.length)

        const clientMap = {}
        currentStats.allSessions.filter(s => s.status !== 'cancelled').forEach(s => {
          if (!clientMap[s.coupleId]) clientMap[s.coupleId] = { name: getClientName(s.coupleId), sessions: 0, ca: 0 }
          clientMap[s.coupleId].sessions++
          if (s.status === 'completed') clientMap[s.coupleId].ca += (s.paymentAmount || DEFAULT_RATE)
        })
        const topClients = Object.entries(clientMap).sort((a, b) => b[1].ca - a[1].ca)

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                <span style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-primary)' }}>Meilleurs clients du mois</span>
                <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>{MONTHS_FR[selectedMonth]} {selectedYear}</span>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {topClients.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-md)', fontSize: '0.786rem', color: 'var(--text-tertiary)' }}>Aucune séance ce mois</div>
                ) : topClients.map(([cid, c], i) => (
                  <div key={cid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <span style={{ fontSize: '0.714rem', fontWeight: 800, color: i < 3 ? '#D69E2E' : 'var(--text-tertiary)', minWidth: 20, textAlign: 'center' }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`}
                    </span>
                    <span onClick={() => setModalCoupleId(cid)} style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer', borderBottom: '1px dashed var(--primary-300)', flex: 1 }}>{c.name}</span>
                    <span style={{ fontSize: '0.857rem', fontWeight: 800, color: '#276749' }}>{c.ca}€</span>
                  </div>
                ))}
              </div>
            </div>

            <div id="zone-paiements" className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-sm)' }}>
                <Hourglass size={16} style={{ color: '#C53030' }} />
                <span style={{ fontSize: '0.786rem', fontWeight: 700, color: '#C53030' }}>Paiements en attente</span>
                <span style={{ fontSize: '0.571rem', fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: '#FFF5F5', color: '#C53030' }}>{outstanding.length}</span>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {outstanding.map(([cid, c]) => {
                  const remaining = c.totalDue - c.totalPaid
                  return (
                    <div key={cid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <span onClick={() => setModalCoupleId(cid)} style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer', borderBottom: '1px dashed var(--primary-300)' }}>{c.name}</span>
                      <span style={{ fontSize: '0.857rem', fontWeight: 800, color: '#C53030' }}>{remaining}€</span>
                    </div>
                  )
                })}
                {outstanding.length === 0 && <div style={{ textAlign: 'center', padding: 'var(--space-md)', fontSize: '0.786rem', color: 'var(--success)', fontWeight: 600 }}>✓ Tous à jour</div>}
              </div>
            </div>

            <div id="zone-seances" className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-sm)' }}>
                <HelpCircle size={16} style={{ color: '#B7791F' }} />
                <span style={{ fontSize: '0.786rem', fontWeight: 700, color: '#B7791F' }}>Séances à confirmer</span>
                <span style={{ fontSize: '0.571rem', fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: '#FEFCBF', color: '#B7791F' }}>{doubtfulClients.reduce((sum, [, c]) => sum + c.sessions.length, 0)}</span>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {doubtfulClients.flatMap(([cid, c]) => c.sessions.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span onClick={() => setModalCoupleId(cid)} style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer', borderBottom: '1px dashed var(--primary-300)' }}>{c.name}</span>
                    <span style={{ fontSize: '0.643rem', fontWeight: 600, color: '#B7791F' }}>{formatDate(s.date)}</span>
                  </div>
                )))}
                {doubtfulClients.length === 0 && <div style={{ textAlign: 'center', padding: 'var(--space-md)', fontSize: '0.786rem', color: 'var(--success)', fontWeight: 600 }}>✓ Toutes confirmées</div>}
              </div>
            </div>

            <div id="zone-factures" className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-sm)' }}>
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B6CB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <text x="12" y="17" textAnchor="middle" fill="#2B6CB0" stroke="none" fontSize="10" fontWeight="800">€</text>
                  </svg>
                </span>
                <span style={{ fontSize: '0.786rem', fontWeight: 700, color: '#1A365D' }}>Factures à émettre</span>
                <span style={{ fontSize: '0.571rem', fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: '#EBF8FF', color: '#1A365D' }}>{pendingInvoices.length}</span>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {pendingInvoices.map(([cid, c]) => (
                  <div key={cid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span onClick={() => setModalCoupleId(cid)} style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer', borderBottom: '1px dashed var(--primary-300)' }}>{c.name}</span>
                    <span style={{ fontSize: '0.643rem', fontWeight: 600, color: '#1A365D' }}>{c.sessions} séance{c.sessions > 1 ? 's' : ''}</span>
                  </div>
                ))}
                {pendingInvoices.length === 0 && <div style={{ textAlign: 'center', padding: 'var(--space-md)', fontSize: '0.786rem', color: 'var(--success)', fontWeight: 600 }}>✓ Toutes émises</div>}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Export section with period selector */}
      <div className="card" style={{ padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-primary)' }}>Export CSV</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Du</label>
              <input
                type="date"
                className="input"
                value={exportFrom}
                onChange={e => setExportFrom(e.target.value)}
                style={{ fontSize: '0.714rem', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Au</label>
              <input
                type="date"
                className="input"
                value={exportTo}
                onChange={e => setExportTo(e.target.value)}
                style={{ fontSize: '0.714rem', fontFamily: 'inherit' }}
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
                  ...filtered.sort((a, b) => b.date.localeCompare(a.date)).map(s => [
                    formatDate(s.date),
                    getClientName(s.coupleId),
                    getClientType(s.coupleId),
                    s.status === 'cancelled' ? 'Annulée' : s.status === 'scheduled' ? 'Planifiée' : 'Réalisée',
                    s.paymentAmount || DEFAULT_RATE,
                    s.paymentMethod ? { cheque: 'Chèque', virement: 'Virement', especes: 'Espèces' }[s.paymentMethod] || '' : '',
                    s.paymentReceived ? 'Oui' : 'Non',
                    s.needsInvoice ? (s.invoiceSent ? 'Émise' : 'À émettre') : ''
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
        </div>
      </div>

      {/* Source Performance Widget + Parrainage Export */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
        {/* Source Performance */}
        {(() => {
          const sourceCounts = countClientsBySource(mockCouples, selectedYear)
          const sourceColors = {
            website: '#2B6CB0', phone: '#E67E22', referral: '#8B5CF6',
            email: '#38A169', social: '#D53F8C', parrainage: '#8B5CF6', unknown: '#A0AEC0'
          }
          const sourceLabels = {}
          recruitmentSources.forEach(s => { sourceLabels[s.key] = s.label })
          const entries = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])
          const maxCount = entries.length > 0 ? entries[0][1] : 1
          const totalClients = entries.reduce((sum, [, count]) => sum + count, 0)
          return (
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-md)' }}>
                <PieChart size={16} style={{ color: 'var(--primary-500)' }} />
                <span style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-primary)' }}>Performance par canal</span>
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
                        background: sourceColors[key] || '#A0AEC0',
                        width: `${(count / maxCount) * 100}%`,
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.786rem', fontWeight: 700, color: sourceColors[key] || '#A0AEC0', minWidth: 24, textAlign: 'right' }}>{count}</span>
                    <span style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--text-tertiary)', minWidth: 28 }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Parrainage Export */}
        <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-md)' }}>
            <Download size={16} style={{ color: '#8B5CF6' }} />
            <span style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-primary)' }}>Export Parrainages</span>
          </div>
          <p style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)', flex: 1 }}>
            Exporter la liste de tous les clients acquis par parrainage ou recommandation : parrain, type de référencement, date.
          </p>
          <button
            onClick={() => {
              const csv = exportSponsorshipCSV(mockCouples, getCoupleName)
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `parrainages_${selectedYear}.csv`
              a.click(); URL.revokeObjectURL(url)
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', padding: '8px 16px', alignSelf: 'flex-start' }}
          >
            <Download size={14} /> Exporter CSV Parrainages
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
                  if (!clientCA[s.coupleId]) clientCA[s.coupleId] = { name: getClientName(s.coupleId), ca: 0, sessions: 0 }
                  clientCA[s.coupleId].ca += (s.paymentAmount || DEFAULT_RATE)
                  clientCA[s.coupleId].sessions++
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
                      onClick={() => { setTopModal(null); setModalCoupleId(cid) }}
                      style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer', borderBottom: '1px dashed var(--primary-300)', flex: 1 }}
                    >
                      {c.name}
                    </span>
                    <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>{c.sessions} séances</span>
                    <div style={{ width: 80, height: 5, background: '#E2E8F0', borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: '#38A169', width: `${(c.ca / maxCA) * 100}%` }} />
                    </div>
                    <span style={{ fontSize: '0.857rem', fontWeight: 800, color: '#276749', minWidth: 50, textAlign: 'right' }}>{c.ca}€</span>
                  </div>
                ))
              })() : (() => {
                const referralCounts = {}
                mockCouples.forEach(c => {
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
                        onClick={() => { setTopModal(null); setModalCoupleId(cid) }}
                        style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer', borderBottom: '1px dashed var(--primary-300)', flex: 1 }}
                      >
                        {c.name}
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
                          <span key={idx} style={{ fontSize: '0.643rem', fontWeight: 600, color: '#6B46C1', background: '#FAF5FF', padding: '1px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #E9D8FD' }}>
                            {name}
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

      {modalCoupleId && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setModalCoupleId(null) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setModalCoupleId(null) }}
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
              onClick={() => setModalCoupleId(null)}
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
            <CoupleDetailPage coupleIdProp={modalCoupleId} onClose={() => { setModalCoupleId(null); setRefreshKey(k => k + 1) }} />
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
