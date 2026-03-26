# CoachCRM — Guide de reconstitution du projet

> Ce document contient toutes les informations nécessaires pour reconstituer le projet sur une nouvelle machine.

## 1. Prérequis

| Outil | Version | Installation |
|-------|---------|-------------|
| Node.js | v22+ | `nvm install 22` ou https://nodejs.org |
| npm | v10+ | Inclus avec Node.js |
| Git | 2.x+ | `sudo apt install git` |

## 2. Accès Git (GitHub)

- **Repo** : `git@github.com:zamolxes7378/CoachCRM.git`
- **Compte** : zamolxes7378
- **Branche principale** : `main`
- **Utilisateur Git** :
  - Nom : `Sebastian Pavel`
  - Email : `sebastian.pavel@gmail.com`

### Configurer Git sur une nouvelle machine

```bash
git config --global user.name "Sebastian Pavel"
git config --global user.email "sebastian.pavel@gmail.com"
```

### Configurer l'accès SSH

1. Générer une clé SSH :
   ```bash
   ssh-keygen -t ed25519 -C "sebastian.pavel@gmail.com"
   ```
2. Copier la clé publique :
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. Ajouter la clé sur GitHub :
   → https://github.com/settings/keys → "New SSH key" → coller la clé
4. Tester la connexion :
   ```bash
   ssh -T git@github.com
   # Attendu : "Hi zamolxes7378! You've successfully authenticated..."
   ```

### Cloner le projet

```bash
git clone git@github.com:zamolxes7378/CoachCRM.git
cd CoachCRM
npm install
```

---

## 3. Variables d'environnement (`.env`)

Créer un fichier `.env` à la racine du projet (il est dans `.gitignore`, jamais commité) :

```env
VITE_SUPABASE_URL=https://ncjdvohafipisjcslrkk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jamR2b2hhZmlwaXNqY3NscmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTM3NjMsImV4cCI6MjA4OTc2OTc2M30.GCg7Foa4HR-NOXDthpRWMYAGxWTuUWfnLUoPDC5qZ9w
```

> ⚠️ La `ANON_KEY` est une clé **publique** (côté client). Elle n'est pas secrète — la sécurité est assurée par les RLS policies sur Supabase.

---

## 4. Supabase (Backend / BDD)

| Paramètre | Valeur |
|-----------|--------|
| Organisation | CoachCRM |
| Plan | Free |
| Projet | claudia@kotech.ai's Project |
| Project ID | `ncjdvohafipisjcslrkk` |
| Région | `eu-west-2` (London) |
| URL API | `https://ncjdvohafipisjcslrkk.supabase.co` |
| BDD Host | `db.ncjdvohafipisjcslrkk.supabase.co` |
| PostgreSQL | v17 |

### Accès au dashboard Supabase

- URL : https://supabase.com/dashboard/project/ncjdvohafipisjcslrkk
- Compte : `claudia@kotech.ai` (connexion Google)

### Tables principales

- `users` — Utilisateurs (thérapeutes)
- `clients` — Clients/couples
- `sessions` — Séances de thérapie
- `reports` — Comptes-rendus
- `contacts` — Historique de contacts
- `settings` — Configuration par utilisateur
- `professionals` — Réseau professionnel

### Auth

- Provider : **Google OAuth** configuré dans Supabase Dashboard
- Redirect URL : l'URL de l'application (localhost en dev, domaine Vercel en prod)

---

## 5. Vercel (Hébergement / Déploiement)

| Paramètre | Valeur |
|-----------|--------|
| Projet | `coachcrm` |
| Compte | `claudia-7920s-projects` |
| Dashboard | https://vercel.com/claudia-7920s-projects/coachcrm |

### Déploiement

- **Automatique** : chaque `git push` sur `main` déclenche un déploiement
- **Build command** : `vite build` (via `npm run build`)
- **Output directory** : `dist/`
- **Framework** : Vite

### Variables d'environnement Vercel

Les mêmes variables `.env` doivent être configurées dans Vercel :
→ https://vercel.com/claudia-7920s-projects/coachcrm/settings/environment-variables

- `VITE_SUPABASE_URL` = `https://ncjdvohafipisjcslrkk.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = *(même valeur que dans `.env` local)*

---

## 6. Stack technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | React | 19.x |
| Bundler | Vite | 6.x |
| Routing | react-router-dom | 7.x |
| Backend | Supabase (PostgreSQL + Auth) | — |
| Icônes | lucide-react | — |
| Hébergement | Vercel | — |
| CSS | Vanilla CSS (variables CSS) | — |

---

## 7. Commandes de développement

```bash
# Lancer en dev (port 5173)
npm run dev

# Build production
npm run build

# Preview du build
npm run preview
```

---

## 8. Checklist de reconstitution rapide

- [ ] Installer Node.js v22+
- [ ] Configurer Git (nom, email)
- [ ] Générer et ajouter une clé SSH sur GitHub
- [ ] `git clone git@github.com:zamolxes7378/CoachCRM.git`
- [ ] `cd CoachCRM && npm install`
- [ ] Créer `.env` avec les variables Supabase
- [ ] `npm run dev` → vérifier que l'app tourne sur http://localhost:5173
- [ ] Se connecter avec Google (le compte doit exister dans la table `users`)

---

## 9. Contacts / Comptes

| Service | Compte | Accès |
|---------|--------|-------|
| GitHub | zamolxes7378 | SSH (sebastian.pavel@gmail.com) |
| Supabase | claudia@kotech.ai | Google OAuth |
| Vercel | claudia-7920s-projects | Google OAuth |
