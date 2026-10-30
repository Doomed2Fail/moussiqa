<script setup>
import { Play } from 'lucide-vue-next'
import { useLibrary } from '../composables/useLibrary'
import { usePlayer } from '../composables/usePlayer'
import CoverArt from './CoverArt.vue'
defineProps({ album: { type: Object, required: true } })
const library = useLibrary()
const player = usePlayer()
async function playAlbum(album) {
  if (album.showcase) {
    library.requireSpotify()
    return
  }
  let tracks
  try {
    tracks = await library.albumTracks(album.id)
  } catch (error) {
    library.notify(error.message)
    return
  }
  if (tracks.length) player.play(tracks[0], tracks)
  else library.notify('Aucun morceau disponible dans cet album.')
}
</script>

<template>
  <article class="album-card">
    <div class="album-art-wrap">
      <RouterLink :to="`/album/${album.id}`" :aria-label="`Ouvrir ${album.title}`"
        ><CoverArt :item="album" decorative /></RouterLink
      ><button
        class="round-play card-play"
        :aria-label="`Lire l’album ${album.title}`"
        @click="playAlbum(album)"
      >
        <Play :size="22" fill="currentColor" />
      </button>
    </div>
    <RouterLink :to="`/album/${album.id}`" class="album-name">{{ album.title }}</RouterLink>
    <p>
      {{ album.artist || 'Artiste inconnu' }} <span>· {{ album.genre || 'Album' }}</span>
    </p>
  </article>
</template>
