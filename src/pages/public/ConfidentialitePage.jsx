import body from '../../../docs/legal/confidentialite.md?raw'

export default function ConfidentialitePage() {
  return (
    <article className="legal-page">
      <h1>Politique de confidentialité</h1>
      <pre className="legal-body">{body}</pre>
    </article>
  )
}
