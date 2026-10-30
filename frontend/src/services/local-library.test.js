import { describe, it, expect } from 'vitest'
import { audioFileAccepted, localCatalog } from './local-library'
describe('bibliothèque locale sans Spotify', () => {
  it('fournit huit fichiers audio embarqués et quatre albums sans URL externe', () => {
    const {tracks,albums}=localCatalog()
    expect(tracks).toHaveLength(8)
    expect(albums).toHaveLength(4)
    expect(tracks.every(t=>t.source==='local'&&t.url.startsWith('/demo/'))).toBe(true)
  })
  it('accepte un fichier audio connu, refuse les documents et les fichiers vides', () => {
    expect(audioFileAccepted({name:'ma musique.MP3',type:'',size:10})).toBe(true)
    expect(audioFileAccepted({name:'cours.pdf',type:'application/pdf',size:10})).toBe(false)
    expect(audioFileAccepted({name:'vide.wav',type:'audio/wav',size:0})).toBe(false)
  })
  it('sépare les fichiers personnels de la bibliothèque de démonstration', () => {
    const track={id:'personal-1',title:'Mon morceau',source:'local',albumId:'personal-files',url:'blob:test'}
    const catalog=localCatalog([track])
    expect(catalog.tracks).toHaveLength(9)
    expect(catalog.albums.at(-1).id).toBe('personal-files')
  })
})
