<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Play, Heart, ArrowLeft, Trash2, Music2, Disc3, X } from 'lucide-vue-next'
import { useLibrary } from '../composables/useLibrary'
import { usePlayer } from '../composables/usePlayer'
import { formatTime } from '../services/utils'
import CoverArt from '../components/CoverArt.vue'
import TrackList from '../components/TrackList.vue'
const route = useRoute()
const router = useRouter()
const library = useLibrary()
const player = usePlayer()
const playlistSongs = ref([])
const loading = ref(false)
const error = ref('')
const confirmDelete = ref(false)
let requestId = 0
const isFavorites = computed(() => route.name === 'favorites')
const isPlaylist = computed(() => route.name === 'playlist')
const collection = computed(() =>
  isFavorites.value
    ? { title: 'Coups de cœur', artist: 'Les titres qui restent.', palette: 'violet', mark: '♡' }
    : isPlaylist.value
      ? library.playlists.find((p) => p.id === route.params.id)
      : library.albums.find((a) => a.id === route.params.id)
)
const title = computed(
  () => collection.value?.title || collection.value?.name || 'Sélection introuvable'
)
const tracks = computed(() =>
  isFavorites.value
    ? library.favoriteTracks
    : isPlaylist.value
      ? playlistSongs.value
      : library.tracks.filter((t) => t.albumId === route.params.id)
)
const duration = computed(() => tracks.value.reduce((sum, t) => sum + (t.duration || 0), 0))
async function load() {
  const currentId = ++requestId
  error.value = ''
  confirmDelete.value = false
  playlistSongs.value = []
  if (!isPlaylist.value && (route.name !== 'album' || library.mode !== 'spotify')) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const data = isPlaylist.value
      ? await library.playlistTracks(route.params.id)
      : await library.albumTracks(route.params.id)
    if (currentId === requestId && isPlaylist.value) playlistSongs.value = data
  } catch (err) {
    if (currentId === requestId) error.value = err.message
  } finally {
    if (currentId === requestId) loading.value = false
  }
}
watch(() => [route.name, route.params.id, library.mode, library.playlists], load, {
  immediate: true
})
async function deletePlaylist() {
  try {
    await library.deletePlaylist(route.params.id)
    router.push('/bibliotheque')
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <div class="collection-view page-content">
    <RouterLink to="/bibliotheque" class="subtle-link back-link"
      ><ArrowLeft :size="17" />Retour à la bibliothèque</RouterLink
    >
    <template v-if="collection">
      <header class="collection-header" :class="`collection-${collection.palette || 'sage'}`">
        <CoverArt :item="collection" decorative />
        <div>
          <p class="eyebrow">
            {{ isFavorites ? 'VOTRE SÉLECTION PERSONNELLE' : isPlaylist ? 'PLAYLIST' : 'ALBUM' }}
          </p>
          <h1>{{ title }}</h1>
          <p class="collection-description">
            {{
              collection.description ||
              (isFavorites
                ? 'Un peu de vous dans chaque morceau.'
                : isPlaylist
                  ? 'La bande-son que vous avez imaginée.'
                  : collection.artist)
            }}
          </p>
          <p class="collection-meta">
            <span class="small-avatar">o.</span
            ><strong>{{
              isPlaylist || isFavorites ? library.auth?.u || 'Votre espace' : collection.artist
            }}</strong
            ><span>·</span><span>{{ tracks.length }} titre{{ tracks.length > 1 ? 's' : '' }}</span
            ><span v-if="duration">· {{ formatTime(duration) }}</span>
          </p>
        </div>
      </header>
      <div class="collection-toolbar">
        <button
          class="primary-button"
          :disabled="!tracks.length"
          @click="player.play(tracks[0], tracks)"
        >
          <Play :size="19" fill="currentColor" />Tout écouter</button
        ><span class="muted small">{{
          isFavorites
            ? 'Les favoris sont enregistrés automatiquement.'
            : collection.year || 'VOTRE MUSIQUE, VOTRE RYTHME'
        }}</span
        ><button
          v-if="isPlaylist"
          class="icon-button delete-playlist"
          aria-label="Supprimer cette playlist"
          @click="confirmDelete = true"
        >
          <Trash2 :size="19" />
        </button>
      </div>
      <div v-if="confirmDelete" class="delete-confirm" role="alert">
        <p>Supprimer « {{ title }} » ? Les morceaux de votre bibliothèque seront conservés.</p>
        <button class="danger-button" @click="deletePlaylist">Supprimer la playlist</button
        ><button class="secondary-button" @click="confirmDelete = false">Annuler</button>
      </div>
      <div v-if="error" class="error-banner" role="alert">
        {{ error }}<button class="text-button" @click="load">Réessayer</button>
      </div>
      <p v-if="loading" class="muted loading-text" role="status">Votre sélection arrive…</p>
      <TrackList
        v-else-if="tracks.length"
        :tracks="tracks"
        :playlist-id="isPlaylist ? String(route.params.id) : undefined"
        @removed="load"
      />
      <div v-else-if="!error" class="empty-state">
        <Heart v-if="isFavorites" :size="38" /><Music2 v-else :size="38" />
        <h3>
          {{
            isFavorites ? 'Votre prochain coup de cœur vous attend' : 'Tout commence par un morceau'
          }}
        </h3>
        <p>
          {{
            isFavorites
              ? 'Cliquez sur le cœur à côté d’un titre pour le retrouver ici.'
              : 'Utilisez le bouton + à côté d’un morceau pour l’ajouter à votre playlist.'
          }}
        </p>
        <RouterLink to="/recherche" class="secondary-button">Découvrir la musique</RouterLink>
      </div>
    </template>
    <div v-else class="empty-state">
      <Disc3 :size="38" />
      <h1>Sélection introuvable</h1>
      <p>Elle a peut-être été supprimée ou appartient à une autre bibliothèque.</p>
      <RouterLink to="/bibliotheque" class="primary-button">Voir ma bibliothèque</RouterLink>
    </div>
  </div>
</template>
