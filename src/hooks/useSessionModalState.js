import { useState, useCallback } from 'react'

const sampleTranscriptions = [
  "Le couple a abordé les difficultés de communication récurrentes. Travail sur l'écoute active et la reformulation. Progrès notables dans l'expression des émotions.",
  "Séance centrée sur la gestion des conflits. Exercices pratiques de médiation. Le couple montre une meilleure capacité à désamorcer les tensions.",
  "Discussion approfondie sur les attentes mutuelles. Identification des besoins non exprimés. Mise en place d'un rituel de communication hebdomadaire.",
  "Bilan de mi-parcours positif. Les exercices à domicile sont réalisés régulièrement. La dynamique relationnelle s'améliore sensiblement.",
  "Travail sur la confiance et l'attachement. Exploration des schémas relationnels hérités. Le couple prend conscience des patterns répétitifs."
]

/**
 * Custom hook that encapsulates all state related to the Session Detail Modal.
 * Returns { state, actions } for clean prop passing to SessionDetailModal.
 */
export default function useSessionModalState({ sessions, updateSession, sessionRate, originalRate }) {
  const [sessionUpdates, setSessionUpdates] = useState({})
  const [expandedSessionId, setExpandedSessionId] = useState(null)
  const [rateOverrides, setRateOverrides] = useState({})
  const [recordingSessionId, setRecordingSessionId] = useState(null)
  const [recordingStep, setRecordingStep] = useState('idle')
  const [editingCoveredSessions, setEditingCoveredSessions] = useState(false)
  const [editingInvoiceSessions, setEditingInvoiceSessions] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  const getRate = useCallback((sessionId) => {
    if (rateOverrides[sessionId] !== undefined) return rateOverrides[sessionId]
    const s = sessions.find(s => s.id === sessionId)
    if (s && s.date && s.date.split('T')[0] < todayStr) return originalRate
    return sessionRate
  }, [rateOverrides, sessions, sessionRate, originalRate, todayStr])

  const handleStartRecording = useCallback((sessionId) => {
    setRecordingSessionId(sessionId)
    setRecordingStep('recording')
    setTimeout(() => {
      setRecordingStep('processing')
      setTimeout(() => {
        const transcription = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)]
        const existing = sessionUpdates[sessionId]?.summary || sessions.find(s => s.id === sessionId)?.summary || ''
        const newSummary = existing ? `${existing}\n\n${transcription}` : transcription
        const session = sessions.find(s => s.id === sessionId)
        if (session) { session.hasReport = true; session.summary = newSummary.slice(0, 50) }
        setSessionUpdates(prev => ({ ...prev, [sessionId]: { hasReport: true, summary: newSummary } }))
        updateSession(sessionId, { hasReport: true, summary: newSummary.slice(0, 50) })
        setRecordingStep('done')
        setTimeout(() => { setRecordingSessionId(null); setRecordingStep('idle') }, 1500)
      }, 2000)
    }, 3000)
  }, [sessions, sessionUpdates, updateSession])

  const handleSaveCR = useCallback((sessionId, text) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) { session.hasReport = !!text.trim(); session.summary = text.slice(0, 50) }
    setSessionUpdates(prev => ({ ...prev, [sessionId]: { hasReport: !!text.trim(), summary: text } }))
    updateSession(sessionId, { hasReport: !!text.trim(), summary: text.slice(0, 50) })
  }, [sessions, updateSession])

  return {
    state: {
      sessionUpdates,
      expandedSessionId,
      rateOverrides,
      recordingSessionId,
      recordingStep,
      editingCoveredSessions,
      editingInvoiceSessions,
    },
    actions: {
      setSessionUpdates,
      setExpandedSessionId,
      setRateOverrides,
      setRecordingSessionId,
      setRecordingStep,
      setEditingCoveredSessions,
      setEditingInvoiceSessions,
      getRate,
      handleStartRecording,
      handleSaveCR,
    }
  }
}
