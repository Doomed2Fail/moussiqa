import { readStorage, writeStorage } from './utils'

const SESSION_KEY = 'moussiqa.spotify.session'
const FLOW_KEY = 'moussiqa.spotify.pkce'
export const CLIENT_KEY = 'moussiqa.spotify.clientId'
export const DEFAULT_CLIENT_ID = '4a2c1122c2ae4fc7a0868bced3e694c0'
const scopes = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public'
]
let refreshing = null
let exchanging = null

export function redirectUri() {
  return `${window.location.origin}/callback`
}
export function getSession() {
  return readStorage(sessionStorage, SESSION_KEY, null)
}
export function hasPlaybackScopes(session) {
  const granted = new Set((session?.scope || '').split(/\s+/))
  return ['streaming', 'user-read-email', 'user-read-private'].every((scope) => granted.has(scope))
}
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(FLOW_KEY)
}
function randomString() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, '0')
  ).join('')
}
export async function challengeFor(verifier) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}
export async function authorize(clientId) {
  clientId = String(clientId || localStorage.getItem(CLIENT_KEY) || DEFAULT_CLIENT_ID).trim()
  if (!/^[a-f\d]{32}$/i.test(clientId))
    throw new Error('Le Client ID Spotify doit contenir 32 caractères hexadécimaux.')
  if (window.location.hostname === 'localhost') {
    // Rediriger automatiquement vers 127.0.0.1 pour respecter le redirect_uri de Spotify
    const url = new URL(window.location.href)
    url.hostname = '127.0.0.1'
    window.location.href = url.toString()
    return
  }
  const verifier = randomString()
  const state = randomString()
  const flow = { verifier, state, clientId, redirect: redirectUri(), created: Date.now() }
  if (!writeStorage(sessionStorage, FLOW_KEY, flow))
    throw new Error('Le stockage de session du navigateur est nécessaire à la connexion.')
  localStorage.setItem(CLIENT_KEY, clientId)
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: flow.redirect,
    scope: scopes.join(' '),
    show_dialog: 'true',
    state,
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier)
  })
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`)
}
async function tokenRequest(body, previous = {}) {
  let response
  try {
    response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(15000)
    })
  } catch {
    throw new Error('Impossible de joindre Spotify. Vérifiez votre connexion Internet.')
  }
  const data = await response.json()
  if (!response.ok)
    throw new Error(data.error_description || 'Connexion Spotify expirée. Reconnectez-vous.')
  const session = {
    clientId: body.client_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || previous.refreshToken,
    scope: data.scope || previous.scope || '',
    expiresAt: Date.now() + data.expires_in * 1000
  }
  if (!writeStorage(sessionStorage, SESSION_KEY, session))
    throw new Error('Impossible de conserver la session Spotify dans cet onglet.')
  return session
}
export async function finishAuthorization() {
  if (exchanging) return exchanging
  const params = new URLSearchParams(window.location.search)
  const flow = readStorage(sessionStorage, FLOW_KEY, null)
  // Vérifier state avant l’échange, y compris pour un refus d’autorisation.
  if (!flow || params.get('state') !== flow.state || Date.now() - flow.created > 10 * 60 * 1000) {
    sessionStorage.removeItem(FLOW_KEY)
    throw new Error(
      'La demande de connexion a expiré ou son identifiant ne correspond pas. Réessayez.'
    )
  }
  sessionStorage.removeItem(FLOW_KEY)
  if (params.has('error'))
    throw new Error('Vous avez annulé l’autorisation Spotify. Vous pouvez réessayer.')
  const code = params.get('code')
  if (!code) throw new Error('Spotify n’a pas renvoyé le code de connexion.')
  exchanging = tokenRequest({
    client_id: flow.clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: flow.redirect,
    code_verifier: flow.verifier
  })
  try {
    return await exchanging
  } finally {
    exchanging = null
  }
}
export async function accessToken(force = false) {
  const session = getSession()
  if (!session) throw new Error('Connectez votre compte Spotify pour continuer.')
  if (!force && Date.now() < session.expiresAt - 60000) return session.accessToken
  if (!session.refreshToken) {
    clearSession()
    throw new Error('Session Spotify expirée. Reconnectez-vous.')
  }
  if (!refreshing)
    refreshing = tokenRequest(
      {
        client_id: session.clientId,
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken
      },
      session
    ).finally(() => {
      refreshing = null
    })
  return (await refreshing).accessToken
}
export async function spotifyRequest(path, { method = 'GET', body, signal } = {}, retry = true) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Chemin Spotify invalide.')
  let response
  const token = await accessToken()
  try {
    response = await fetch(`https://api.spotify.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: signal || AbortSignal.timeout(15000)
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('La requête Spotify a échoué. Vérifiez votre connexion.')
  }
  if (response.status === 401 && retry) {
    await accessToken(true)
    return spotifyRequest(path, { method, body, signal }, false)
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 403)
      throw new Error(
        'Spotify refuse cet accès. Vérifiez Premium, les autorisations et la liste des utilisateurs autorisés dans le Dashboard.'
      )
    if (response.status === 429)
      throw new Error(
        `Limite Spotify atteinte. Réessayez dans ${response.headers.get('Retry-After') || 'quelques'} secondes.`
      )
    throw new Error(data?.error?.message || `Erreur Spotify (${response.status}).`)
  }
  return data
}
export function mapSpotifyAlbum(a) {
  return {
    id: a.id,
    title: a.name,
    artist: (a.artists || []).map((x) => x.name).join(', '),
    cover: a.images?.[0]?.url || '',
    year: a.release_date?.slice(0, 4),
    genre: 'Spotify',
    palette: 'sage',
    mark: a.name?.slice(0, 1),
    spotifyUrl: a.external_urls?.spotify || `https://open.spotify.com/album/${a.id}`
  }
}
export function mapSpotifyTrack(t, album = t.album) {
  return {
    id: t.id,
    title: t.name,
    artist: (t.artists || []).map((x) => x.name).join(', '),
    album: album?.name || '',
    albumId: album?.id,
    duration: t.duration_ms / 1000,
    cover: album?.images?.[0]?.url || '',
    genre: 'Spotify',
    palette: 'sage',
    mark: t.name?.slice(0, 1),
    source: 'spotify',
    uri: t.uri || `spotify:track:${t.id}`,
    spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`
  }
}
export async function allPages(path) {
  const items = []
  while (path) {
    const page = await spotifyRequest(path)
    items.push(...(page.items || []))
    path = page.next
      ? new URL(page.next).pathname.replace(/^\/v1/, '') + new URL(page.next).search
      : null
  }
  return items
}
export async function searchSpotify(query, offset = 0, signal) {
  const params = new URLSearchParams({
    q: query,
    type: 'track,album',
    limit: '10',
    offset: String(offset)
  })
  const data = await spotifyRequest(`/search?${params}`, { signal })
  return {
    tracks: (data.tracks?.items || []).filter((t) => t?.id).map((t) => mapSpotifyTrack(t)),
    albums: (data.albums?.items || []).filter((a) => a?.id).map(mapSpotifyAlbum),
    hasMore: !!data.tracks?.next
  }
}
export async function loadSpotifyLibrary() {
  const [profile, saved, lists, savedAlbums] = await Promise.all([
    spotifyRequest('/me'),
    allPages('/me/tracks?limit=50'),
    allPages('/me/playlists?limit=50'),
    allPages('/me/albums?limit=50')
  ])
  const tracks = saved
    .map((x) => x.track)
    .filter((t) => t?.id)
    .map((t) => mapSpotifyTrack(t))
  const albums = new Map(
    savedAlbums.filter((x) => x.album).map((x) => [x.album.id, mapSpotifyAlbum(x.album)])
  )
  for (const item of saved)
    if (item.track?.album) albums.set(item.track.album.id, mapSpotifyAlbum(item.track.album))
  return {
    profile,
    tracks,
    albums: [...albums.values()],
    favorites: tracks.map((t) => t.id),
    playlists: lists
      .filter((p) => p?.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        cover: p.images?.[0]?.url,
        owner: p.owner?.id,
        editable: p.owner?.id === profile.id || p.collaborative,
        songIds: [],
        songCount: p.items?.total ?? p.tracks?.total ?? 0,
        palette: 'violet'
      }))
  }
}
export async function spotifyAlbum(id) {
  const a = await spotifyRequest(`/albums/${encodeURIComponent(id)}`)
  const entries = await allPages(`/albums/${encodeURIComponent(id)}/tracks?limit=50`)
  return {
    album: mapSpotifyAlbum(a),
    tracks: entries.filter((t) => t?.id).map((t) => mapSpotifyTrack(t, a))
  }
}
export async function spotifyPlaylist(id) {
  const entries = await allPages(`/playlists/${encodeURIComponent(id)}/items?limit=50`)
  return entries
    .map((x) => x.item || x.track)
    .filter((t) => t?.id && t.type === 'track')
    .map((t) => mapSpotifyTrack(t))
}
export function setSaved(uri, saved) {
  return spotifyRequest(`/me/library?${new URLSearchParams({ uris: uri })}`, {
    method: saved ? 'PUT' : 'DELETE'
  })
}
