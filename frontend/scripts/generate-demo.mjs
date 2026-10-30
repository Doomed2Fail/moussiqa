// Compositions de démonstration originales, générées sans échantillons externes.
// WAV PCM mono, métadonnées RIFF INFO pour le scan Navidrome.
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const output = fileURLToPath(new URL('../public/demo/', import.meta.url))
await mkdir(output, { recursive: true })
const sampleRate = 22050
const duration = 32
const songs = [
  ['horizon', 'Horizon', 'Atlas intérieur', 0, 84, 'Ambient'],
  ['derive', 'Dérive', 'Atlas intérieur', 2, 80, 'Ambient'],
  ['neon', 'Néon bleu', 'Après minuit', -3, 112, 'Électronique'],
  ['insomnie', 'Insomnie', 'Après minuit', -5, 108, 'Électronique'],
  ['ambre', 'Ambre', 'Soleil lent', 5, 96, 'Chill'],
  ['eclaircie', 'Éclaircie', 'Soleil lent', 7, 100, 'Chill'],
  ['ecume', 'Écume', 'Marée douce', -2, 72, 'Focus'],
  ['reflets', 'Reflets', 'Marée douce', 3, 76, 'Focus']
]
function chunk(name, data) {
  const h = Buffer.alloc(8)
  h.write(name)
  h.writeUInt32LE(data.length, 4)
  return Buffer.concat([h, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)])
}
for (const [index, [id, title, album, transpose, bpm, genre]] of songs.entries()) {
  const samples = Buffer.alloc(sampleRate * duration * 2)
  const beat = 60 / bpm
  const roots = [48 + transpose, 53 + transpose, 45 + transpose, 55 + transpose]
  const freq = (note) => 440 * 2 ** ((note - 69) / 12)
  let seed = index + 42
  for (let i = 0; i < sampleRate * duration; i++) {
    const t = i / sampleRate
    const root = roots[Math.floor(t / (beat * 4)) % roots.length]
    let sound = 0
    for (const interval of [0, 3, 7, 10]) {
      const f = freq(root + interval + 12)
      sound += Math.sin(2 * Math.PI * f * t + 0.12 * Math.sin(t * 1.5)) * 0.043
      sound += Math.sin(2 * Math.PI * f * 1.002 * t) * 0.02
    }
    const phase = t % beat
    sound += Math.sin(2 * Math.PI * freq(root - 12) * t) * 0.18 * Math.exp(-phase * 5)
    const eighth = t % (beat / 2)
    const melodyNote = root + [12, 19, 22, 15, 24, 19, 15, 22][Math.floor(t / (beat / 2)) % 8]
    sound +=
      (Math.sin(2 * Math.PI * freq(melodyNote) * t) +
        0.25 * Math.sin(2 * Math.PI * freq(melodyNote) * 2 * t)) *
      Math.exp(-eighth * 9) *
      0.095
    if (index >= 2 && index <= 5) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const noise = (seed / 4294967296) * 2 - 1
      sound += noise * Math.exp(-eighth * 110) * 0.055
      sound +=
        Math.sin(2 * Math.PI * (48 * phase + 6 * (1 - Math.exp(-phase * 25)))) *
        Math.exp(-phase * 16) *
        0.22
      const snarePhase = (t + beat) % (beat * 2)
      sound += noise * Math.exp(-snarePhase * 27) * 0.1
    }
    const fade = Math.min(1, t / 1.5, (duration - t) / 2)
    samples.writeInt16LE(Math.round(Math.tanh(sound) * 26000 * fade), i * 2)
  }
  const fmt = Buffer.alloc(16)
  fmt.writeUInt16LE(1, 0)
  fmt.writeUInt16LE(1, 2)
  fmt.writeUInt32LE(sampleRate, 4)
  fmt.writeUInt32LE(sampleRate * 2, 8)
  fmt.writeUInt16LE(2, 12)
  fmt.writeUInt16LE(16, 14)
  const tags = {
    INAM: title,
    IART: 'Studio Moussiqa',
    IPRD: album,
    IGNR: genre,
    ICRD: '2026',
    ITRK: String((index % 2) + 1),
    ICMT: 'Composition originale de demonstration - projet Ondes. CC0-1.0.'
  }
  const info = Buffer.concat([
    Buffer.from('INFO'),
    ...Object.entries(tags).map(([k, v]) => chunk(k, Buffer.from(v + '\0', 'utf8')))
  ])
  const body = Buffer.concat([
    Buffer.from('WAVE'),
    chunk('fmt ', fmt),
    chunk('data', samples),
    chunk('LIST', info)
  ])
  const header = Buffer.alloc(8)
  header.write('RIFF')
  header.writeUInt32LE(body.length, 4)
  await writeFile(path.join(output, id + '.wav'), Buffer.concat([header, body]))
  console.log(`Créé : ${id}.wav (${duration}s)`)
}
