# 🌴 PalmTrace Morocco - Application de Traçabilité des Palmiers

Une application web moderne pour la gestion et la traçabilité des palmiers au Maroc, développée avec React, TypeScript et Supabase.

## ✨ Fonctionnalités

- 🗺️ **Cartographie Interactive** - Visualisation des palmiers sur Google Maps
- 📊 **Import Excel** - Traitement et import de données Excel
- 🔐 **Authentification** - Système d'authentification sécurisé
- 👥 **Gestion des Rôles** - Contrôle d'accès basé sur les rôles
- 📱 **Interface Responsive** - Compatible mobile et desktop
- ⚡ **Temps Réel** - Synchronisation en temps réel des données

## 🛠️ Technologies Utilisées

- **Frontend**: React 18, TypeScript, Vite
- **UI/UX**: Tailwind CSS, Shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth)
- **Cartes**: Google Maps API
- **Bundler**: Vite
- **Package Manager**: Bun/npm

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+ 
- npm ou bun
- Compte Supabase
- Clé API Google Maps

### 1. Cloner le projet
```bash
git clone https://github.com/VOTRE-USERNAME/palm-trace-morocco.git
cd palm-trace-morocco
```

### 2. Installer les dépendances
```bash
npm install
# ou
bun install
```

### 3. Configuration des variables d'environnement
Copiez `.env.example` vers `.env` et remplissez vos clés :

```env
VITE_SUPABASE_PROJECT_ID="votre-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="votre-publishable-key"
VITE_SUPABASE_URL="https://votre-project-id.supabase.co"
```

### 4. Lancer le serveur de développement
```bash
npm run dev
# ou
bun dev
```

L'application sera accessible sur `http://localhost:5173`

## 📋 Scripts Disponibles

- `npm run dev` - Démarrer le serveur de développement
- `npm run build` - Construire pour la production
- `npm run preview` - Prévisualiser la build de production
- `npm run lint` - Linter le code

## 🏗️ Architecture du Projet

```
src/
├── components/         # Composants React réutilisables
│   ├── ui/            # Composants UI (shadcn/ui)
│   ├── GoogleMap.tsx  # Composant carte principal
│   └── ...
├── pages/             # Pages de l'application
├── hooks/             # Hooks React personnalisés
├── integrations/      # Intégrations externes (Supabase)
├── lib/               # Utilitaires et configurations
└── utils/             # Fonctions utilitaires
```

## 🌐 Déploiement

### Vercel (Recommandé)
1. Connectez votre repo GitHub à Vercel
2. Configurez les variables d'environnement
3. Déployez automatiquement

### Netlify
1. Connectez votre repo à Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`

## 🤝 Contribution

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue sur GitHub.

---

**Développé avec ❤️ pour la gestion durable des palmiers au Maroc**

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fc31de5c-fe54-4888-a949-ba3149a2621b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
