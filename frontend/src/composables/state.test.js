import { beforeAll, describe, expect, it, vi } from 'vitest'
import { nextTick, watch } from 'vue'

const memory = new Map()
vi.stubGlobal('localStorage', {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key)
})
vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
let usePlayer
let useLibrary
beforeAll(async () => {
  usePlayer = (await import('./usePlayer')).usePlayer
  useLibrary = (await import('./useLibrary')).useLibrary
})
describe('état partagé avec la Composition API de Vue', () => {
  it('partage le même lecteur et notifie les vues quand la lecture change', async () => {
    const player = usePlayer()
    player.reset()
    const changes = []
    const stop = watch(
      () => usePlayer().current?.id,
      (id) => changes.push(id)
    )
    player.play({ id: 'local-1', title: 'Test', source: 'local' }, [
      { id: 'local-1', title: 'Test', source: 'local' },
      { id: 'local-2', title: 'Autre', source: 'local' }
    ])
    await nextTick()
    player.next()
    await nextTick()
    expect(usePlayer()).toBe(player)
    expect(changes).toEqual(['local-1', 'local-2'])
    expect(player.current.id).toBe('local-2')
    stop()
    player.reset()
  })
  it('conserve le contexte des méthodes utilisées comme handlers', () => {
    const library = useLibrary()
    const notify = library.notify
    notify('Test partagé')
    expect(useLibrary().toast).toBe('Test partagé')
    library.toast = ''
  })
  it('calcule les favoris sans modifier les titres reçus', () => {
    const library = useLibrary()
    const initial = [...library.favorites]
    const track = library.tracks[0]
    library.favorites = [track.id]
    expect(library.favoriteTracks.map((t) => t.id)).toEqual([track.id])
    library.favorites = initial
  })
})


describe('bibliothèque locale sans compte Spotify', () => {
  it('crée, remplit et supprime une playlist sans appeler Spotify', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const library = useLibrary()
    library.activateLocal()
    const playlist = await library.createPlaylist('Sélection du prof')
    await library.addToPlaylist(playlist.id, 'horizon')
    expect((await library.playlistTracks(playlist.id)).map(t => t.id)).toEqual(['horizon'])
    await library.removeFromPlaylist(playlist.id, 'horizon')
    expect(await library.playlistTracks(playlist.id)).toEqual([])
    await library.deletePlaylist(playlist.id)
    expect(library.playlists.some(p => p.id === playlist.id)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(library.mode).toBe('local')
    vi.clearAllTimers()
    vi.useRealTimers()
  })
})
