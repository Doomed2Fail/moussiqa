# Backend Moussiqa

PocketBase 0.40.6, lancé par Docker Compose. Le hook `pb_hooks/init.pb.js` crée les collections `moussiqa_guests` (authentification anonyme automatique) et `moussiqa_snapshots` (JSON des favoris/playlists locaux). Les règles de collection isolent les sauvegardes par propriétaire. Aucun jeton Spotify et aucun fichier audio ne sont envoyés ici.

La base se trouve dans le volume Docker `pb_data`. Le frontend passe par `/api` via Nginx ou le proxy Vite. Le service reste lié à la boucle locale. Ce paramétrage est destiné à une démonstration locale ; une exposition publique nécessite une configuration d’exploitation adaptée.
