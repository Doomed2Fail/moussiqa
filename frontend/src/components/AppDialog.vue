<script setup>
import { ref, watch, nextTick } from 'vue'
import { X, Plus, FolderHeart, Check } from 'lucide-vue-next'
import { useLibrary } from '../composables/useLibrary'
import { useRouter } from 'vue-router'
const library = useLibrary()
const router = useRouter()
const dialog = ref(null)
const nameInput = ref(null)
const name = ref('')
const error = ref('')
const busy = ref(false)
let returnFocus = null
watch(
  () => library.dialog,
  async (value) => {
    error.value = ''
    name.value = ''
    busy.value = false
    if (value) {
      returnFocus = document.activeElement
      await nextTick()
      if (!dialog.value.open) dialog.value.showModal()
      nameInput.value?.focus()
    } else {
      dialog.value?.close()
      returnFocus?.focus?.()
    }
  }
)
function close() {
  if (!busy.value && !library.loading) library.dialog = null
}
async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const playlist = await library.createPlaylist(name.value)
    if (library.pendingTrack) await library.addToPlaylist(playlist.id, library.pendingTrack.id)
    library.dialog = null
    router.push(`/playlist/${playlist.id}`)
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
async function choose(id) {
  busy.value = true
  error.value = ''
  try {
    await library.addToPlaylist(id, library.pendingTrack.id)
    library.dialog = null
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog"
    @cancel.prevent="close"
    @click="
      (event) => {
        if (event.target === dialog) close()
      }
    "
  >
    <div class="dialog-heading">
      <span class="dialog-symbol"
        ><FolderHeart :size="25" /></span
      ><button
        class="icon-button"
        aria-label="Fermer"
        :disabled="busy || library.loading"
        @click="close"
      >
        <X :size="22" />
      </button>
    </div>
      <p class="eyebrow">FAITES VOTRE SÉLECTION</p>
      <h2>
        {{ library.dialog === 'add' ? 'Une place dans votre playlist.' : 'Une nouvelle playlist.' }}
      </h2>
      <p class="muted">
        {{
          library.pendingTrack
            ? `Pour « ${library.pendingTrack.title} »`
            : 'Un voyage, une humeur, un moment. Donnez-lui un nom.'
        }}
      </p>
      <div v-if="library.dialog === 'add' && library.playlists.length" class="playlist-choices">
        <button
          v-for="playlist in library.playlists"
          :key="playlist.id"
          :disabled="busy"
          @click="choose(playlist.id)"
        >
          <FolderHeart :size="19" /><span>{{ playlist.name }}</span
          ><Plus :size="17" />
        </button>
      </div>
      <form @submit.prevent="submit">
        <label for="playlist-name">{{
          library.dialog === 'add' ? 'Ou créer une playlist' : 'Nom de la playlist'
        }}</label
        ><input
          id="playlist-name"
          ref="nameInput"
          v-model="name"
          maxlength="80"
          required
          placeholder="Ex. Un dimanche au soleil"
          :disabled="busy"
        />
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="primary-button" :disabled="busy" type="submit">
          {{ busy ? 'Enregistrement…' : 'Créer la playlist' }}<Plus :size="18" />
        </button>
      </form>
  </dialog>
</template>
