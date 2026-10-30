<script setup>
import { Heart, Play, Pause, Plus, X, Clock3, Music2 } from 'lucide-vue-next'
import { usePlayer } from '../composables/usePlayer'
import { useLibrary } from '../composables/useLibrary'
import { formatTime } from '../services/utils'
import CoverArt from './CoverArt.vue'

defineProps({ tracks: { type: Array, required: true }, playlistId: String, compact: Boolean })
defineEmits(['removed'])
const player = usePlayer()
const library = useLibrary()
function activate(track, tracks) {
  if (player.current?.id === track.id) player.toggle()
  else player.play(track, tracks)
}
async function remove(playlistId, id, emit) {
  try {
    await library.removeFromPlaylist(playlistId, id)
    emit('removed')
  } catch {
    /* La notification est gérée par le store. */
  }
}
</script>

<template>
  <div v-if="tracks.length" class="track-list" role="table" aria-label="Morceaux">
    <div class="track-head" role="row">
      <span role="columnheader">#</span><span role="columnheader">Titre</span
      ><span class="album-col" role="columnheader">Album</span
      ><span role="columnheader" class="duration-head"
        ><Clock3 :size="15" aria-label="Durée" /></span
      ><span role="columnheader" class="sr-only">Actions</span>
    </div>
    <div
      v-for="(track, index) in tracks"
      :key="`${track.id}-${index}`"
      class="track-row"
      :class="{ 'is-current': player.current?.id === track.id }"
      role="row"
    >
      <button
        class="track-number icon-button"
        :aria-label="`${player.current?.id === track.id && player.playing ? 'Mettre en pause' : 'Lire'} ${track.title}`"
        @click="activate(track, tracks)"
      >
        <Pause
          v-if="player.current?.id === track.id && player.playing"
          :size="15"
          class="number-play"
        />
        <Play v-else :size="15" class="number-play" />
        <span class="number-text">{{ String(index + 1).padStart(2, '0') }}</span>
      </button>
      <div class="track-title" role="cell">
        <CoverArt :item="track" decorative />
        <div>
          <button class="text-button song-name" @click="activate(track, tracks)">
            {{ track.title }}
          </button>
          <p>{{ track.artist || 'Artiste inconnu' }}</p>
        </div>
      </div>
      <span class="album-col muted" role="cell">{{ track.album || 'Single' }}</span>
      <span class="track-duration muted" role="cell">{{ formatTime(track.duration) }}</span>
      <div class="track-actions" role="cell">
        <button
          class="icon-button heart-button"
          :class="{ active: library.favorites.includes(track.id) }"
          :aria-label="`${library.favorites.includes(track.id) ? 'Retirer' : 'Ajouter'} ${track.title} ${library.favorites.includes(track.id) ? 'des' : 'aux'} favoris`"
          :aria-pressed="library.favorites.includes(track.id)"
          @click="library.toggleFavorite(track.id)"
        >
          <Heart
            :size="17"
            :fill="library.favorites.includes(track.id) ? 'currentColor' : 'none'"
          />
        </button>
        <button
          class="icon-button"
          :aria-label="`Ajouter ${track.title} à une playlist`"
          @click="library.openPlaylistDialog(track)"
        >
          <Plus :size="17" />
        </button>
        <button
          v-if="playlistId"
          class="icon-button"
          :aria-label="`Retirer ${track.title} de cette playlist`"
          @click="remove(playlistId, track.id, $emit)"
        >
          <X :size="16" />
        </button>
      </div>
    </div>
  </div>
  <div v-else class="empty-state">
    <Music2 :size="34" />
    <h3>Un peu de place pour la musique</h3>
    <p>Les morceaux de cette sélection apparaîtront ici.</p>
  </div>
</template>
