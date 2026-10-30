import { demoTracks, demoAlbums, initialPlaylists } from './demo'

const DATABASE = 'moussiqa-local-audio'
const STORE = 'tracks'
const urls = new Map()
export const LOCAL_KEYS = {
  favorites: 'moussiqa.local.favorites',
  playlists: 'moussiqa.local.playlists',
  recent: 'moussiqa.local.recent'
}
export const localDefaults = { favorites: ['horizon', 'ambre'], playlists: initialPlaylists }

function database() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return }
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Le navigateur ne peut pas ouvrir la bibliothèque audio locale.'))
  })
}
function publicTrack(record) {
  if (!urls.has(record.id)) urls.set(record.id, URL.createObjectURL(record.file))
  const { file, ...track } = record
  return { ...track, url: urls.get(record.id) }
}
export function localCatalog(imported = []) {
  const tracks = [...demoTracks.map(track => ({ ...track, source: 'local' })), ...imported]
  const albums = demoAlbums.map(album => ({ ...album }))
  if (imported.length) albums.push({ id: 'personal-files', title: 'Mes fichiers audio', artist: 'Bibliothèque locale', genre: 'Personnel', palette: 'violet', mark: 'm', description: 'Vos fichiers audio, conservés dans ce navigateur.' })
  return { tracks, albums }
}
export async function loadLocalCatalog() {
  const db = await database()
  if (!db) return localCatalog()
  try {
    const records = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('Lecture des fichiers locaux impossible.'))
    })
    return localCatalog(records.map(publicTrack))
  } finally { db.close() }
}
export function audioFileAccepted(file) {
  return file.size > 0 && (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|webm|opus)$/i.test(file.name))
}
async function durationOf(file) {
  const url = URL.createObjectURL(file)
  return new Promise(resolve => {
    const audio = document.createElement('audio')
    let finished = false
    const finish = duration => { if (finished) return; finished = true; clearTimeout(timeout); audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); resolve(duration) }
    const timeout = setTimeout(() => finish(0), 4000)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) ? audio.duration : 0)
    audio.onerror = () => finish(0)
    audio.src = url
  })
}
export async function importLocalFiles(files) {
  const accepted = Array.from(files).filter(audioFileAccepted)
  if (!accepted.length) throw new Error('Sélectionnez au moins un fichier audio (MP3, WAV, OGG, M4A…).')
  const db = await database()
  if (!db) throw new Error('Ce navigateur ne permet pas la conservation locale des fichiers audio.')
  const imported = []
  try {
    for (const file of accepted) {
      const record = { id: `personal-${crypto.randomUUID()}`, title: file.name.replace(/\.[^.]+$/, '').replaceAll('_', ' '), artist: 'Fichier personnel', album: 'Mes fichiers audio', albumId: 'personal-files', genre: 'Personnel', duration: await durationOf(file), source: 'local', palette: 'violet', mark: '♪', file }
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite')
        transaction.objectStore(STORE).put(record)
        transaction.oncomplete = resolve
        transaction.onerror = () => reject(new Error('Espace de stockage insuffisant ou import audio impossible.'))
        transaction.onabort = () => reject(new Error('L’import a été interrompu.'))
      })
      imported.push(publicTrack(record))
    }
    return imported
  } finally { db.close() }
}
