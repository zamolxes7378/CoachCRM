import { useMemo } from 'react'
import { HelpCircle, Sprout } from 'lucide-react'
import ReportIcon from '../components/ReportIcon'
import InvoiceIcon from '../components/InvoiceIcon'
import { useData } from '../context/DataContext'

/**
 * useUrgencies — Hook partagé pour les compteurs d'actions requises.
 * 
 * Retourne un tableau `urgencies[]` avec pour chaque item :
 *   { id, type, label, count, icon, color }
 * 
 * Utilisé par DashboardPage et FinancesPage pour garantir
 * une synchronisation parfaite des compteurs.
 */
export default function useUrgencies() {
    const { clients, sessions, contacts, isProspect, getComputedStatus } = useData()

    const pendingCRs = useMemo(() =>
        sessions.filter(s => s.status === 'completed' && !s.hasReport),
        [sessions]
    )

    const pendingPaymentSessions = useMemo(() =>
        sessions.filter(s => s.status === 'completed' && (!s.paymentMethod || (s.paymentMethod !== 'especes' && !s.paymentReceived))),
        [sessions]
    )

    const pendingInvoiceSessions = useMemo(() =>
        sessions.filter(s => s.needsInvoice && !s.invoiceSent),
        [sessions]
    )

    const clientsToReactivate = useMemo(() => {
        return clients
            .filter(c => getComputedStatus(c) === 'active' && !c.deletedAt && isProspect(c))
            .filter(c => {
                const hasUpcoming = sessions.some(s => s.clientId === c.id && s.status === 'scheduled' && !s.isCompleted)
                if (hasUpcoming) return false
                const hasUnconfirmedPast = sessions.some(s => s.clientId === c.id && s.isCompleted && !s.isConfirmed && s.status !== 'cancelled')
                return !hasUnconfirmedPast
            })
            .map(c => {
                const lastSessionDate = sessions.find(s => s.clientId === c.id && s.status !== 'cancelled')?.date
                const clientContacts = (contacts || [])
                    .filter(ct => ct.client_id === c.id)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                return { ...c, lastSessionDate, lastContact: clientContacts[0] || null }
            })
            .sort((a, b) => {
                const dateA = a.lastContact?.date || '0000-00-00'
                const dateB = b.lastContact?.date || '0000-00-00'
                return new Date(dateB) - new Date(dateA)
            })
    }, [clients, sessions, isProspect, getComputedStatus, contacts])

    const urgencies = useMemo(() => {
        const tasks = []

        if (pendingCRs.length > 0) {
            tasks.push({
                id: 'urg-cr',
                type: 'content',
                label: `${pendingCRs.length} CR à rédiger`,
                count: pendingCRs.length,
                icon: ReportIcon,
                color: '#2B6CB0'
            })
        }

        if (pendingPaymentSessions.length > 0) {
            tasks.push({
                id: 'urg-pay',
                type: 'finance',
                label: `${pendingPaymentSessions.length} séance${pendingPaymentSessions.length > 1 ? 's' : ''} à confirmer`,
                count: pendingPaymentSessions.length,
                icon: HelpCircle,
                color: '#D97706'
            })
        }

        if (pendingInvoiceSessions.length > 0) {
            tasks.push({
                id: 'urg-inv',
                type: 'finance',
                label: `${pendingInvoiceSessions.length} facture${pendingInvoiceSessions.length > 1 ? 's' : ''} à émettre`,
                count: pendingInvoiceSessions.length,
                icon: InvoiceIcon,
                color: 'var(--primary-500)'
            })
        }

        if (clientsToReactivate.length > 0) {
            tasks.push({
                id: 'urg-relance',
                type: 'prospect',
                label: `${clientsToReactivate.length} prospect${clientsToReactivate.length > 1 ? 's' : ''} à relancer`,
                count: clientsToReactivate.length,
                icon: Sprout,
                color: '#7C3AED'
            })
        }

        return tasks
    }, [pendingCRs, pendingPaymentSessions, pendingInvoiceSessions, clientsToReactivate])

    return { urgencies, clientsToReactivate, pendingCRs, pendingPaymentSessions, pendingInvoiceSessions }
}
