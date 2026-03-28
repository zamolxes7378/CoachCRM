import { useState, useCallback } from 'react'

/**
 * Custom hook that encapsulates all state related to the Edit Identity Modal.
 * Returns { state, actions } for clean prop passing to EditIdentityModal.
 */
export default function useEditIdentityState({ couple, getClientType }) {
  // Edit fields
  const [editPartnerA, setEditPartnerA] = useState({ ...(couple?.partnerA || {}) })
  const [editPartnerB, setEditPartnerB] = useState({ ...(couple?.partnerB || {}) })
  const [editChildren, setEditChildren] = useState(couple?.children || [])
  const [editType, setEditType] = useState(couple ? getClientType(couple) : 'individual')
  const [editReferents, setEditReferents] = useState(['A'])
  const [editSource, setEditSource] = useState(couple?.source || '')
  const [editBillingAddress, setEditBillingAddress] = useState(couple?.billingAddress || '')

  // Modal UI state
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Referrer / link state (used only inside the modal)
  const [modalShowAddLink, setModalShowAddLink] = useState(false)
  const [modalAddLinkSearch, setModalAddLinkSearch] = useState('')
  const [modalReferrerSearch, setModalReferrerSearch] = useState('')
  const [modalSelectedReferrer, setModalSelectedReferrer] = useState(null)
  const [modalShowReferrerDropdown, setModalShowReferrerDropdown] = useState(false)
  const [modalExternalReferrer, setModalExternalReferrer] = useState(couple?.externalReferrer || null)
  const [isSaving, setIsSaving] = useState(false)

  // Reset all edit fields to original values
  const resetToOriginal = useCallback(() => {
    if (!couple) return
    setEditPartnerA({ ...couple.partnerA })
    setEditPartnerB(couple.partnerB ? { ...couple.partnerB } : {})
    setEditChildren(couple.children || [])
    setEditType(getClientType(couple))
    setEditSource(couple?.source || '')
    setEditBillingAddress(couple?.billingAddress || '')
    setModalSelectedReferrer(null)
    setModalReferrerSearch('')
    setModalExternalReferrer(couple?.externalReferrer || null)
    setModalShowAddLink(false)
    setModalAddLinkSearch('')
  }, [couple, getClientType])

  // Open the modal with current values
  const openEditModal = useCallback(() => {
    if (!couple) return
    setEditPartnerA({ ...couple.partnerA })
    setEditPartnerB(couple.partnerB ? { ...couple.partnerB } : {})
    setEditChildren(couple.children || [])
    setEditType(getClientType(couple))
    setEditBillingAddress(couple?.billingAddress || '')
    setShowEditModal(true)
  }, [couple, getClientType])

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
