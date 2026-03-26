const fs = require('fs');
const src = fs.readFileSync('/home/zamolxes/devs/CoachCRM/src/pages/CoupleDetailPage.jsx', 'utf8');
const lines = src.split('\n');

// ====== SessionDetailModal ======
// Lines 1708-2580 (1-indexed) = inner JSX body (after local vars, before closing IIFE)
const sessionBody = lines.slice(1707, 2580).join('\n');
const sessionHeader = `import React from 'react'
import {
  X, FileText, Mic, Sparkles, CheckCircle, XCircle, RefreshCw, Loader,
  Euro, Banknote, CreditCard, Landmark, Hourglass, Check, Receipt,
  Sprout, Calendar, Clock
} from 'lucide-react'

/**
 * Session Detail Modal — sliding panel for viewing/editing a single session.
 * Receives grouped state from useSessionModalState hook.
 */
export default function SessionDetailModal({
  session, couple, sessions, sessionNum,
  sessionModal,   // { sessionUpdates, expandedSessionId, rateOverrides, recordingSessionId, recordingStep, editingCoveredSessions, editingInvoiceSessions }
  sessionActions, // { setSessionUpdates, setExpandedSessionId, setRateOverrides, setEditingCoveredSessions, setEditingInvoiceSessions, getRate, handleStartRecording, handleSaveCR }
  therapy,        // { phasesData, defaultPhaseKey, phaseIcons, phaseColors, sessionNumbers }
  utils           // { updateSession, formatDate, getCoupleName }
}) {
  if (!session) return null

  // Destructure for convenience
  const { sessionUpdates, recordingSessionId, recordingStep, editingCoveredSessions, editingInvoiceSessions } = sessionModal
  const { setSessionUpdates, setExpandedSessionId, setRateOverrides, setEditingCoveredSessions, setEditingInvoiceSessions, getRate, handleStartRecording, handleSaveCR } = sessionActions
  const { phasesData: therapyPhasesData, defaultPhaseKey, phaseIcons, phaseColors, sessionNumbers } = therapy
  const { updateSession, formatDate, getCoupleName } = utils

  const update = sessionUpdates[session.id]
  const hasReport = session.hasReport || update?.hasReport
  const summary = update?.summary || session.summary
  const isRecording = recordingSessionId === session.id
  const rate = getRate(session.id)
  const isPast = new Date(session.date) <= new Date()
  const pc = phaseColors[session.phase] || phaseColors.debut
  const SessionPhaseIcon = phaseIcons[session.phase] || Sprout

  return (
`;
const sessionFooter = `
  )
}
`;
fs.writeFileSync(
  '/home/zamolxes/devs/CoachCRM/src/components/client/SessionDetailModal.jsx',
  sessionHeader + sessionBody + sessionFooter
);
console.log('SessionDetailModal: ' + (sessionHeader + sessionBody + sessionFooter).split('\\n').length + ' lines');

// ====== EditIdentityModal ======
// Lines 2585-3441 (1-indexed) = inner IIFE body
const editBody = lines.slice(2584, 3441).join('\n');
const editHeader = `import React from 'react'
import {
  X, User, Users, Sprout, Baby, Trash2, Plus, Edit3, Save, Check,
  ChevronDown, ChevronUp, Star, Link2, Award, Briefcase, UserPlus
} from 'lucide-react'
import DeleteConfirmModal from './DeleteConfirmModal'

/**
 * Edit Identity Modal — sliding panel for editing client identity, type, source, links.
 * Receives grouped state from useEditIdentityState hook.
 */
export default function EditIdentityModal({
  couple,
  editState,       // all edit fields from useEditIdentityState
  editActions,     // all setters from useEditIdentityState
  therapy,         // { phasesData, phaseIcons, phaseColors, phase, setPhase, status }
  data,            // { clients, professionals, recruitmentSources }
  utils,           // { updateClient, updatePro, createPro, navigate, getCoupleName, getClientType, getCoupleInitials, findDuplicateClients, findDuplicatePros, DuplicateAlert }
}) {
  // Destructure for convenience
  const {
    editPartnerA, editPartnerB, editChildren, editType, editReferents, editSource,
    showDeleteConfirm, modalShowAddLink, modalAddLinkSearch,
    modalReferrerSearch, modalSelectedReferrer, modalShowReferrerDropdown, modalExternalReferrer
  } = editState
  const {
    setEditPartnerA, setEditPartnerB, setEditChildren, setEditType, setEditReferents, setEditSource,
    setShowEditModal, setShowDeleteConfirm, setModalShowAddLink, setModalAddLinkSearch,
    setModalReferrerSearch, setModalSelectedReferrer, setModalShowReferrerDropdown, setModalExternalReferrer,
    resetToOriginal
  } = editActions
  const { phasesData: therapyPhasesData, phaseIcons, phaseColors, phase, setPhase, status } = therapy
  const { clients, professionals, recruitmentSources } = data
  const { updateClient, updatePro, createPro, navigate, getCoupleName, getClientType, getCoupleInitials, findDuplicateClients, findDuplicatePros, DuplicateAlert } = utils

`;
const editFooter = `
}
`;
fs.writeFileSync(
  '/home/zamolxes/devs/CoachCRM/src/components/client/EditIdentityModal.jsx',
  editHeader + editBody + editFooter
);

console.log('DONE: Both modals created');
