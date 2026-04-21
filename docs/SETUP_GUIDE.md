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

Copier `.env.example` vers `.env` à la racine du projet (`.env` est dans `.gitignore` et ne doit jamais être commité) :

```bash
cp .env.example .env
```

Remplir les valeurs réelles dans `.env` :

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-publishable-key>
```

Les valeurs se trouvent dans le dashboard Supabase :
→ **Settings → API Keys** — onglet "API Keys" (nouveau modèle publishable/secret).
CoachCRM utilise les clés `sb_publishable_*` côté client. Les anciennes clés
`anon` / `service_role` (JWT) ont été désactivées — si vous voyez
`VITE_SUPABASE_ANON_KEY` quelque part, la valeur est obsolète et doit être
remplacée.

> ⚠️ Ne jamais commiter de valeurs réelles dans ce fichier ou dans la documentation.
> La clé publishable est côté client (public par conception) mais son exposition
> dans le code source est évitable et complique la rotation. Toujours la lire
> depuis les variables d'environnement.

---

## 4. Supabase (Backend / BDD)

| Paramètre | Valeur |
|-----------|--------|
| Organisation | CoachCRM |
| Plan | Free |
| Projet | *(voir dashboard Supabase — Settings → General)* |
| Project ID | *(voir dashboard Supabase — Settings → General)* |
| Région | `eu-west-2` (London) |
| URL API | *(voir `VITE_SUPABASE_URL` dans `.env`)* |
| BDD Host | `db.<project-id>.supabase.co` |
| PostgreSQL | v17 |

### Accès au dashboard Supabase

- URL : https://supabase.com/dashboard — sélectionner le projet CoachCRM
- Compte : *(gestionnaire du compte Supabase de l'organisation)*

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
| Compte | *(gestionnaire du compte Vercel de l'organisation)* |
| Dashboard | https://vercel.com — sélectionner le projet CoachCRM |

### Déploiement

- **Automatique** : chaque `git push` sur `main` déclenche un déploiement
- **Build command** : `vite build` (via `npm run build`)
- **Output directory** : `dist/`
- **Framework** : Vite

### Variables d'environnement Vercel

Les mêmes variables `.env` doivent être configurées dans Vercel :
→ Dashboard Vercel → projet CoachCRM → Settings → Environment Variables

- `VITE_SUPABASE_URL` — *(URL du projet Supabase, depuis Settings → API)*
- `VITE_SUPABASE_PUBLISHABLE_KEY` — *(publishable key, depuis Settings → API Keys)*

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
| Supabase | *(gestionnaire du compte org)* | Google OAuth |
| Vercel | *(gestionnaire du compte org)* | Google OAuth |
