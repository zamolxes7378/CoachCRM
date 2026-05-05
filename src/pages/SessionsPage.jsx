import { usePageTitle } from '../hooks/usePageTitle'

export default function SessionsPage() {
  usePageTitle('Séances')
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Séances</h1>
      </div>
    </div>
  )
}
