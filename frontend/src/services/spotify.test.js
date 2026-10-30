import { describe, it, expect, vi } from 'vitest'
import {
  challengeFor,
  mapSpotifyTrack,
  mapSpotifyAlbum,
  hasPlaybackScopes,
  authorize,
  DEFAULT_CLIENT_ID
} from './spotify'

describe('Spotify PKCE et métadonnées', () => {
  it('demande les trois scopes du SDK et une nouvelle autorisation, sans ouvrir de navigateur', async () => {
    const assign = vi.fn()
    const values = new Map()
    const storage = {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key)
    }
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('sessionStorage', storage)
    vi.stubGlobal('window', {
      location: { hostname: '127.0.0.1', origin: 'http://127.0.0.1:8080', assign }
    })
    try {
      await authorize(DEFAULT_CLIENT_ID)
      const target = new URL(assign.mock.calls[0][0])
      expect(target.origin).toBe('https://accounts.spotify.com')
      expect(target.searchParams.get('show_dialog')).toBe('true')
      expect(target.searchParams.get('scope').split(' ')).toEqual(
        expect.arrayContaining(['streaming', 'user-read-email', 'user-read-private'])
      )
      expect(target.searchParams.get('code_challenge_method')).toBe('S256')
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('refuse les anciennes sessions sans permissions ou sans user-read-email', () => {
    expect(hasPlaybackScopes({ accessToken: 'ancien-jeton-de-test' })).toBe(false)
    expect(hasPlaybackScopes({ scope: 'streaming user-read-private' })).toBe(false)
    expect(
      hasPlaybackScopes({ scope: 'user-read-email streaming user-read-private user-library-read' })
    ).toBe(true)
  })
  it('calcule le challenge S256 selon le vecteur officiel RFC 7636', async () => {
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    )
  })
  it('conserve la durée, l’URI officielle et la pochette du titre', () => {
    const track = mapSpotifyTrack({
      id: '123',
      name: 'Titre',
      duration_ms: 123456,
      artists: [{ name: 'Artiste' }],
      album: { id: 'album', name: 'Album', images: [{ url: 'https://example.com/cover.jpg' }] }
    })
    expect(track).toMatchObject({
      id: '123',
      title: 'Titre',
      artist: 'Artiste',
      albumId: 'album',
      duration: 123.456,
      uri: 'spotify:track:123',
      cover: 'https://example.com/cover.jpg'
    })
  })
  it('accepte un album sans image sans produire une URL invalide', () => {
    expect(mapSpotifyAlbum({ id: 'album', name: 'Album', artists: [] })).toMatchObject({
      cover: '',
      spotifyUrl: 'https://open.spotify.com/album/album'
    })
  })
})
