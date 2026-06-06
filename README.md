# 🃏 BarbuScore

BarbuScore est une application web et mobile responsive premium pour compter les points et suivre les manches du célèbre jeu de cartes du **Barbu** (aussi appelé **King**).

L'application est conçue comme une Single Page Application (SPA) légère, fonctionnant entièrement côté client (100% hors-ligne) et optimisée pour une expérience tactile sur smartphone et tablette.

## ✨ Fonctionnalités

- **Enregistrement des Joueurs** : Créez des profils de joueurs avec leur nom et leur photo (capture instantanée via la webcam/caméra ou importation depuis la galerie).
- **Stockage Persistant Local** : 
  - **IndexedDB** : Stockage robuste des photos des joueurs (évite la saturation de la mémoire).
  - **LocalStorage** : Historique des parties jouées et sauvegarde automatique en temps réel de la partie en cours.
- **Suivi Dynamique de Partie** :
  - Matrice interactive de 28 manches (4 joueurs × 7 contrats).
  - Indication claire de quel joueur doit choisir son contrat à chaque donne.
- **Saisie & Calcul Automatiques** :
  - Formulaires intelligents et adaptés à chaque contrat (compteurs de plis/dames/cœurs, sélection directe du joueur pénalisé).
  - Validation de cohérence en temps réel (ex: blocage si la somme des plis saisis n'est pas égale à 8).
  - Distribution automatique des scores selon le contrat.
- **Règles & Barèmes Personnalisables** : Modifiez les points attribués à chaque contrat (positifs et négatifs) directement depuis l'écran des paramètres.
- **Podium & Historique** : Célébrez les gagnants avec un podium animé et rejouez les détails manche par manche des anciennes parties.
- **Design Premium Sombre** : Interface élégante avec Glassmorphism, animations fluides, polices modernes (Inter & Outfit) et adaptabilité totale sur mobile.

---

## 📜 Les Contrats Inclus

### Contrats Négatifs (Pénalités)
1. **Le Barbu** : Éviter de remporter le pli contenant le Roi de Cœur (`-40 points` par défaut).
2. **Les Dames** : Éviter de prendre des Dames (`-6 points` par Dame, total `-24`).
3. **Les Plis** : Éviter de prendre des plis (`-2 points` par pli, total `-16`).
4. **Les Cœurs** : Éviter de prendre des Cœurs (`-2 points` par Cœur, total `-16`).
5. **Le Dernier Pli** : Éviter de remporter l'ultime pli de la donne (`-20 points` par défaut).
6. **La Salade** : Cumule toutes les pénalités ci-dessus en une seule donne (`-116 points` au total).

### Contrat Positif (Bonus)
7. **La Réussite (Domino)** : Course de défausse. Les points sont attribués selon l'ordre d'arrivée des joueurs (par défaut: `+100` pour le 1er, `+50` pour le 2e, `0` pour le 3e et `0` pour le 4e).

---

## 🚀 Comment lancer l'application

L'application ne nécessite aucune installation de dépendances ou de serveur lourd. Elle est autonome.

### Méthode 1 : Lancement direct
Double-cliquez simplement sur le fichier `index.html` pour ouvrir l'application dans votre navigateur internet préféré.

### Méthode 2 : Lancement avec un serveur web local
Pour tester les fonctionnalités de la caméra (qui nécessitent parfois un contexte sécurisé HTTPS ou localhost dans certains navigateurs), vous pouvez lancer un petit serveur local.

Si vous avez **Python** installé :
```bash
python -m http.server 8000
```
Puis ouvrez [http://localhost:8000](http://localhost:8000) dans votre navigateur.

Si vous préférez **Node.js** (avec `npx`) :
```bash
npx http-server -p 8000
```

---

## 🛠️ Technologies Utilisées

- **Core** : HTML5 sémantique, ES6 JavaScript.
- **Styling** : Vanilla CSS moderne (Flexbox, CSS Grid, variables, animations keyframes, Backdrop Blur).
- **Bases de données locales** : IndexedDB, LocalStorage.
