import { useNavigate } from 'react-router-dom'
import { FileText, ArrowRight } from 'lucide-react'
import { useData } from '../context/DataContext'

export default function ReportsPage() {
  const navigate = useNavigate()
  const { reports, formatRelativeDate, getPhaseLabel } = useData()

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Comptes Rendus</h1>
      </div>

      <div className="card">
        {reports.map(report => (
          <div className="report-item" key={report.id} onClick={() => navigate(`/reports/${report.id}`)}>
            <div className="report-icon">
              <FileText />
            </div>
            <div className="report-info">
              <div className="report-title">{report.clientName} · Séance #{report.sessionNumber}</div>
              <div className="report-meta">
                {formatRelativeDate(report.date)} · {report.duration} ·
                <span className={`badge badge-${report.phase}`} style={{ marginLeft: 8 }}>{getPhaseLabel(report.phase)}</span>
              </div>
              <div className="report-meta" style={{ marginTop: 4 }}>
                {report.themes.join(' · ')}
              </div>
            </div>
            <div className="report-arrow">
              <ArrowRight size={18} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
