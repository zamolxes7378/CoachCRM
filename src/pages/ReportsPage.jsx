import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ReportIcon from '../components/ReportIcon'
import { useData } from '../context/DataContext'
import { AiTransparencyBanner } from '../components/AiTransparencyBanner'
import { supabase } from '../lib/supabase.js'

export default function ReportsPage() {
  const navigate = useNavigate()
  const { reports, formatRelativeDate, getPhaseLabel, refreshData } = useData()

  const handleValidateAiReport = async (reportId) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    await supabase.from('reports').update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser?.id ?? null,
    }).eq('id', reportId)
    refreshData()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Comptes Rendus</h1>
      </div>

      <div className="card">
        {reports.map(report => (
          <div key={report.id}>
            {report.ai_generated && (
              <AiTransparencyBanner
                report={report}
                onValidate={() => handleValidateAiReport(report.id)}
              />
            )}
            <div className="report-item" onClick={() => navigate(`/reports/${report.id}`)}>
              <div className="report-icon">
                <ReportIcon size={20} />
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
          </div>
        ))}
      </div>
    </div>
  )
}
