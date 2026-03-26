import { Heart, Shield, Sparkles, Users, Euro, Calendar, ArrowRight, CheckCircle, Star, Zap, BarChart3, FileText, Repeat, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useState } from 'react'

export default function LoginPage() {
  const [hoveredFeature, setHoveredFeature] = useState(null)
  const [loginError, setLoginError] = useState(null)

  const handleGoogleLogin = async () => {
    setLoginError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      console.error('Google login error:', error)
      setLoginError('Erreur de connexion. Réessayez.')
    }
  }

  const features = [
    { icon: Users, text: 'Gestion complète des dossiers clients' },
    { icon: Calendar, text: 'Historique interactif des séances' },
    { icon: Euro, text: 'Suivi financier avec alertes contextuelles' },
    { icon: Sparkles, text: 'Synthèses et comptes-rendus IA' },
    { icon: BarChart3, text: 'Tableaux de bord et statistiques' },
    { icon: Repeat, text: 'Assistant IA pour rituels de bien-être', upcoming: true }
  ]

  const testimonials = [
    { name: 'Anne-Chantal Meyer', role: 'Thérapeute de couple, Le Mans', text: 'CoachCRM a transformé ma gestion administrative. Je gagne 2h par semaine.' },
    { name: 'Jean-Pierre Rousseau', role: 'Sophrologue, Niort', text: 'L\'IA me permet de produire des synthèses de qualité en quelques secondes.' }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A2332 0%, #0F1923 50%, #162133 100%)'
    }}>
    <div style={{
      minHeight: '100vh', display: 'flex', maxWidth: 1280, margin: '0 auto'
    }}>

      {/* ═══ LEFT — Commercial Side ═══ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 50px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(218,165,32,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -120, right: -60, width: 400, height: 400, borderRadius: '50%', background: 'rgba(218,165,32,0.04)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(218,165,32,0.03)' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #DAA520 0%, #F6AD55 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(218,165,32,0.3)'
          }}>
            <Heart size={22} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
              Coach<span style={{ fontWeight: 400, color: '#DAA520' }}>CRM</span>
            </div>
            <div style={{ fontSize: '0.643rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Praticiens du Bien-Être
            </div>
          </div>
        </div>

        {/* Main headline */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
          <h1 style={{
            fontSize: '2.5rem', fontWeight: 800, color: 'white',
            lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 16
          }}>
            Votre pratique,<br />
            <span style={{ color: '#DAA520' }}>amplifiée par l'IA</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 460 }}>
            La plateforme tout-en-un conçue pour les professionnels du bien-être. 
            Gérez vos clients, vos finances et vos comptes-rendus — le tout augmenté par l'intelligence artificielle.
          </p>
        </div>

        {/* Features grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 40,
          position: 'relative', zIndex: 1
        }}>
          {features.map((f, i) => {
            const Icon = f.icon
            const isHovered = hoveredFeature === i
            return (
              <div key={i}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 0',
                  background: 'transparent',
                  border: 'none',
                  transition: 'all 0.2s ease', cursor: 'default'
                }}
              >
                <Icon size={20} style={{ color: f.upcoming ? 'rgba(255,255,255,0.25)' : '#DAA520', flexShrink: 0 }} />
                <span style={{ fontSize: f.upcoming ? '0.786rem' : '0.929rem', color: f.upcoming ? 'rgba(255,255,255,0.3)' : (isHovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)'), fontWeight: 500, transition: 'color 0.2s' }}>{f.text}</span>
                {f.upcoming && <span style={{ fontSize: '0.571rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>V2</span>}
              </div>
            )
          })}
        </div>

        {/* Migration reassurance */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 14,
          padding: '16px 20px', marginBottom: 40,
          background: 'rgba(218,165,32,0.08)',
          borderRadius: 14, border: '1px solid rgba(218,165,32,0.15)',
          position: 'relative', zIndex: 1
        }}>
          <Upload size={22} style={{ color: '#DAA520', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '0.929rem', fontWeight: 700, color: 'white', marginBottom: 4 }}>
              Transfert garanti de votre fichier client
            </div>
            <p style={{ fontSize: '0.786rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
              Vous utilisez Excel, Google Sheets ou un autre outil ? Nous importons vos données existantes gratuitement. Aucune saisie manuelle — votre historique client est préservé.
            </p>
          </div>
        </div>

        {/* Testimonials */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{
                flex: 1, padding: '16px 18px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                  {[...Array(5)].map((_, j) => <Star key={j} size={12} style={{ color: '#DAA520', fill: '#DAA520' }} />)}
                </div>
                <p style={{ fontSize: '0.786rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 10, fontStyle: 'italic' }}>
                  « {t.text} »
                </p>
                <div style={{ fontSize: '0.714rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{t.name}</div>
                <div style={{ fontSize: '0.643rem', color: 'rgba(255,255,255,0.4)' }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT — Login Side ═══ */}
      <div style={{
        width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 50px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Welcome badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 20,
            background: 'rgba(218,165,32,0.1)', border: '1px solid rgba(218,165,32,0.2)',
            marginBottom: 24
          }}>
            <Zap size={12} style={{ color: '#DAA520' }} />
            <span style={{ fontSize: '0.714rem', fontWeight: 600, color: '#DAA520' }}>Gratuit jusqu'à 5 clients</span>
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Commencez maintenant
          </h2>
          <p style={{ fontSize: '0.857rem', color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.5 }}>
            Moins d'administratif, plus de temps pour vos clients. Rejoignez les praticiens qui modernisent leur pratique avec CoachCRM.
          </p>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: '14px 24px', borderRadius: 12,
              background: 'white', border: 'none',
              fontSize: '0.929rem', fontWeight: 600, color: '#1A2332',
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Se connecter avec Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '0.714rem', color: 'rgba(255,255,255,0.3)' }}>ou</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Email signup form */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="email"
              placeholder="Votre adresse email professionnelle"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', fontSize: '0.857rem', outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(218,165,32,0.4)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <button
            onClick={handleGoogleLogin}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 24px', borderRadius: 10,
              background: 'linear-gradient(135deg, #DAA520 0%, #F6AD55 100%)',
              border: 'none', cursor: 'pointer',
              fontSize: '0.857rem', fontWeight: 700, color: '#1A2332',
              transition: 'all 0.2s',
              boxShadow: '0 2px 12px rgba(218,165,32,0.25)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(218,165,32,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(218,165,32,0.25)' }}
          >
            Créer mon compte gratuitement <ArrowRight size={16} />
          </button>

          {/* Trust signals */}
          <div style={{
            marginTop: 24, padding: '16px 18px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', gap: 10
          }}>
            {[
              { icon: CheckCircle, text: 'Gratuit jusqu\'à 5 clients, sans engagement' },
              { icon: Shield, text: 'Données hébergées en France, conformes RGPD' },
              { icon: Sparkles, text: 'IA intégrée, aucune configuration requise' }
            ].map((item, i) => {
              const TrustIcon = item.icon
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TrustIcon size={15} style={{ color: '#DAA520', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.786rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{item.text}</span>
                </div>
              )
            })}
          </div>

          {/* Demo CTA */}
          <button
            onClick={() => window.open('mailto:contact@coachcrm.fr?subject=Demande de démo CoachCRM', '_blank')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 20, padding: '12px 20px', borderRadius: 10,
              background: 'transparent',
              border: '1.5px solid rgba(218,165,32,0.5)',
              cursor: 'pointer', fontSize: '0.857rem', fontWeight: 600,
              color: '#DAA520', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(218,165,32,0.1)'; e.currentTarget.style.borderColor = '#DAA520' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(218,165,32,0.5)' }}
          >
            <Calendar size={16} /> Prenez contact pour une démo
          </button>

          {/* Footer */}
          <p style={{ marginTop: 20, fontSize: '0.643rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
            En vous connectant, vous acceptez nos <span style={{ color: 'rgba(218,165,32,0.6)', cursor: 'pointer' }}>conditions d'utilisation</span> et notre <span style={{ color: 'rgba(218,165,32,0.6)', cursor: 'pointer' }}>politique de confidentialité</span>.
          </p>



        </div>
      </div>
    </div>
    </div>
  )
}
