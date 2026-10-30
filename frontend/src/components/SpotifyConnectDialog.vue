<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { X, ArrowUpRight, AudioLines } from 'lucide-vue-next'
import { useLibrary } from '../composables/useLibrary'
import { authorize, DEFAULT_CLIENT_ID, CLIENT_KEY, redirectUri } from '../services/spotify'
const library = useLibrary()
const dialog = ref(null)
const clientId = ref(localStorage.getItem(CLIENT_KEY) || DEFAULT_CLIENT_ID)
const busy = ref(false)
const error = ref('')
const callback = redirectUri()
const previousFocus = document.activeElement
onMounted(() => dialog.value.showModal())
onBeforeUnmount(() => {
  dialog.value?.close()
  previousFocus?.focus?.()
})
async function connect() {
  busy.value = true
  error.value = ''
  try {
    await authorize(clientId.value)
  } catch (err) {
    error.value = err.message
    busy.value = false
  }
}
</script>
<template>
  <dialog ref="dialog" class="app-dialog" @cancel.prevent="library.dialog = null">
    <div class="dialog-heading">
      <span class="dialog-symbol"><AudioLines :size="26" /></span
      ><button
        class="icon-button"
        aria-label="Fermer la connexion Spotify"
        @click="library.dialog = null"
      >
        <X :size="22" />
      </button>
    </div>
    <p class="eyebrow">MOUSSIQA × SPOTIFY</p>
    <h2>Votre musique vous attend.</h2>
    <p class="muted">
      Autorisez Moussiqa depuis Spotify. Aucun mot de passe Spotify n’est demandé dans cette
      application.
    </p>
    <form @submit.prevent="connect">
      <label for="spotify-client-id">Client ID public</label
      ><input
        id="spotify-client-id"
        v-model="clientId"
        autocomplete="off"
        required
        maxlength="32"
      />
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button type="submit" class="primary-button" :disabled="busy">
        {{ busy ? 'Ouverture de Spotify…' : 'Continuer avec Spotify' }}<ArrowUpRight :size="18" />
      </button>
    </form>
    <div class="dialog-help">
      <strong>Adresse de retour à autoriser dans le Dashboard :</strong>
      <p>{{ callback }}</p>
      <p>
        Le compte Premium est utilisé pour la lecture complète. En mode développement, les
        utilisateurs de test doivent aussi être autorisés dans Spotify Developer.
      </p>
    </div>
  </dialog>
</template>
