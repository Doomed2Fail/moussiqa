import { describe, it, expect } from 'vitest'
import { formatTime, filterTracks, nextIndex, readStorage } from './utils'


describe('recherche musicale', () => {
  const tracks = [
    { id: 1, title: 'Écume', artist: 'Studio Moussiqa', album: 'Marée douce', genre: 'Focus' },
    {
      id: 2,
      title: 'Néon bleu',
      artist: 'Studio Moussiqa',
      album: 'Après minuit',
      genre: 'Électronique'
    }
  ]
  it('ignore les accents et la casse, et combine les mots sur les métadonnées', () => {
    expect(filterTracks(tracks, '  ECUME moussiqa  ')).toEqual([tracks[0]])
    expect(filterTracks(tracks, 'electronique')).toEqual([tracks[1]])
    expect(filterTracks(tracks, 'absent')).toEqual([])
  })
})
describe('navigation dans la file', () => {
  it('arrête la lecture à la fin sans répétition et reboucle sur demande explicite', () => {
    expect(nextIndex(3, 2, { ended: true })).toBe(-1)
    expect(nextIndex(3, 2)).toBe(0)
    expect(nextIndex(3, 2, { ended: true, repeat: 'all' })).toBe(0)
  })
  it('répète un morceau uniquement à sa fin naturelle', () => {
    expect(nextIndex(3, 1, { ended: true, repeat: 'one' })).toBe(1)
    expect(nextIndex(3, 1, { repeat: 'one' })).toBe(2)
  })
  it('évite de reprendre le même morceau en aléatoire', () => {
    for (let current = 0; current < 5; current++)
      for (const random of [0, 0.3, 0.999])
        expect(nextIndex(5, current, { shuffle: true, random: () => random })).not.toBe(current)
    expect(nextIndex(0, -1)).toBe(-1)
    expect(nextIndex(1, 0, { shuffle: true, ended: true })).toBe(-1)
  })
})
describe('durée et persistance', () => {
  it('affiche les valeurs non disponibles sans NaN', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(125.9)).toBe('2:05')
  })
  it('récupère un stockage corrompu ou inaccessible', () => {
    expect(readStorage({ getItem: () => 'bad json' }, 'key', [])).toEqual([])
    expect(
      readStorage(
        {
          getItem: () => {
            throw Error()
          }
        },
        'key',
        []
      )
    ).toEqual([])
  })
})
