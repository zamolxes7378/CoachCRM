import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Home, Users, FileText, Euro, Settings, HelpCircle, Mic, Sparkles, Calendar, Repeat, Brain, GripVertical, ChevronDown, ChevronRight, ArrowRight, BookOpen, Star, Lightbulb, MessageCircle, Mail, ExternalLink, Target, Search, PenTool, CreditCard, XCircle, Zap } from 'lucide-react'

export default function HelpPage() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)
  const sectionRefs = useRef([])

  // Scroll fade-in animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1'
          e.target.style.transform = 'translateY(0)'
        }
      }),
      { threshold: 0.1 }
    )
    sectionRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const addRef = el => { if (el && !sectionRefs.current.includes(el)) sectionRefs.current.push(el) }

  const guides = [
    {
      icon: Home, color: 'var(--primary-500)', bg: '#EBF8FF',
      title: 'Tableau de bord',
      desc: 'Votre vue d\'ensemble. Retrouvez vos prochaines séances, vos alertes financières et un aperçu rapide de votre activité.',
      tip: 'Les séances à venir sont classées chronologiquement. Cliquez sur une séance pour accéder directement à la fiche client.',
      to: '/'
    },
    {
      icon: Users, color: '#276749', bg: '#F0FFF4',
      title: 'Gestion des clients',
      desc: 'Créez et gérez vos dossiers clients. Chaque fiche contient l\'historique complet : séances, contacts, suivi financier et avancement thérapeutique.',
      tip: 'Utilisez le bouton Actif/Inactif pour distinguer vos clients en cours de suivi. Les clients inactifs restent accessibles mais ne génèrent plus d\'alertes.',
      to: '/clients'
    },
    {
      icon: FileText, color: '#C05621', bg: '#FFFAF0',
      title: 'Fiche client détaillée',
      desc: 'Le cœur de CoachCRM. Timeline des séances, contacts, suivi financier, synthèses IA — tout est centralisé dans une seule vue.',
      tip: 'Cliquez sur n\'importe quelle séance dans la timeline pour ouvrir le panneau de détail avec compte-rendu, données comptables et facturation.',
      to: '/clients',
      subsections: [
        { icon: Calendar, label: 'Timeline', text: 'Chaque séance est cliquable. Le panneau latéral s\'ouvre avec le détail complet.' },
        { icon: Euro, label: 'Suivi financier', text: 'Les honoraires, paiements et factures sont calculés automatiquement.' },
        { icon: Sparkles, label: 'Synthèse IA', text: 'Générez un résumé intelligent du dossier en un clic.' }
      ]
    },
    {
      icon: Euro, color: '#D97706', bg: '#FFFBEB',
      title: 'Suivi financier global',
      desc: 'Vue consolidée de votre activité financière. Chiffre d\'affaires, projections mensuelles, alertes de paiement et suivi de facturation.',
      tip: 'Les trois types d\'alertes vous aident à ne rien oublier : factures à émettre (bleu), séances à confirmer (jaune) et paiements en attente (rouge).',
      to: '/finances',
      alerts: [
        { color: 'var(--primary-500)', bg: '#EBF8FF', text: 'Factures à émettre' },
        { color: '#D97706', bg: '#FFFBEB', text: 'Séances à confirmer' },
        { color: '#C53030', bg: '#FFF5F5', text: 'Paiements en attente' }
      ]
    },
    {
      icon: Settings, color: '#4A5568', bg: '#F7FAFC',
      title: 'Paramètres',
      desc: 'Personnalisez votre parcours thérapeutique, vos tarifs et vos sources de recrutement. Tout est réorganisable par glissé-déposé.',
      tip: 'Modifiez les couleurs et noms des phases directement en cliquant dessus. Glissez les éléments pour changer l\'ordre.',
      to: '/settings'
    }
  ]

  const faqs = [
    { q: 'Comment ajouter un nouveau client ?', a: 'Rendez-vous sur la page "Mes Clients" et cliquez sur le bouton doré "+ Nouveau client" en haut à droite. Remplissez les informations du formulaire et validez.' },
    { q: 'Comment renseigner un paiement ?', a: 'Ouvrez la fiche client, cliquez sur une séance dans la timeline. Dans le panneau de détail, section "Données comptables", sélectionnez le mode de paiement (Espèces, Chèque ou Virement) et renseignez le montant.' },
    { q: 'Comment émettre une facture ?', a: 'Dans le détail d\'une séance, scrollez jusqu\'à la section "Facturation". Cochez "Besoin de facture ?", sélectionnez les séances à couvrir, puis cliquez sur "Émettre la facture".' },
    { q: 'Comment modifier le tarif d\'un client ?', a: 'Sur la fiche client, cliquez sur l\'icône crayon (✎) à côté du montant "Tarif" dans la section d\'en-tête. Attention : la modification du tarif s\'applique uniquement aux séances futures. Les séances passées conservent le tarif en vigueur au moment où elles ont eu lieu.' },
    { q: 'Comment annuler une séance ?', a: 'Ouvrez le détail de la séance en cliquant dessus, puis cliquez sur le bouton rouge "Annuler la séance" en haut à droite du panneau.' },
    { q: 'Que signifient les couleurs des alertes ?', a: 'Bleu = factures à émettre (nombre de séances). Moutarde \"? CONFIRMER\" = séance à confirmer, ce badge apparaît dans le détail par séance lorsque le mode de paiement n\'a pas encore été renseigné. Il est lié à l\'alerte globale \"Séances à confirmer\". Rouge = paiements en attente d\'encaissement, cette alerte affiche le montant total restant dû en euros. En cliquant sur l\'alerte rouge, un modèle de relance pré-rempli s\'ouvre automatiquement.' },
    { q: 'La modification du tarif impacte-t-elle les séances passées ?', a: 'Non. La modification du tarif dans les paramètres ou dans l\'en-tête de la fiche client s\'applique uniquement aux séances à venir. Les séances qui ont déjà eu lieu conservent le tarif qui était en vigueur à ce moment-là. Pour modifier le montant d\'une séance passée, utilisez le champ \"Montant de la séance\" dans le détail de la séance.' },
    { q: 'Quels champs sont modifiables dans le détail d\'une séance ?', a: 'Le champ "Montant de la séance" (juste sous Données comptables) est le seul montant modifiable. Il définit le prix de la séance. Le "Montant du paiement" et le "Montant facturé" sont des champs calculés automatiquement à partir du montant de la séance : ils ne sont pas modifiables directement.' },
    { q: 'Comment fonctionne un paiement couvrant plusieurs séances ?', a: 'Lorsqu\'un paiement couvre plusieurs séances, ce sont les montants individuels de chaque séance (\"Montant de la séance\") qui déterminent le statut affiché dans la colonne tarif du suivi financier. L\'encaissement ou le non-encaissement du paiement global impacte le statut de chaque séance individuellement.' }
  ]

  const tips = [
    { icon: Mic, label: 'Dictée vocale', text: 'Dictez vos comptes-rendus avec le bouton micro' },
    { icon: Sparkles, label: 'IA rédactrice', text: 'Améliorez vos textes en un clic avec l\'IA' },
    { icon: Calendar, label: 'Prochain RDV', text: 'Le prochain rendez-vous s\'affiche automatiquement' },
    { icon: Repeat, label: 'Rituo', text: 'Bientôt : créez des rituels thérapeutiques pour vos clients' },
    { icon: Brain, label: 'IA Assistant', text: 'Bientôt : analyse intelligente de vos dossiers' },
    { icon: GripVertical, label: 'Drag & Drop', text: 'Glissez-déposez pour réordonner phases et sources' }
  ]

  const cardBase = {
    background: 'white',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    border: '1px solid var(--border-light)',
    overflow: 'hidden'
  }

  const animBase = {
    opacity: 0,
    transform: 'translateY(24px)',
    transition: 'opacity 0.6s ease, transform 0.6s ease'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--space-lg) var(--space-md)' }}>

      {/* ═══ HERO ═══ */}
      <div ref={addRef} style={{
        ...animBase, ...cardBase, padding: 'var(--space-xl) var(--space-lg)',
        textAlign: 'center',
        background: 'linear-gradient(135deg, var(--primary-700) 0%, var(--primary-900) 100%)',
        border: 'none', color: 'white', marginBottom: 'var(--space-lg)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(255,255,255,0.04)'
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -30, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(255,255,255,0.03)'
        }} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-main) 0%, #F6AD55 100%)',
          marginBottom: 'var(--space-md)', boxShadow: '0 4px 20px rgba(218,165,32,0.3)'
        }}>
          <Heart size={32} style={{ color: 'white' }} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Bienvenue sur CoachCRM
        </h1>
        <p style={{ fontSize: '1rem', opacity: 0.85, maxWidth: 500, margin: '0 auto var(--space-md)', lineHeight: 1.6 }}>
          Votre assistant de gestion pour les professionnels du bien-être.<br />
          Découvrez comment tirer le meilleur parti de chaque fonctionnalité.
        </p>
        <button
          onClick={() => document.getElementById('guide-section')?.scrollIntoView({ behavior: 'smooth' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent-main)', color: 'var(--primary-900)',
            fontSize: '0.857rem', fontWeight: 700, border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(218,165,32,0.3)', transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(218,165,32,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(218,165,32,0.3)' }}
        >
          Commencer la visite <ChevronDown size={16} />
        </button>
      </div>

      {/* ═══ GUIDE SECTIONS ═══ */}
      <div id="guide-section" style={{ marginBottom: 'var(--space-lg)' }}>
        <div ref={addRef} style={{ ...animBase, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
          <BookOpen size={20} style={{ color: 'var(--accent-main)' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Guide des fonctionnalités</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {guides.map((g, i) => {
            const Icon = g.icon
            return (
              <div key={i} ref={addRef} style={{ ...animBase, transitionDelay: `${i * 0.08}s`, ...cardBase, padding: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    background: g.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${g.color}20`
                  }}>
                    <Icon size={26} style={{ color: g.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{g.title}</h3>
                      <button
                        onClick={() => navigate(g.to)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: '0.714rem', fontWeight: 600, color: 'var(--primary-600)',
                          background: 'var(--primary-50)', border: '1px solid var(--primary-200)',
                          borderRadius: 'var(--radius-md)', padding: '4px 12px', cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-100)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary-50)' }}
                      >
                        Accéder <ArrowRight size={12} />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.857rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>{g.desc}</p>

                    {/* Sub-sections */}
                    {g.subsections && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        {g.subsections.map((sub, j) => {
                          const SubIcon = sub.icon
                          return (
                            <div key={j} style={{
                              flex: '1 1 160px', padding: '10px 12px',
                              background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-light)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <SubIcon size={14} style={{ color: g.color }} />
                                <span style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sub.label}</span>
                              </div>
                              <p style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)', lineHeight: 1.4, margin: 0 }}>{sub.text}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Alert badges */}
                    {g.alerts && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        {g.alerts.map((a, j) => (
                          <span key={j} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 'var(--radius-md)',
                            background: a.bg, fontSize: '0.714rem', fontWeight: 600, color: a.color
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.color }} />
                            {a.text}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pro tip */}
                    <div style={{
                      display: 'flex', gap: 8, padding: '10px 14px',
                      background: '#FFFBEB', borderRadius: 'var(--radius-sm)',
                      border: '1px solid #F6E05E40'
                    }}>
                      <Lightbulb size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: '0.786rem', color: '#D97706', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                        <strong>Astuce :</strong> {g.tip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ FAQ ═══ */}
      <div ref={addRef} style={{ ...animBase, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
          <MessageCircle size={20} style={{ color: 'var(--accent-main)' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Questions fréquentes</h2>
        </div>

        <div style={{ ...cardBase, overflow: 'hidden' }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px', background: openFaq === i ? 'var(--primary-50)' : 'transparent',
                  border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                  textAlign: 'left'
                }}
                onMouseEnter={e => { if (openFaq !== i) e.currentTarget.style.background = '#FAFAFA' }}
                onMouseLeave={e => { if (openFaq !== i) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)' }}>{faq.q}</span>
                <ChevronDown size={16} style={{
                  color: 'var(--text-tertiary)', flexShrink: 0, transition: 'transform 0.2s',
                  transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)'
                }} />
              </button>
              <div style={{
                maxHeight: openFaq === i ? 200 : 0, overflow: 'hidden',
                transition: 'max-height 0.3s ease, padding 0.3s ease',
                padding: openFaq === i ? '0 20px 14px' : '0 20px'
              }}>
                <p style={{ fontSize: '0.786rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ TIPS GRID ═══ */}
      <div ref={addRef} style={{ ...animBase, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
          <Zap size={20} style={{ color: 'var(--accent-main)' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Raccourcis & Astuces</h2>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 12
        }}>
          {tips.map((t, i) => {
            const TipIcon = t.icon
            return (
              <div key={i} ref={addRef} style={{
                ...animBase, transitionDelay: `${i * 0.06}s`,
                ...cardBase, padding: '16px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 12
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--border-light)'
                }}>
                  <TipIcon size={18} style={{ color: 'var(--primary-600)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t.label}</div>
                  <div style={{ fontSize: '0.714rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{t.text}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ CONTACT ═══ */}
      <div ref={addRef} style={{
        ...animBase, ...cardBase, padding: 'var(--space-lg)',
        textAlign: 'center', marginBottom: 'var(--space-lg)',
        background: 'var(--primary-50)', border: '1px solid var(--primary-200)'
      }}>
        <HelpCircle size={28} style={{ color: 'var(--primary-400)', marginBottom: 8 }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Besoin d'aide supplémentaire ?
        </h3>
        <p style={{ fontSize: '0.857rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
          Notre équipe est là pour vous accompagner dans la prise en main de CoachCRM.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <a href="mailto:support@coachcrm.fr" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 'var(--radius-md)',
            background: 'var(--primary-700)', color: 'white',
            fontSize: '0.786rem', fontWeight: 600, textDecoration: 'none',
            transition: 'opacity 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Mail size={14} /> Contacter le support
          </a>
        </div>
      </div>

    </div>
  )
}
