export function formatTime(seconds) {
  if (!Number.isFinite(Number(seconds)) || seconds < 0) return '0:00'
  const value = Math.floor(seconds)
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

export function normalize(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function filterTracks(tracks, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  return tracks.filter((track) =>
    words.every((word) =>
      normalize(`${track.title} ${track.artist} ${track.album} ${track.genre || ''}`).includes(word)
    )
  )
}

export function nextIndex(
  length,
  index,
  { shuffle = false, repeat = 'off', ended = false, random = Math.random } = {}
) {
  if (!length) return -1
  if (ended && repeat === 'one') return index
  if (shuffle && length > 1) return (index + 1 + Math.floor(random() * (length - 1))) % length
  if (index + 1 < length) return index + 1
  return repeat === 'all' || !ended ? 0 : -1
}

export function readStorage(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

export function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
