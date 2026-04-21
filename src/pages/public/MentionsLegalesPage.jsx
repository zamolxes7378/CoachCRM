import body from '../../../docs/legal/mentions-legales.md?raw'

export default function MentionsLegalesPage() {
  return (
    <article className="legal-page">
      <h1>Mentions légales</h1>
      <pre className="legal-body">{body}</pre>
    </article>
  )
}
