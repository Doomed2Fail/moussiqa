<script setup>
import { ref, watch, onBeforeUnmount, onMounted } from 'vue'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Heart,
  Music2,
  X
} from 'lucide-vue-next'
import { usePlayer } from '../composables/usePlayer'
import { useLibrary } from '../composables/useLibrary'
import { formatTime } from '../services/utils'
import CoverArt from './CoverArt.vue'
import { createSpotifyPlayback } from '../services/spotify-player'
const player = usePlayer()
const library = useLibrary()
const audio = ref(null)
let oldVolume = 0.6
let playAttempt = 0
let spotifyPlayback = null
let spotifyExpectedPlaying = null
let playbackTimer
function spotifyEngine() {
  if (!spotifyPlayback)
    spotifyPlayback = createSpotifyPlayback(
      (state) => {
        if (library.mode !== 'spotify' || !player.current) return
        const id = state.track_window?.current_track?.id
        const index = player.queue.findIndex((track) => track.id === id)
        if (index >= 0) player.index = index
        player.duration = state.duration / 1000
        player.currentTime = state.position / 1000
        if (player.playing !== !state.paused) {
          spotifyExpectedPlaying = !state.paused
          player.playing = !state.paused
        }
      },
      (error) => {
        player.playing = false
        library.notify(error.message)
      }
    )
  return spotifyPlayback
}

async function start() {
  if (!audio.value || !player.current || !player.playing) return
  const attempt = ++playAttempt
  try {
    if (player.current.source === 'spotify') {
      await spotifyEngine().play(player.queue, player.index, player.volume)
      return
    }
    await audio.value.play()
  } catch (error) {
    if (attempt !== playAttempt || error.name === 'AbortError') return
    player.playing = false
    library.notify(
      player.current?.source === 'spotify'
        ? error.message
        : error.name === 'NotAllowedError'
          ? 'Appuyez sur Lecture pour autoriser le son.'
          : 'Lecture impossible. Vérifiez le fichier audio ou votre connexion au serveur.'
    )
  }
}
watch(
  () => player.replayKey,
  () => {
    if (!audio.value || !player.current) return
    playAttempt++
    if (player.current.source !== 'spotify') {
      audio.value.src = player.current.url
      audio.value.load()
    } else {
      audio.value.pause()
      audio.value.removeAttribute('src')
    }
    player.duration = player.current.duration || 0
    library.remember(player.current.id)
    start()
  }
)
watch(
  () => player.playing,
  (value) => {
    if (player.current?.source === 'spotify') {
      if (spotifyExpectedPlaying === value) {
        spotifyExpectedPlaying = null
        return
      }
      const operation = value ? spotifyPlayback?.resume() : spotifyPlayback?.pause()
      operation?.catch((error) => {
        player.playing = false
        library.notify(error.message)
      })
      return
    }
    if (value) start()
    else {
      playAttempt++
      audio.value?.pause()
    }
  }
)
watch(
  () => player.volume,
  (value) => {
    if (player.current?.source === 'spotify') {
      spotifyPlayback?.volume(value).catch((error) => library.notify(error.message))
      return
    }
    if (audio.value) audio.value.volume = value
  }
)
watch(
  () => player.seekTarget,
  (value) => {
    if (value !== null && player.current?.source === 'spotify') {
      spotifyPlayback?.seek(value).catch((error) => library.notify(error.message))
      player.seekTarget = null
      return
    }
    if (value !== null && audio.value && Number.isFinite(audio.value.duration))
      audio.value.currentTime = value
    player.seekTarget = null
  }
)
watch(
  () => player.current,
  (value) => {
    if (!value && audio.value) {
      playAttempt++
      audio.value.pause()
      audio.value.removeAttribute('src')
      audio.value.load()
    }
  }
)
watch(
  () => library.auth?.u || library.mode,
  () => {
    spotifyPlayback?.disconnect()
    spotifyPlayback = null
    spotifyExpectedPlaying = null
    player.reset()
  }
)
watch(
  () => player.shuffle,
  (value) => {
    if (player.current?.source === 'spotify')
      spotifyPlayback?.shuffle(value).catch((error) => library.notify(error.message))
  }
)
watch(
  () => player.repeat,
  (value) => {
    if (player.current?.source === 'spotify')
      spotifyPlayback?.repeat(value).catch((error) => library.notify(error.message))
  }
)
function mute() {
  if (player.volume > 0) {
    oldVolume = player.volume
    player.setVolume(0)
  } else player.setVolume(oldVolume)
}
function audioError() {
  if (player.current && audio.value?.getAttribute('src')) {
    player.playing = false
    library.notify('Ce fichier audio n’est pas disponible. Essayez un autre morceau.')
  }
}
function shortcut(event) {
  if (
    event.code !== 'Space' ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.target.closest('input, textarea, button, select, a, [contenteditable], dialog')
  )
    return
  event.preventDefault()
  player.toggle()
}
onMounted(() => {
  audio.value.volume = player.volume
  window.addEventListener('keydown', shortcut)
  playbackTimer = setInterval(async () => {
    if (library.mode !== 'spotify' || !player.playing || !spotifyPlayback) return
    try {
      const state = await spotifyPlayback.state()
      if (state && player.current?.id === state.track_window?.current_track?.id)
        player.currentTime = state.position / 1000
    } catch {
      /* Les erreurs du SDK sont déjà notifiées par son gestionnaire. */
    }
  }, 1000)
})
onBeforeUnmount(() => {
  clearInterval(playbackTimer)
  spotifyPlayback?.disconnect()
  playAttempt++
  audio.value?.pause()
  window.removeEventListener('keydown', shortcut)
})
</script>

<template>
  <audio
    ref="audio"
    preload="metadata"
    @timeupdate="player.currentTime = audio.currentTime"
    @loadedmetadata="player.duration = Number.isFinite(audio.duration) ? audio.duration : 0"
    @ended="player.next(true)"
    @error="audioError"
  />
  <aside v-if="player.queueOpen" class="queue-panel" aria-label="File d’attente">
    <div class="section-heading">
      <h2>À suivre</h2>
      <button
        class="icon-button"
        aria-label="Fermer la file d’attente"
        @click="player.queueOpen = false"
      >
        <X :size="20" />
      </button>
    </div>
    <p class="muted small">{{ player.queue.length }} morceaux dans votre sélection</p>
    <div class="queue-items">
      <button
        v-for="(track, index) in player.queue"
        :key="`${track.id}-${index}`"
        class="queue-item"
        :class="{ active: index === player.index }"
        @click="player.play(track, player.queue)"
      >
        <CoverArt :item="track" decorative /><span
          ><strong>{{ track.title }}</strong
          ><small>{{ track.artist }}</small></span
        ><Play :size="15" />
      </button>
      <p v-if="!player.queue.length" class="muted">Lancez un morceau pour remplir la file.</p>
    </div>
  </aside>
  <footer class="player-bar" aria-label="Lecteur audio">
    <div class="now-playing">
      <CoverArt v-if="player.current" :item="player.current" decorative />
      <div v-else class="player-placeholder"><Music2 :size="23" /></div>
      <div class="now-playing-text">
        <strong>{{ player.current?.title || 'À vous de donner le ton' }}</strong
        ><span>{{ player.current?.artist || 'Choisissez votre premier morceau' }}</span>
      </div>
      <button
        v-if="player.current"
        class="icon-button now-heart"
        :class="{ active: library.favorites.includes(player.current.id) }"
        aria-label="Favori du morceau en cours"
        :aria-pressed="library.favorites.includes(player.current.id)"
        @click="library.toggleFavorite(player.current.id)"
      >
        <Heart
          :size="18"
          :fill="library.favorites.includes(player.current.id) ? 'currentColor' : 'none'"
        />
      </button>
    </div>
    <div class="player-center">
      <div class="transport">
        <button
          class="icon-button transport-extra"
          :class="{ active: player.shuffle }"
          :aria-pressed="player.shuffle"
          aria-label="Lecture aléatoire"
          @click="player.shuffle = !player.shuffle"
        >
          <Shuffle :size="17" /></button
        ><button
          class="icon-button"
          aria-label="Morceau précédent"
          :disabled="!player.current"
          @click="player.previous()"
        >
          <SkipBack :size="21" fill="currentColor" /></button
        ><button
          class="main-play"
          :aria-label="player.playing ? 'Mettre en pause' : 'Lire le morceau'"
          :disabled="!player.current"
          @click="player.toggle()"
        >
          <Pause v-if="player.playing" :size="21" fill="currentColor" /><Play
            v-else
            :size="21"
            fill="currentColor"
          /></button
        ><button
          class="icon-button"
          aria-label="Morceau suivant"
          :disabled="!player.current"
          @click="player.next()"
        >
          <SkipForward :size="21" fill="currentColor" /></button
        ><button
          class="icon-button transport-extra"
          :class="{ active: player.repeat !== 'off' }"
          :aria-label="`Répétition : ${player.repeat === 'one' ? 'un morceau' : player.repeat === 'all' ? 'toute la file' : 'désactivée'}`"
          @click="player.cycleRepeat()"
        >
          <Repeat1 v-if="player.repeat === 'one'" :size="17" /><Repeat v-else :size="17" />
        </button>
      </div>
      <div class="progress-row">
        <span>{{ formatTime(player.currentTime) }}</span
        ><input
          type="range"
          min="0"
          :max="player.duration || 1"
          :value="player.currentTime"
          step="0.1"
          :disabled="!player.current"
          aria-label="Position dans le morceau"
          :style="{
            '--progress': `${player.duration ? (player.currentTime / player.duration) * 100 : 0}%`
          }"
          @input="player.seekTarget = Number($event.target.value)"
        /><span>{{ formatTime(player.duration) }}</span>
      </div>
    </div>
    <div class="player-options">
      <button
        class="icon-button"
        :class="{ active: player.queueOpen }"
        :aria-expanded="player.queueOpen"
        aria-label="File d’attente"
        @click="player.queueOpen = !player.queueOpen"
      >
        <ListMusic :size="20" />
      </button>
      <div class="volume-controls">
        <button
          class="icon-button"
          :aria-label="player.volume ? 'Couper le son' : 'Rétablir le son'"
          @click="mute"
        >
          <Volume2 v-if="player.volume" :size="19" /><VolumeX v-else :size="19" /></button
        ><input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="player.volume"
          :style="{ '--progress': `${player.volume * 100}%` }"
          aria-label="Volume"
          @input="player.setVolume($event.target.value)"
        />
      </div>
    </div>
  </footer>
</template>
