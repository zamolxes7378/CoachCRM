import body from '../../../docs/legal/cgu.md?raw'

export default function CguPage() {
  return (
    <article className="legal-page">
      <h1>Conditions Générales d'Utilisation</h1>
      <pre className="legal-body">{body}</pre>
    </article>
  )
}
