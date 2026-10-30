<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  Search,
  X,
  Plus,
  Heart,
  Disc3,
  AudioLines
} from 'lucide-vue-next'
import { useLibrary } from '../composables/useLibrary'
import { usePlayer } from '../composables/usePlayer'
import { filterTracks, normalize } from '../services/utils'
import AlbumCard from '../components/AlbumCard.vue'
import CoverArt from '../components/CoverArt.vue'
import TrackList from '../components/TrackList.vue'
const library = useLibrary()
const player = usePlayer()
const route = useRoute()
// Deux nappes de fréquences dessinées pour l’identité Moussiqa.
const soundRibbons = [0, 1].map(layer => Array.from({ length: 27 }, (_, strand) => {
  const points = Array.from({ length: 91 }, (_, step) => {
    const t = step / 90
    const envelope = Math.sin(Math.PI * t)
    const x = 38 + t * 524
    const y = 199 + Math.sin(t * Math.PI * 2.25 + layer * 2.5) * envelope * 90
      + (strand - 13) * (2.5 + envelope * 2.1)
      + Math.cos(t * Math.PI * 3 + strand * 0.045 + layer) * envelope * 16
    return `${step ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
  })
  return points.join(' ')
}))

const query = ref('')
const audioInput = ref(null)
async function importAudio(event) {
  try { await library.importAudio(event.target.files) } catch {}
  event.target.value = ''
}
const activeGenre = ref('Tout')
const isSearch = computed(() => route.name === 'search')
const isLibrary = computed(() => route.name === 'library')
const selectedTracks = computed(() => {
  const base =
    library.mode === 'spotify' && query.value
      ? library.spotifySearchTracks
      : filterTracks(library.tracks, query.value)
  return base.filter((t) => activeGenre.value === 'Tout' || t.genre === activeGenre.value)
})
const selectedAlbums = computed(() => {
  const base =
    library.mode === 'spotify' && query.value
      ? library.spotifySearchAlbums
      : library.albums
  return base.filter(
    (a) =>
      (library.mode === 'spotify' || !query.value ||
        normalize(`${a.title} ${a.artist} ${a.genre || ''}`).includes(normalize(query.value))) &&
      (activeGenre.value === 'Tout' || a.genre === activeGenre.value)
  )
})
let searchTimer
watch(query, (val) => {
  clearTimeout(searchTimer)
  if (library.mode === 'spotify' && val.trim()) {
    searchTimer = setTimeout(() => library.search(val.trim()), 300)
  }
})
watch(
  () => [route.name, route.query.q],
  () => {
    query.value = String(route.query.q || '')
    activeGenre.value = 'Tout'
  },
  { immediate: true }
)
function playSelection() {
  if (library.tracks.length) player.play(library.tracks[0], library.tracks)
}
function resetFilters() {
  query.value = ''
  activeGenre.value = 'Tout'
}
</script>

<template>
  <div class="browse-view page-content">
    <div v-if="library.mode === 'local'" class="section-heading">
      <span class="small muted">ÉCOUTE LOCALE · SANS COMPTE</span>
      <button class="secondary-button" :disabled="library.importing" @click="audioInput.click()"><Plus :size="17" />{{ library.importing ? 'Import en cours…' : 'Importer des morceaux' }}</button>
      <input ref="audioInput" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac" multiple hidden @change="importAudio" />
    </div>
    <template v-if="!isSearch && !isLibrary">
      <div class="welcome-line">
        <div>
          <p class="eyebrow">MOUSSIQA · LE SON DE NOTRE GÉNÉRATION</p>
          <h1>Ton univers. Tes vibes<span class="lime">.</span></h1>
        </div>
        <span class="edition-label">VOTRE SÉLECTION<br /><strong>VOL. 001 / MOUSSIQA</strong></span>
      </div>
      <section class="hero-banner" aria-label="Sélection du moment">
        <div class="hero-copy">
          <span class="hero-tag"><span></span>LA SIGNATURE MOUSSIQA</span>
          <h2 class="signature-hook">
            <span>Vibez avec</span
            ><em
              >ER-RAFIY <span class="hook-amp">&amp;</span><br />SAADEDDINE<span class="hook-dot"
                >.</span
              ></em
            >
          </h2>
          <p>
            Du son, du style, et des vibes à partager.<br class="desktop-break" />
            Bienvenue dans notre univers musical.
          </p>
          <button class="primary-button" :disabled="!library.tracks.length" @click="playSelection">
            <Play :size="19" fill="currentColor" />Lancer l’écoute
          </button>
        </div>
        <div class="hero-art frequency-art" aria-hidden="true">
          <svg class="frequency-sculpture" viewBox="0 0 600 400" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="moussiqa-lilac" x1="38" y1="100" x2="562" y2="300" gradientUnits="userSpaceOnUse">
                <stop stop-color="#8d65ed" /><stop offset=".48" stop-color="#f0d6ff" /><stop offset="1" stop-color="#b484fa" />
              </linearGradient>
              <linearGradient id="moussiqa-rose" x1="38" y1="300" x2="562" y2="100" gradientUnits="userSpaceOnUse">
                <stop stop-color="#e9a6d4" /><stop offset=".55" stop-color="#c59aff" /><stop offset="1" stop-color="#8154d6" />
              </linearGradient>
              <radialGradient id="moussiqa-halo">
                <stop stop-color="#c594f4" stop-opacity=".23" /><stop offset="1" stop-color="#a879e7" stop-opacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="300" cy="205" rx="260" ry="170" fill="url(#moussiqa-halo)" />
            <g v-for="(ribbon, layer) in soundRibbons" :key="layer" :stroke="layer ? 'url(#moussiqa-rose)' : 'url(#moussiqa-lilac)'" :class="`frequency-ribbon ribbon-${layer}`">
              <path v-for="(path, index) in ribbon" :key="index" :d="path" :opacity=".28 + Math.sin(index / 26 * Math.PI) * .6" stroke-width=".85" />
            </g>
            <path d="M59 88h18m-9-9v18M513 314h14m-7-7v14" stroke="#e5c5ff" stroke-width="1" />
            <circle cx="495" cy="83" r="2.5" fill="#eccfff" />
            <circle cx="106" cy="312" r="2" fill="#e9afd9" />
          </svg>

        </div>
      </section>
      <div class="discovery-heading">
        <div class="section-heading">
          <div>
            <h2>Dans vos oreilles</h2>
            <p class="muted">Une nouvelle couleur pour chaque humeur.</p>
          </div>
          <RouterLink to="/bibliotheque" class="subtle-link"
            >Tout explorer<ArrowRight :size="17"
          /></RouterLink>
        </div>
        <div class="genre-pills">
          <button
            v-for="genre in ['Tout', ...library.genres]"
            :key="genre"
            :class="{ active: activeGenre === genre }"
            :aria-pressed="activeGenre === genre"
            @click="activeGenre = genre"
          >
            {{ genre }}
          </button>
        </div>
      </div>
      <div v-if="selectedAlbums.length" class="album-grid">
        <AlbumCard v-for="album in selectedAlbums.slice(0, 8)" :key="album.id" :album="album" />
      </div>
      <div v-else class="empty-state">
        <Disc3 :size="36" />
        <h3>La scène est à vous</h3>
        <p>
          {{
            library.mode === 'server'
              ? 'Ajoutez vos fichiers dans le dossier music, lancez un scan Navidrome et actualisez.'
              : 'Aucun album pour ce filtre.'
          }}
        </p>
      </div>
      <section class="tracks-section">
        <div class="section-heading">
          <div>
            <h2>{{ library.recentTracks.length ? 'On remet ça ?' : 'Les premières notes' }}</h2>
            <p class="muted">
              {{
                library.recentTracks.length
                  ? 'Vos dernières écoutes, à portée de main.'
                  : 'Appuyez sur lecture. Laissez le reste suivre.'
              }}
            </p>
          </div>
          <span class="small muted">{{
            library.mode === 'local' ? 'COMPOSITIONS ORIGINALES' : 'VOTRE COLLECTION'
          }}</span>
        </div>
        <TrackList
          :tracks="
            (library.recentTracks.length ? library.recentTracks : selectedTracks).slice(0, 5)
          "
        />
      </section>
      <section v-if="library.mode === 'local'" class="connect-banner">
        <div class="connect-icon"><Disc3 :size="27" /></div>
        <div>
          <h3>Et si on écoutait votre collection ?</h3>
          <p>Vos morceaux inclus sont disponibles sans connexion. Spotify reste facultatif.</p>
        </div>
        <button class="subtle-link" @click="library.dialog = 'login'">
          Connecter Spotify<ArrowUpRight :size="19" />
        </button>
      </section>
    </template>
    <template v-else>
      <div class="page-heading">
        <p class="eyebrow">
          {{ isSearch ? 'LE PROCHAIN COUP DE CŒUR EST ICI' : 'TOUT CE QUI VOUS RESSEMBLE' }}
        </p>
        <h1>
          {{ isSearch ? 'Cherchez. Trouvez. Écoutez' : 'Votre bibliothèque'
          }}<span class="lime">.</span>
        </h1>
        <p class="muted">
          {{
            isSearch
              ? 'Un titre, un artiste, une humeur… suivez votre envie.'
              : `${library.albums.length} albums · ${library.tracks.length} morceaux · ${library.playlists.length} playlists`
          }}
        </p>
      </div>
      <div class="search-field">
        <Search :size="21" /><input
          v-model="query"
          :aria-label="isSearch ? 'Rechercher dans la musique' : 'Filtrer la bibliothèque'"
          placeholder="Que voulez-vous écouter ?"
          type="search"
        /><button
          v-if="query"
          class="icon-button"
          aria-label="Effacer la recherche"
          @click="query = ''"
        >
          <X :size="18" />
        </button>
      </div>
      <div class="genre-pills">
        <button
          v-for="genre in ['Tout', ...library.genres]"
          :key="genre"
          :class="{ active: activeGenre === genre }"
          :aria-pressed="activeGenre === genre"
          @click="activeGenre = genre"
        >
          {{ genre }}
        </button>
      </div>
      <section v-if="isLibrary && !query" class="library-playlists">
        <div class="section-heading">
          <h2>Vos sélections</h2>
          <button class="subtle-link" @click="library.openPlaylistDialog()">
            <Plus :size="17" />Créer une playlist
          </button>
        </div>
        <div class="playlist-grid">
          <RouterLink to="/favoris" class="playlist-tile likes-tile"
            ><Heart :size="28" fill="currentColor" />
            <div>
              <strong>Coups de cœur</strong><span>{{ library.favorites.length }} titres aimés</span>
            </div>
            <ArrowUpRight :size="20" /></RouterLink
          ><RouterLink
            v-for="playlist in library.playlists"
            :key="playlist.id"
            :to="`/playlist/${playlist.id}`"
            class="playlist-tile"
            ><CoverArt :item="playlist" decorative />
            <div>
              <strong>{{ playlist.name }}</strong
              ><span
                >{{ playlist.songCount ?? playlist.songIds.length }} morceau{{
                  (playlist.songCount ?? playlist.songIds.length) > 1 ? 'x' : ''
                }}</span
              >
            </div>
            <ArrowUpRight :size="20"
          /></RouterLink>
        </div>
      </section>
      <section v-if="selectedAlbums.length" class="tracks-section">
        <div class="section-heading">
          <h2>Albums</h2>
          <span class="muted small"
            >{{ selectedAlbums.length }} résultat{{ selectedAlbums.length > 1 ? 's' : '' }}</span
          >
        </div>
        <div class="album-grid">
          <AlbumCard v-for="album in selectedAlbums" :key="album.id" :album="album" />
        </div>
      </section>
      <section class="tracks-section">
        <div class="section-heading">
          <h2>Morceaux</h2>
          <span class="muted small"
            >{{ selectedTracks.length }} résultat{{ selectedTracks.length > 1 ? 's' : '' }}</span
          >
        </div>
        <TrackList v-if="selectedTracks.length" :tracks="selectedTracks" />
        <div v-else class="empty-state">
          <Search :size="34" />
          <h3>
            {{
              query
                ? 'Pas encore la bonne fréquence'
                : 'Votre collection attend ses premières notes'
            }}
          </h3>
          <p>
            {{
              query
                ? 'Essayez un autre titre ou retirez un filtre.'
                : 'Importez vos fichiers audio dans la bibliothèque locale.'
            }}
          </p>
          <button
            v-if="query || activeGenre !== 'Tout'"
            class="secondary-button"
            @click="resetFilters"
          >
            Effacer les filtres
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
