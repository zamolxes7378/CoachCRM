import body from '../../../docs/legal/accessibilite.md?raw'

export default function AccessibilitePage() {
  return (
    <article className="legal-page">
      <h1>Déclaration d'accessibilité</h1>
      <pre className="legal-body">{body}</pre>
    </article>
  )
}
