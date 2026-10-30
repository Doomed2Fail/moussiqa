import { accessToken, spotifyRequest, getSession, hasPlaybackScopes } from './spotify'
let sdkLoading

function loadSdk() {
  if (window.Spotify) return Promise.resolve()
  if (sdkLoading) return sdkLoading
  sdkLoading = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error(
            'Le lecteur Spotify n’a pas pu se charger. Vérifiez votre navigateur et votre connexion.'
          )
        ),
      15000
    )
    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timeout)
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Chargement du lecteur Spotify impossible.'))
    }
    document.head.append(script)
  }).catch((error) => {
    sdkLoading = null
    throw error
  })
  return sdkLoading
}
export function createSpotifyPlayback(onState, onError) {
  let player = null
  let ready = null
  let deviceId = null
  let disposed = false
  async function initialize(volume) {
    if (ready) return ready
    ready = (async () => {
      if (!hasPlaybackScopes(getSession())) {
        throw new Error(
          'Autorisations Spotify insuffisantes. Déconnectez-vous puis reconnectez-vous pour autoriser le lecteur.'
        )
      }
      await loadSdk()
      if (disposed) throw new Error('Le lecteur Spotify est déconnecté.')
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(new Error('Spotify n’a pas trouvé le lecteur. Réessayez avec Chrome ou Edge.')),
          20000
        )
        player = new window.Spotify.Player({
          name: 'Moussiqa',
          volume,
          getOAuthToken: (callback) =>
            accessToken()
              .then(callback)
              .catch((error) => {
                onError(error)
                reject(error)
              })
        })
        player.addListener('ready', ({ device_id }) => {
          clearTimeout(timeout)
          deviceId = device_id
          resolve(deviceId)
        })
        player.addListener('not_ready', () => {
          deviceId = null
          ready = null
          onError(new Error('Le lecteur Spotify est hors ligne. Relancez un morceau.'))
        })
        player.addListener('player_state_changed', (state) => {
          if (state) onState(state)
        })
        for (const event of [
          'initialization_error',
          'authentication_error',
          'account_error',
          'playback_error'
        ])
          player.addListener(event, ({ message }) => {
            clearTimeout(timeout)
            const error = new Error(
              event === 'account_error'
                ? 'Un compte Spotify Premium est nécessaire pour lire les titres.'
                : /scope/i.test(message)
                  ? 'Autorisations Spotify insuffisantes. Déconnectez-vous puis reconnectez-vous pour autoriser le lecteur.'
                  : message
            )
            onError(error)
            reject(error)
          })
        player
          .connect()
          .then((ok) => {
            if (!ok) {
              clearTimeout(timeout)
              reject(new Error('Connexion au lecteur Spotify impossible.'))
            }
          })
          .catch(reject)
      })
    })().catch((error) => {
      player?.disconnect()
      player = null
      ready = null
      throw error
    })
    return ready
  }
  return {
    async prepare(volume) {
      return initialize(volume)
    },
    async play(queue, index, volume) {
      // Doit être lancé depuis un clic utilisateur pour les navigateurs mobiles.
      player?.activateElement()
      await initialize(volume)
      if (disposed) return
      await spotifyRequest(`/me/player/play?${new URLSearchParams({ device_id: deviceId })}`, {
        method: 'PUT',
        body: { uris: queue.slice(index, index + 100).map((t) => t.uri), position_ms: 0 }
      })
    },
    async pause() {
      await player?.pause()
    },
    async resume() {
      player?.activateElement()
      await player?.resume()
    },
    async seek(seconds) {
      await player?.seek(Math.round(seconds * 1000))
    },
    async volume(value) {
      await player?.setVolume(value)
    },
    async shuffle(value) {
      if (deviceId)
        await spotifyRequest(
          `/me/player/shuffle?${new URLSearchParams({ state: String(value), device_id: deviceId })}`,
          { method: 'PUT' }
        )
    },
    async repeat(value) {
      if (deviceId)
        await spotifyRequest(
          `/me/player/repeat?${new URLSearchParams({ state: { one: 'track', all: 'context', off: 'off' }[value], device_id: deviceId })}`,
          { method: 'PUT' }
        )
    },
    async state() {
      return player?.getCurrentState()
    },
    disconnect() {
      disposed = true
      player?.disconnect()
      player = null
      ready = null
      deviceId = null
    }
  }
}
