import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, AlertTriangle, PenTool, TrendingUp, BookOpen, Heart, Clock } from 'lucide-react'
import { useData } from '../context/DataContext'

export default function ReportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { reports: mockReports, formatDate, getPhaseLabel } = useData()
  const report = mockReports.find(r => r.id === id)

  if (!report) {
    return <div className="empty-state"><p>Compte rendu non trouvé</p></div>
  }

  return (
    <div className="report-view">
      <button className="btn btn-ghost" onClick={() => navigate('/reports')} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={18} /> Retour
      </button>

      {/* Report Header */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--accent-main)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>{report.coupleName} · Séance #{report.sessionNumber}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="caption" style={{ color: 'var(--text-secondary)' }}>{formatDate(report.date)}</span>
              <span className="caption" style={{ color: 'var(--text-secondary)' }}>· {report.duration}</span>
              <span className={`badge badge-${report.phase}`}>{getPhaseLabel(report.phase)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé narratif */}
      <div className="report-section">
        <div className="report-section-header">
          <FileText size={20} />
          <h3>Résumé narratif</h3>
        </div>
        <div className="report-narrative">{report.narrative}</div>
      </div>

      {/* Thèmes */}
      <div className="report-section">
        <div className="report-section-header">
          <BookOpen size={20} />
          <h3>Thèmes abordés</h3>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {report.themes.map((t, i) => (
            <span key={i} className="badge" style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', padding: '4px 12px' }}>{t}</span>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-lg)' }}>
        {/* Émotions Partenaire A */}
        <div className="report-section">
          <div className="report-section-header">
            <Heart size={20} />
            <h3>Émotions — Partenaire A</h3>
          </div>
          <ul className="report-list">
            {report.emotionsA.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>

        {/* Émotions Partenaire B */}
        <div className="report-section">
          <div className="report-section-header">
            <Heart size={20} />
            <h3>Émotions — Partenaire B</h3>
          </div>
          <ul className="report-list">
            {report.emotionsB.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      </div>

      {/* Patterns */}
      <div className="report-section">
        <div className="report-section-header">
          <Clock size={20} />
          <h3>Patterns identifiés</h3>
        </div>
        <ul className="report-list">
          {report.patterns.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </div>

      {/* Progrès */}
      <div className="report-section">
        <div className="report-section-header">
          <TrendingUp size={20} />
          <h3>Progrès constatés</h3>
        </div>
        <ul className="report-list">
          {report.progress.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </div>

      {/* Points de vigilance */}
      {report.vigilance.length > 0 && (
        <div className="report-section">
          <div className="report-section-header">
            <AlertTriangle size={20} />
            <h3>Points de vigilance</h3>
          </div>
          {report.vigilance.map((v, i) => (
            <div className="report-alert" key={i}>
              <AlertTriangle />
              <span>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Exercices prescrits */}
      <div className="report-section">
        <div className="report-section-header">
          <PenTool size={20} />
          <h3>Exercices prescrits</h3>
        </div>
        <ul className="report-list">
          {report.exercises.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>

      {/* Contenu pédagogique */}
      <div className="report-section">
        <div className="report-section-header">
          <BookOpen size={20} />
          <h3>Contenu pédagogique délivré</h3>
        </div>
        <div className="card" style={{ background: '#FEF9E7', borderLeft: '3px solid var(--accent-main)' }}>
          <ul className="report-list">
            {report.pedagogicalContent.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
        <p className="caption" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
          Ce contenu sera utilisé pour la capitalisation méthodologique (Axe 3)
        </p>
      </div>
    </div>
  )
}
