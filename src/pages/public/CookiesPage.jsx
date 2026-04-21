import body from '../../../docs/legal/cookies.md?raw'

export default function CookiesPage() {
  return (
    <article className="legal-page">
      <h1>Politique en matière de cookies</h1>
      <pre className="legal-body">{body}</pre>
    </article>
  )
}
