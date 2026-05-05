# CoachCRM

CRM pour thérapeutes de couple — React + Vite + Supabase SPA déployé sur Vercel.

## Stack
- **Frontend:** React 18, Vite, React Router v6
- **Backend:** Supabase (PostgreSQL + Auth + Storage) — région EU West 2
- **Déploiement:** Vercel

## Développement local
```bash
npm install
cp .env.example .env.local   # renseigner les variables Supabase
npm run dev
```

## Conformité
Données de santé stockées dans l'UE (Supabase EU West 2). Traitement conforme RGPD Art. 9 — voir `docs/legal/confidentialite.md`.
