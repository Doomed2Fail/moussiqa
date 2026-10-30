<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLibrary } from '../composables/useLibrary'
import { finishAuthorization } from '../services/spotify'
const router = useRouter()
const library = useLibrary()
const error = ref('')
onMounted(async () => {
  try {
    await finishAuthorization()
    history.replaceState(null, '', '/callback')
    await library.connectSpotify()
    router.replace('/')
  } catch (err) {
    history.replaceState(null, '', '/callback')
    error.value = err.message
  }
})
</script>
<template>
  <div class="page-content empty-state">
    <h1>{{ error ? 'Connexion à reprendre' : 'Connexion à Spotify…' }}</h1>
    <p role="status">{{ error || 'Moussiqa prépare votre bibliothèque.' }}</p>
    <button v-if="error" class="primary-button" @click="library.dialog = 'login'">Réessayer</button
    ><RouterLink v-if="error" to="/" class="subtle-link">Retour à l’accueil</RouterLink>
  </div>
</template>
