import { reactive } from 'vue'
import { nextIndex, readStorage, writeStorage } from '../services/utils'
import { useLibrary } from './useLibrary'

const player = reactive({
  queue: [],
  index: -1,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: Math.min(1, Math.max(0, Number(readStorage(localStorage, 'moussiqa.volume', 0.6)) || 0)),
  shuffle: false,
  repeat: 'off',
  queueOpen: false,
  seekTarget: null,
  replayKey: 0,
  get current() {
    return this.queue[this.index] || null
  },
  play(track, list = [track]) {
    if (!track) return
    if (track.source === 'showcase') {
      useLibrary().requireSpotify()
      return
    }
    this.queue = [...list]
    this.index = this.queue.findIndex((t) => t.id === track.id)
    if (this.index < 0) {
      this.queue = [track]
      this.index = 0
    }
    this.currentTime = 0
    this.playing = true
    this.replayKey++
  },
  toggle() {
    if (this.current) this.playing = !this.playing
  },
  next(ended = false) {
    const index = nextIndex(this.queue.length, this.index, {
      shuffle: this.shuffle,
      repeat: this.repeat,
      ended
    })
    if (index < 0) {
      this.playing = false
      return
    }
    this.index = index
    this.currentTime = 0
    this.playing = true
    this.replayKey++
  },
  previous() {
    if (!this.current) return
    if (this.currentTime > 3) {
      this.seekTarget = 0
      return
    }
    this.index = (this.index - 1 + this.queue.length) % this.queue.length
    this.currentTime = 0
    this.playing = true
    this.replayKey++
  },
  setVolume(value) {
    this.volume = Number(value)
    writeStorage(localStorage, 'moussiqa.volume', this.volume)
  },
  cycleRepeat() {
    this.repeat = { off: 'all', all: 'one', one: 'off' }[this.repeat]
  },
  reset() {
    this.queue = []
    this.index = -1
    this.playing = false
    this.currentTime = 0
    this.duration = 0
  }
})

for (const key of Object.keys(player)) {
  if (typeof player[key] === 'function') player[key] = player[key].bind(player)
}

export function usePlayer() {
  return player
}
