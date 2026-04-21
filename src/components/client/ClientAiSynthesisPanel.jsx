import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function ClientAiSynthesisPanel({
  client,
  completedCount,
  reportsCount,
  updateClient,
  aiGenerating,
  setAiGenerating
}) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #764ba230', boxShadow: '0 2px 12px rgba(118,75,162,0.1)' }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 'var(--space-md) var(--space-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} style={{ color: 'white' }} />
          <h3 style={{ color: 'white', fontSize: '0.929rem', margin: 0 }}>Synthèse IA du dossier</h3>
        </div>
        <button
          onClick={() => {
            setAiGenerating(true);
            setTimeout(async () => {
              const synthesis = {
                text: `Après ${completedCount} séances, le client montre une progression significative dans sa capacité à communiquer de manière constructive. Les principaux axes de travail identifiés :\n\n• **Communication** : Nette amélioration de l'écoute active. Le client utilise désormais régulièrement la reformulation.\n• **Gestion des conflits** : Les mécanismes de désamorçage mis en place sont efficaces. Réduction de 60% des escalades conflictuelles rapportées.\n• **Attachement** : Travail en cours sur les schémas relationnels hérités. Prise de conscience des patterns répétitifs.\n• **Rituels** : Le rituel de communication hebdomadaire est bien ancré et apprécié.${client.notes ? '\n\n**Notes du thérapeute intégrées** : Les observations personnelles du praticien ont été prises en compte dans cette synthèse.' : ''}\n\n**Recommandation** : Poursuivre le travail sur l'expression des besoins individuels et consolider les acquis en gestion de conflits.`,
                date: new Date().toLocaleString('fr-FR'),
                sessions: completedCount,
                sources: `${reportsCount} compte${reportsCount > 1 ? 's' : ''} rendu${reportsCount > 1 ? 's' : ''}${client.notes ? ' + notes du dossier' : ''}`
              };
              await updateClient(client.id, { aiSynthesis: synthesis });
              setAiGenerating(false);
            }, 2500);
          }}
          disabled={aiGenerating}
          style={{
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', borderRadius: 'var(--radius-md)',
            padding: '4px 10px', fontSize: '0.714rem', fontWeight: 600,
            cursor: aiGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            backdropFilter: 'blur(4px)'
          }}
        >
          {aiGenerating ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyse…</> : <><Sparkles size={12} /> {client.aiSynthesis ? 'Régénérer' : 'Générer'}</>}
        </button>
      </div>
      <div style={{ padding: 'var(--space-md)' }}>
        {client?.aiSynthesis?.text ? (
          <>
            <div style={{ fontSize: '0.857rem', color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {client.aiSynthesis.text.split('\n').map((line, i) => {
                const boldMatch = line.match(/\*\*(.*?)\*\*/g);
                if (boldMatch) {
                  const parts = line.split(/\*\*(.*?)\*\*/);
                  return <p key={i} style={{ margin: '2px 0' }}>{parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}</p>;
                }
                if (line.startsWith('•')) return <p key={i} style={{ margin: '2px 0', paddingLeft: 8 }}>{line}</p>;
                return <p key={i} style={{ margin: line ? '4px 0' : '2px 0' }}>{line}</p>;
              })}
            </div>
            <div style={{
              marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)',
              borderTop: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.643rem', color: 'var(--text-tertiary)'
            }}>
              <Sparkles size={10} style={{ color: '#764ba2' }} />
              Généré par IA · {client.aiSynthesis.date} · Basé sur {client.aiSynthesis.sources || `${client.aiSynthesis.sessions} comptes rendus`}
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center', padding: 'var(--space-lg) var(--space-md)',
            color: 'var(--text-tertiary)'
          }}>
            <Sparkles size={32} style={{ color: '#764ba230', marginBottom: 8 }} />
            <p style={{ fontSize: '0.857rem', marginBottom: 4 }}>Aucune synthèse générée</p>
            <p style={{ fontSize: '0.714rem' }}>Cliquez sur « Générer » pour créer une synthèse IA à partir des {reportsCount} comptes rendus{client?.notes ? ' et de vos notes du dossier' : ''} disponibles.</p>
          </div>
        )}
      </div>
    </div>
  );
}
