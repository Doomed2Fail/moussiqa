<script setup>
import { computed, watch, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  House,
  Search,
  LibraryBig,
  Heart,
  Plus,
  FolderHeart,
  AudioLines,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  Sparkles,
  Check,
  X,
  Menu
} from 'lucide-vue-next'
import { useLibrary } from './composables/useLibrary'
import { usePlayer } from './composables/usePlayer'
import PlayerBar from './components/PlayerBar.vue'
import AppDialog from './components/AppDialog.vue'
import SpotifyConnectDialog from './components/SpotifyConnectDialog.vue'

const library = useLibrary()
const player = usePlayer()
const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const sidebarCollapsed = ref(false)
const compactNavigation = ref(false)
const menuButton = ref(null)
let navigationMedia
const navigationExpanded = computed(() =>
  compactNavigation.value ? menuOpen.value : !sidebarCollapsed.value
)
function toggleNavigation() {
  if (compactNavigation.value) menuOpen.value = !menuOpen.value
  else sidebarCollapsed.value = !sidebarCollapsed.value
}
function updateNavigationLayout(event) {
  compactNavigation.value = event.matches
  menuOpen.value = false
}
function closeNavigation() {
  menuOpen.value = false
  menuButton.value?.focus()
}
function handleNavigationKey(event) {
  if (event.key === 'Escape' && menuOpen.value) closeNavigation()
}
const searchText = ref(String(route.query.q || ''))
function searchSpotifyCatalog() {
  router.push({
    path: '/recherche',
    query: searchText.value.trim() ? { q: searchText.value.trim() } : {}
  })
}
watch(
  () => route.query.q,
  (value) => {
    searchText.value = String(value || '')
  }
)

let toastTimer
watch(
  () => library.toast,
  (message) => {
    clearTimeout(toastTimer)
    if (message) {
      toastTimer = setTimeout(() => {
        library.toast = ''
      }, 5000)
    }
  }
)

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  }
)

onMounted(() => {
  navigationMedia = window.matchMedia('(max-width: 650px)')
  compactNavigation.value = navigationMedia.matches
  navigationMedia.addEventListener('change', updateNavigationLayout)
  window.addEventListener('keydown', handleNavigationKey)
  library.init()
})

onBeforeUnmount(() => {
  navigationMedia?.removeEventListener('change', updateNavigationLayout)
  window.removeEventListener('keydown', handleNavigationKey)
  clearTimeout(toastTimer)
})

const currentLocation = computed(() => {
  if (route.name === 'home') return 'Accueil · En écoute'
  if (route.name === 'search') return 'Explorer le catalogue'
  if (route.name === 'library') return 'Votre bibliothèque'
  if (route.name === 'favorites') return 'Vos coups de cœur'
  if (route.name === 'album') return 'Album'
  if (route.name === 'playlist') return 'Playlist'
  return 'Moussiqa'
})
</script>

<template>
  <a class="skip-link" href="#main-content">Aller au contenu</a>

  <div class="app-layout" :class="{ 'sidebar-collapsed': !compactNavigation && sidebarCollapsed }">
    <button
      v-if="compactNavigation && menuOpen"
      class="sidebar-overlay"
      aria-label="Fermer le menu"
      @click="closeNavigation"
    ></button>

    <!-- Sidebar Navigation -->
    <aside
      id="moussiqa-navigation"
      class="sidebar"
      :class="{ 'is-open': menuOpen }"
      :inert="compactNavigation ? !menuOpen : sidebarCollapsed"
      aria-label="Navigation principale"
    >
      <button
        v-if="compactNavigation"
        class="drawer-close icon-button"
        aria-label="Fermer le menu"
        @click="closeNavigation"
      >
        <X :size="20" />
      </button>
      <RouterLink to="/" class="brand" aria-label="Moussiqa, accueil">
        <span class="brand-symbol"><AudioLines :size="28" /></span>
        <span>Moussiqa<span class="brand-dot">.</span></span>
      </RouterLink>

      <span class="nav-label">MENU</span>
      <RouterLink to="/" class="nav-link" :class="{ selected: route.name === 'home' }">
        <House :size="18" /><span>Accueil</span>
      </RouterLink>
      <RouterLink to="/recherche" class="nav-link" :class="{ selected: route.name === 'search' }">
        <Search :size="18" /><span>Explorer</span>
      </RouterLink>
      <RouterLink
        to="/bibliotheque"
        class="nav-link"
        :class="{ selected: route.name === 'library' }"
      >
        <LibraryBig :size="18" /><span>Bibliothèque</span>
      </RouterLink>

      <div class="sidebar-divider"></div>

      <span class="nav-label">VOS TITRES</span>
      <RouterLink to="/favoris" class="favorite-link">
        <span class="favorite-tile"><Heart :size="17" fill="currentColor" /></span>
        <div>
          <strong>Coups de cœur</strong>
          <small
            >{{ library.favorites.length }} titre{{
              library.favorites.length > 1 ? 's' : ''
            }}</small
          >
        </div>
      </RouterLink>

      <div class="playlist-label">
        <span class="nav-label">PLAYLISTS</span>
        <button
          class="icon-button"
          aria-label="Créer une playlist"
          @click="library.openPlaylistDialog()"
        >
          <Plus :size="16" />
        </button>
      </div>

      <nav class="playlist-nav">
        <RouterLink
          v-for="p in library.playlists"
          :key="p.id"
          :to="`/playlist/${p.id}`"
          class="playlist-link"
          :class="{ selected: route.params.id === p.id }"
        >
          <FolderHeart :size="15" />
          <span>{{ p.name }}</span>
        </RouterLink>
        <p v-if="!library.playlists.length" class="sidebar-empty">
          Créez votre première playlist avec le bouton +.
        </p>
      </nav>

      <div class="sidebar-bottom">
        <div class="listening-note">
          <Sparkles :size="18" />
          <strong>{{ library.mode === 'spotify' ? 'Spotify Connecté' : 'Écoute locale' }}</strong>
          <p>
            {{
              library.mode === 'spotify'
                ? 'Vos titres et playlists sont synchronisés.'
                : 'Vos morceaux fonctionnent sans compte. Spotify est facultatif.'
            }}
          </p>
        </div>
      </div>
    </aside>

    <!-- Workspace Principal -->
    <div class="workspace">
      <header class="topbar">
        <div class="topbar-left">
          <button
            ref="menuButton"
            class="mobile-toggle icon-button"
            :aria-label="navigationExpanded ? 'Masquer le menu' : 'Afficher le menu'"
            :aria-expanded="navigationExpanded"
            aria-controls="moussiqa-navigation"
            @click="toggleNavigation"
          >
            <Menu :size="20" />
          </button>
          <form class="topbar-search" role="search" @submit.prevent="searchSpotifyCatalog">
            <Search :size="19" />
            <input
              v-model="searchText"
              type="search"
              aria-label="Rechercher de la musique"
              placeholder="Qu’avez-vous envie d’écouter ?"
            />
            <button type="submit" class="icon-button" aria-label="Lancer la recherche">
              <ArrowUpRight :size="17" />
            </button>
          </form>
        </div>

        <div class="topbar-right">
          <span class="connection-chip" :class="{ connected: library.mode === 'spotify' }">
            <span></span>
            {{ library.mode === 'spotify' ? 'Spotify connecté' : 'Bibliothèque locale' }}
          </span>

          <button
            v-if="library.mode === 'spotify'"
            class="icon-button"
            :disabled="library.loading"
            aria-label="Actualiser la bibliothèque"
            @click="library.refresh()"
          >
            <RefreshCw :size="16" :class="{ spinning: library.loading }" />
          </button>

          <button
            class="account-button"
            @click="library.mode === 'spotify' ? library.disconnect() : library.requireSpotify()"
          >
            <span class="avatar">{{ library.auth?.u?.[0]?.toUpperCase() || 'O' }}</span>
            <span>{{ library.mode === 'spotify' ? library.auth?.u : 'Connexion' }}</span>
            <LogOut v-if="library.mode === 'spotify'" :size="15" />
            <ArrowUpRight v-else :size="15" />
          </button>
        </div>
      </header>

      <main id="main-content" tabindex="-1">
        <div v-if="library.error" class="error-banner" role="alert">
          {{ library.error }}
          <button class="text-button" @click="library.error = ''">Fermer</button>
        </div>
        <RouterView />
      </main>
      <footer class="creators-footer" aria-label="Créateurs de Moussiqa">
        <div>
          <span class="creators-monogram" aria-hidden="true">E<span>×</span>S</span
          ><span><strong>MOUSSIQA</strong><small>Le son de notre génération.</small></span>
        </div>
        <p>
          Imaginé &amp; développé par <strong>ER-RAFIY Taha Amine</strong
          ><span class="creators-join">&amp;</span><strong>SAADEDDINE Zineb</strong>
        </p>
      </footer>
    </div>

    <!-- Lecteur audio persistant -->
    <PlayerBar />

    <!-- Dialogue modal -->
    <SpotifyConnectDialog v-if="library.dialog === 'login'" />
    <AppDialog v-else />

    <!-- Notifications Toast -->
    <Transition name="toast">
      <div v-if="library.toast" class="toast-message" role="status">
        <Check :size="18" />
        <span>{{ library.toast }}</span>
        <button class="icon-button" aria-label="Fermer la notification" @click="library.toast = ''">
          <X :size="16" />
        </button>
      </div>
    </Transition>
  </div>
</template>
