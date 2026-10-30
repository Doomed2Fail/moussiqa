# Moussiqa

**Vibez avec ER-RAFIY & SAADEDDINE.** Application musicale réalisée par **ER-RAFIY Taha Amine et SAADEDDINE Zineb** : Vue 3, Vite, Vue Router et Composition API, sans Pinia. Interface glass mauve, lecteur audio, recherche, favoris et playlists. Backend PocketBase et connexion Spotify facultative.

## 1. API Spotify

Moussiqa intègre la **Spotify Web API** pour accéder au catalogue musical et le **Web Playback SDK** pour la lecture.

Après avoir lancé Moussiqa, cliquer sur **Connexion**, puis autoriser l’application sur le site officiel Spotify avec **son propre compte**. La bibliothèque locale reste utilisable sans cette étape. La déconnexion Spotify ramène à la bibliothèque locale.

- Le Client ID public de l’application est prérempli. Aucun **Client Secret** n’est utilisé : authentification OAuth Authorization Code avec **PKCE**.
- En mode développement Spotify, le propriétaire de l’application doit autoriser le compte de chaque utilisateur de test dans **Users and Access** du Spotify Developer Dashboard. Les règles et quotas Spotify restent applicables.
- La lecture complète avec le Web Playback SDK nécessite un compte Spotify Premium éligible et une connexion Internet. Sans cela, utiliser les morceaux locaux.
- Les adresses de retour doivent correspondre exactement à l’adresse utilisée : `http://127.0.0.1:8080/callback` ou `http://127.0.0.1:5173/callback`.
- Il n’est pas nécessaire de créer sa propre application Spotify Developer si son compte a été autorisé pour le Client ID fourni. Pour utiliser sa propre application Spotify Developer, saisir son **Client ID public** dans le dialogue de connexion et enregistrer ces adresses de retour. Ne jamais fournir de Client Secret.
- Les jetons Spotify restent dans `sessionStorage` du navigateur ; ils ne sont ni enregistrés dans le dépôt ni envoyés à PocketBase.

Documentation officielle : [PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow), [mode développement](https://developer.spotify.com/documentation/web-api/concepts/quota-modes), [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk).

## 2. Sans compte Spotify Developer : huit morceaux de test

Vous n’avez pas de compte Spotify Developer ou vous souhaitez simplement tester Moussiqa sans configurer Spotify ? **Nous fournissons huit morceaux de test directement dans le projet.** La bibliothèque locale s’ouvre par défaut.

La bibliothèque contient **8 compositions instrumentales originales de démonstration de 32 secondes**, réparties en 4 albums. Ce sont des fichiers WAV inclus dans le dépôt, pas des morceaux commerciaux téléchargés depuis Spotify.

**Aucune clé API, aucun compte Spotify et aucun mot de passe ne sont nécessaires pour les écouter.**

Vous pouvez rechercher un titre, lancer la lecture, régler le volume, ajouter des favoris et créer des playlists. Par exemple, recherchez **Horizon** puis cliquez sur Lecture.

## 3. Faire fonctionner Moussiqa sur votre machine

Choisissez l’une des deux méthodes ci-dessous. Docker lance l’application complète avec son backend ; Node.js permet de démarrer le frontend seul.

### Option recommandée : Docker (Windows, macOS ou Linux)

Installer Git et Docker Desktop (ou Docker Engine + Compose sous Linux), puis démarrer Docker. Dans un terminal :

```sh
git clone https://github.com/Doomed2Fail/moussiqa.git
cd moussiqa
docker compose up --build -d
```

Ouvrir **http://127.0.0.1:8080**. Cliquer sur **Lancer l’écoute**, rechercher « Horizon », ajouter un favori ou créer une playlist. Le backend est initialisé automatiquement : aucun compte administrateur à configurer.

```sh
docker compose down     # arrêter, en conservant les données
```

Après la première construction, relancer avec `docker compose up -d`. L’installation initiale nécessite Internet pour télécharger le dépôt, les images Docker et les dépendances. Ensuite, la bibliothèque locale, les polices et l’interface fonctionnent sans Internet tant que les services locaux sont démarrés. Le premier chargement des images Docker peut prendre plusieurs minutes.

### Option sans Docker : frontend seul

Installer **Node.js 22 LTS ou supérieur** et Git :

```sh
git clone https://github.com/Doomed2Fail/moussiqa.git
cd moussiqa/frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Ouvrir **http://127.0.0.1:5173**. Les huit morceaux, la recherche, les favoris et les playlists fonctionnent même si le backend est absent. Les préférences sont alors conservées uniquement dans ce navigateur. Arrêter avec `Ctrl+C`.

Pour développer avec le backend, depuis la racine du dépôt : `docker compose up -d pocketbase`, puis lancer Vite comme ci-dessus. Vite relaie `/api` vers le port 8090.

## 4. Importer vos propres morceaux

Cliquer sur **Importer des morceaux** dans la bibliothèque locale. Sélectionner des fichiers MP3, WAV, OGG, M4A ou FLAC. Leur prise en charge dépend des codecs du navigateur ; WAV et MP3 sont les plus simples pour une démonstration.

Les fichiers importés sont conservés dans **IndexedDB sur cet appareil**, sans envoi au backend ni à Spotify. Ils restent disponibles après actualisation à la même adresse et dans le même profil de navigateur. Effacer les données du site ou changer de navigateur/adresse les rend indisponibles. L’espace disponible dépend du navigateur. Les fichiers personnels ne sont jamais ajoutés à ce dépôt.

## 5. Structure et technologies

```text
moussiqa/
├── compose.yaml                 # frontend Nginx + backend PocketBase
├── .env.example                 # ports uniquement ; aucune donnée secrète
├── backend/pb_hooks/init.pb.js   # initialisation automatique des collections et règles
└── frontend/
    ├── src/
    │   ├── components/          # lecteur, pistes, pochettes et dialogues
    │   ├── views/               # accueil/recherche, collections, retour OAuth
    │   ├── router/              # routes Vue Router
    │   ├── composables/         # état partagé reactive(), sans Pinia
    │   ├── services/            # audio local, Spotify PKCE/SDK et PocketBase
    │   └── assets/              # styles et identité visuelle
    ├── public/demo/             # huit WAV inclus
    ├── public/fonts/            # licences des polices
    └── scripts/generate-demo.mjs
```

Les composants communiquent par props et événements ; les composables partagent la bibliothèque et le lecteur avec la Composition API. Le lecteur local utilise l’élément audio HTML ; Spotify utilise son SDK officiel.

Le backend fourni prêt à l’emploi est **[PocketBase](https://pocketbase.io/)**, exécuté avec l’image Docker communautaire **[muchobien/pocketbase](https://github.com/muchobien/pocketbase-docker)**, version épinglée 0.40.6. Les collections sont créées au démarrage. Un identifiant de visiteur aléatoire est créé automatiquement, sans formulaire d’inscription. Seuls les favoris et playlists locaux sont sauvegardés ; les règles limitent chaque sauvegarde à son propriétaire. Les fichiers audio personnels restent dans le navigateur. Le volume Docker `pb_data` conserve la base ; ne pas utiliser `docker compose down -v` si vous voulez la garder.

## 6. Configuration et protection des données

Le dépôt exclut les fichiers `.env`, bases de données, jetons, fichiers personnels, journaux et dépendances installées. Le Client ID Spotify est un identifiant public, pas un secret. Les sauvegardes et sessions créées pendant l’utilisation restent sur le PC utilisateur. Les ports sont liés à `127.0.0.1` par défaut pour une exécution locale.

En cas de port occupé, copier `.env.example` vers `.env` et modifier `APP_PORT` ou `POCKETBASE_PORT`. Un port frontend différent nécessite aussi une adresse de retour Spotify correspondante. Pour Vite, utiliser `npm run dev -- --host 127.0.0.1 --port 5174` ; le mode local fonctionne à cette adresse, mais Spotify nécessite la nouvelle adresse de retour.

## 7. Vérifications et dépannage

```sh
cd frontend
npm ci
npm test
npm run build
```

- Docker inaccessible : démarrer Docker Desktop et réessayer.
- Application inaccessible : vérifier `docker compose ps` et `docker compose logs --tail 50`.
- Le son ne démarre pas : cliquer explicitement sur Lecture et vérifier le volume du navigateur et du système.
- Spotify refuse la connexion : vérifier le compte autorisé, les adresses de retour et les autorisations ; se reconnecter pour renouveler une ancienne session. Le mode local reste disponible.
- Le backend est arrêté : l’écoute et les préférences locales continuent de fonctionner ; la sauvegarde serveur reprend lors d’une prochaine modification lorsqu’il redevient disponible.

## 8. Licences

Les morceaux de démonstration sont sous **CC0** : voir `frontend/public/demo-LICENSE.txt`. Les polices Manrope et Space Grotesk sont fournies localement avec leurs licences dans `frontend/public/fonts/`. Les bibliothèques tierces conservent leurs licences respectives.

## Prêt à écouter

Une fois Moussiqa démarrée, ouvrez son adresse locale et cliquez sur **Lancer l’écoute**. Les huit morceaux inclus permettent de tester immédiatement l’application sans compte. Pour explorer le catalogue Spotify, utilisez ensuite **Connexion** avec un compte autorisé.
