import { createRouter, createWebHistory } from 'vue-router'
import BrowseView from '../views/BrowseView.vue'
import SpotifyCallback from '../views/SpotifyCallback.vue'
import CollectionView from '../views/CollectionView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/callback', name: 'callback', component: SpotifyCallback },
    { path: '/', name: 'home', component: BrowseView },
    { path: '/recherche', name: 'search', component: BrowseView },
    { path: '/bibliotheque', name: 'library', component: BrowseView },
    { path: '/favoris', name: 'favorites', component: CollectionView },
    { path: '/album/:id', name: 'album', component: CollectionView },
    { path: '/playlist/:id', name: 'playlist', component: CollectionView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
})
