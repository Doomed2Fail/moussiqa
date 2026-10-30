import { reactive } from 'vue'
import { readStorage, writeStorage } from '../services/utils'
import * as spotify from '../services/spotify'
import { LOCAL_KEYS, localDefaults, localCatalog, loadLocalCatalog, importLocalFiles } from '../services/local-library'
import { loadSnapshot, saveSnapshot } from '../services/pocketbase'

const initial = localCatalog()
let localData = initial
let syncTimer
const library = reactive({
  mode: 'local', tracks: initial.tracks, albums: initial.albums,
  favorites: readStorage(localStorage, LOCAL_KEYS.favorites, [...localDefaults.favorites]),
  playlists: readStorage(localStorage, LOCAL_KEYS.playlists, structuredClone(localDefaults.playlists)),
  recentIds: readStorage(localStorage, LOCAL_KEYS.recent, []),
  profile: null, auth: null, loading: false, importing: false, error: '', toast: '',
  dialog: null, pendingTrack: null, ready: false, requestVersion: 0,
  backendStatus: 'checking', spotifySearchTracks: [], spotifySearchAlbums: [],
  searchLoading: false, searchError: '', searchHasMore: false, searchQuery: '', searchVersion: 0,
  get favoriteTracks() { return this.tracks.filter(t => this.favorites.includes(t.id)) },
  get recentTracks() { return this.recentIds.map(id => this.tracks.find(t => t.id === id)).filter(Boolean) },
  get genres() { return [...new Set(this.tracks.map(t => t.genre).filter(Boolean))] },
  notify(message) { this.toast = message },
  persist() {
    if (this.mode !== 'local') return
    const success = writeStorage(localStorage, LOCAL_KEYS.favorites, this.favorites) && writeStorage(localStorage, LOCAL_KEYS.playlists, this.playlists)
    if (!success) this.notify('Votre navigateur ne permet pas de sauvegarder la bibliothèque locale.')
    const payload = JSON.parse(JSON.stringify({ favorites: this.favorites, playlists: this.playlists }))
    clearTimeout(syncTimer)
    syncTimer = setTimeout(async () => { this.backendStatus = await saveSnapshot(payload) ? 'connected' : 'offline' }, 600)
  },
  async init() {
    if (window.location.pathname === '/callback') { this.ready = true; return }
    try { localData = await loadLocalCatalog(); if (this.mode === 'local') Object.assign(this, localData) }
    catch (error) { this.error = error.message }
    this.ready = true
    // La sauvegarde serveur est facultative et ne bloque jamais l’écoute locale.
    loadSnapshot().then(snapshot => {
      this.backendStatus = snapshot.available ? 'connected' : 'offline'
      if (this.mode !== 'local' || !snapshot.payload) return
      if (localStorage.getItem(LOCAL_KEYS.playlists) === null && Array.isArray(snapshot.payload.playlists)) this.playlists = snapshot.payload.playlists
      if (localStorage.getItem(LOCAL_KEYS.favorites) === null && Array.isArray(snapshot.payload.favorites)) this.favorites = snapshot.payload.favorites
    })
    const session = spotify.getSession()
    if (session && !spotify.hasPlaybackScopes(session)) {
      spotify.clearSession(); this.error = 'Les autorisations Spotify ont changé. La bibliothèque locale reste disponible ; reconnectez Spotify pour le streaming.'; return
    }
    if (session) {
      try { await this.connectSpotify() }
      catch (error) { this.error = `${error.message} La bibliothèque locale reste disponible.` }
    }
  },
  async importAudio(files) {
    this.importing = true
    try {
      const imported = await importLocalFiles(files)
      localData = await loadLocalCatalog()
      if (this.mode === 'local') Object.assign(this, localData)
      this.notify(`${imported.length} fichier(s) audio ajouté(s) sur cet appareil.`)
      return imported
    } catch (error) { this.notify(error.message); throw error }
    finally { this.importing = false }
  },
  async connectSpotify() {
    const version = ++this.requestVersion
    this.loading = true
    try {
      const data = await spotify.loadSpotifyLibrary()
      if (version !== this.requestVersion) return
      this.mode = 'spotify'; this.auth = { u: data.profile.display_name || data.profile.id }
      Object.assign(this, data)
      this.recentIds = []; this.dialog = null; this.spotifySearchTracks = []; this.spotifySearchAlbums = []; this.error = ''
      this.notify('Spotify connecté. Vous pouvez revenir à vos morceaux locaux à tout moment.')
    } finally { if (version === this.requestVersion) this.loading = false }
  },
  async requireSpotify() {
    try { await spotify.authorize() }
    catch (error) { this.notify(error.message); this.dialog = 'login' }
  },
  activateLocal() {
    ++this.requestVersion; ++this.searchVersion
    this.mode = 'local'; this.auth = null; this.profile = null; this.loading = false
    Object.assign(this, localData)
    this.favorites = readStorage(localStorage, LOCAL_KEYS.favorites, [...localDefaults.favorites])
    this.playlists = readStorage(localStorage, LOCAL_KEYS.playlists, structuredClone(localDefaults.playlists))
    this.recentIds = readStorage(localStorage, LOCAL_KEYS.recent, [])
    this.spotifySearchTracks = []; this.spotifySearchAlbums = []; this.searchLoading = false; this.searchError = ''; this.error = ''
  },
  disconnect() { spotify.clearSession(); this.activateLocal(); this.notify('Bibliothèque locale prête, sans connexion.') },
  async refresh() {
    if (this.mode === 'spotify') { try { await this.connectSpotify() } catch (error) { this.notify(error.message) }; return }
    try { localData = await loadLocalCatalog(); Object.assign(this, localData); this.notify('Bibliothèque locale actualisée.') }
    catch (error) { this.notify(error.message) }
  },
  async search(query, more = false) {
    if (this.mode !== 'spotify') return
    const version = ++this.searchVersion
    this.searchQuery = query.trim(); this.searchError = ''
    if (!this.searchQuery) { this.spotifySearchTracks = []; this.spotifySearchAlbums = []; this.searchLoading = false; return }
    this.searchLoading = true
    try {
      const data = await spotify.searchSpotify(this.searchQuery, more ? this.spotifySearchTracks.length : 0)
      if (version !== this.searchVersion || this.mode !== 'spotify') return
      this.spotifySearchTracks = more ? [...this.spotifySearchTracks, ...data.tracks] : data.tracks
      this.spotifySearchAlbums = more ? [...new Map([...this.spotifySearchAlbums, ...data.albums].map(a => [a.id, a])).values()] : data.albums
      this.searchHasMore = data.hasMore
      this.mergeTracks(data.tracks)
      this.albums = [...new Map([...this.albums, ...data.albums].map(a => [a.id, a])).values()]
    } catch (error) { if (version === this.searchVersion) this.searchError = error.message }
    finally { if (version === this.searchVersion) this.searchLoading = false }
  },
  mergeTracks(tracks) { this.tracks = [...new Map([...this.tracks, ...tracks].map(t => [t.id, t])).values()] },
  async albumTracks(id) {
    if (this.mode === 'local') return this.tracks.filter(t => t.albumId === id)
    const data = await spotify.spotifyAlbum(id)
    this.mergeTracks(data.tracks)
    this.albums = [...new Map([...this.albums, data.album].map(a => [a.id, a])).values()]
    return data.tracks
  },
  async toggleFavorite(id) {
    const starred = this.favorites.includes(id)
    try {
      if (this.mode === 'spotify') await spotify.setSaved(`spotify:track:${id}`, !starred)
      this.favorites = starred ? this.favorites.filter(x => x !== id) : [...this.favorites, id]
      this.persist(); this.notify(starred ? 'Retiré des coups de cœur.' : 'Ajouté à vos coups de cœur.')
    } catch (error) { this.notify(error.message) }
  },
  async createPlaylist(name) {
    const clean = name.trim()
    if (!clean) throw new Error('Donnez un nom à votre playlist.')
    let playlist = { id: `local-${crypto.randomUUID()}`, name: clean, songIds: [], songCount: 0, palette: 'violet', editable: true }
    if (this.mode === 'spotify') {
      const data = await spotify.spotifyRequest('/me/playlists', { method: 'POST', body: { name: clean, public: false, description: 'Créée dans Moussiqa' } })
      playlist = { ...playlist, id: data.id, name: data.name, owner: this.profile.id }
    }
    this.playlists.push(playlist); this.persist(); this.notify('Playlist créée.'); return playlist
  },
  async playlistTracks(id) {
    const playlist = this.playlists.find(p => p.id === id)
    if (!playlist) return []
    if (this.mode === 'spotify') {
      const tracks = await spotify.spotifyPlaylist(id)
      playlist.songIds = tracks.map(t => t.id); playlist.songCount = tracks.length; this.mergeTracks(tracks); return tracks
    }
    return playlist.songIds.map(songId => this.tracks.find(t => t.id === songId)).filter(Boolean)
  },
  async addToPlaylist(playlistId, trackId) {
    const playlist = this.playlists.find(p => p.id === playlistId)
    if (!playlist) return
    if (this.mode === 'spotify') {
      if (!playlist.editable) throw new Error('Cette playlist ne peut pas être modifiée avec votre compte.')
      await this.playlistTracks(playlistId)
    }
    if (playlist.songIds.includes(trackId)) { this.notify('Ce titre est déjà dans la playlist.'); return }
    if (this.mode === 'spotify') await spotify.spotifyRequest(`/playlists/${encodeURIComponent(playlistId)}/items`, { method: 'POST', body: { uris: [`spotify:track:${trackId}`] } })
    playlist.songIds.push(trackId); playlist.songCount = playlist.songIds.length; this.persist(); this.notify(`Ajouté à « ${playlist.name} ».`)
  },
  async removeFromPlaylist(playlistId, trackId) {
    const playlist = this.playlists.find(p => p.id === playlistId)
    if (!playlist) return
    try {
      if (this.mode === 'spotify') {
        if (!playlist.editable) throw new Error('Cette playlist ne peut pas être modifiée avec votre compte.')
        await spotify.spotifyRequest(`/playlists/${encodeURIComponent(playlistId)}/items`, { method: 'DELETE', body: { items: [{ uri: `spotify:track:${trackId}` }] } })
      }
      playlist.songIds = playlist.songIds.filter(id => id !== trackId); playlist.songCount = playlist.songIds.length
      this.persist(); this.notify('Morceau retiré de la playlist.')
    } catch (error) { this.notify(error.message); throw error }
  },
  async deletePlaylist(id) {
    if (this.mode === 'spotify') await spotify.setSaved(`spotify:playlist:${id}`, false)
    this.playlists = this.playlists.filter(p => p.id !== id); this.persist(); this.notify('Playlist supprimée.')
  },
  remember(id) {
    this.recentIds = [id, ...this.recentIds.filter(x => x !== id)].slice(0, 20)
    if (this.mode === 'local') writeStorage(localStorage, LOCAL_KEYS.recent, this.recentIds)
  },
  openPlaylistDialog(track = null) { this.pendingTrack = track; this.dialog = track ? 'add' : 'create' }
})
for (const key of Object.keys(library)) if (typeof library[key] === 'function') library[key] = library[key].bind(library)
export function useLibrary() { return library }
