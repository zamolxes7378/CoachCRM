import { useState, useCallback } from 'react'

/**
 * Custom hook that encapsulates all state related to the Edit Identity Modal.
 * Returns { state, actions } for clean prop passing to EditIdentityModal.
 */
export default function useEditIdentityState({ client, getClientType }) {
  // Edit fields
  const [editPartnerA, setEditPartnerA] = useState({ ...(client?.partnerA || {}) })
  const [editPartnerB, setEditPartnerB] = useState({ ...(client?.partnerB || {}) })
  const [editChildren, setEditChildren] = useState(client?.children || [])
  const [editType, setEditType] = useState(client ? getClientType(client) : 'individual')
  const [editReferents, setEditReferents] = useState(client?.referents || ['A'])
  const [editSource, setEditSource] = useState(client?.source || '')
  const [editBillingAddress, setEditBillingAddress] = useState(client?.billingAddress || '')

  // Modal UI state
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Referrer / link state (used only inside the modal)
  const [modalShowAddLink, setModalShowAddLink] = useState(false)
  const [modalAddLinkSearch, setModalAddLinkSearch] = useState('')
  const [modalReferrerSearch, setModalReferrerSearch] = useState('')
  const [modalSelectedReferrer, setModalSelectedReferrer] = useState(null)
  const [modalShowReferrerDropdown, setModalShowReferrerDropdown] = useState(false)
  const [modalExternalReferrer, setModalExternalReferrer] = useState(client?.externalReferrer || null)
  const [isSaving, setIsSaving] = useState(false)

  // Reset all edit fields to original values
  const resetToOriginal = useCallback(() => {
    if (!client) return
    setEditPartnerA({ ...client.partnerA })
    setEditPartnerB(client.partnerB ? { ...client.partnerB } : {})
    setEditChildren(client.children || [])
    setEditType(getClientType(client))
    setEditReferents(client.referents || ['A'])
    setEditSource(client?.source || '')
    setEditBillingAddress(client?.billingAddress || '')
    setModalSelectedReferrer(null)
    setModalReferrerSearch('')
    setModalExternalReferrer(client?.externalReferrer || null)
    setModalShowAddLink(false)
    setModalAddLinkSearch('')
  }, [client, getClientType])

  // Open the modal with current values
  const openEditModal = useCallback(() => {
    if (!client) return
    setEditPartnerA({ ...client.partnerA })
    setEditPartnerB(client.partnerB ? { ...client.partnerB } : {})
    setEditChildren(client.children || [])
    setEditType(getClientType(client))
    setEditReferents(client.referents || ['A'])
    setEditBillingAddress(client?.billingAddress || '')
    setShowEditModal(true)
  }, [client, getClientType])

  return {
    state: {
      editPartnerA,
      editPartnerB,
      editChildren,
      editType,
      editReferents,
      editSource,
      editBillingAddress,
      showEditModal,
      showDeleteConfirm,
      modalShowAddLink,
      modalAddLinkSearch,
      modalReferrerSearch,
      modalSelectedReferrer,
      modalShowReferrerDropdown,
      modalExternalReferrer,
      isSaving,
    },
    actions: {
      setEditPartnerA,
      setEditPartnerB,
      setEditChildren,
      setEditType,
      setEditReferents,
      setEditSource,
      setEditBillingAddress,
      setShowEditModal,
      setShowDeleteConfirm,
      setModalShowAddLink,
      setModalAddLinkSearch,
      setModalReferrerSearch,
      setModalSelectedReferrer,
      setModalShowReferrerDropdown,
      setModalExternalReferrer,
      setIsSaving,
      resetToOriginal,
      openEditModal,
    }
  }
}
