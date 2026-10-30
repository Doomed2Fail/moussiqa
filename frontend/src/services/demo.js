export const demoAlbums = [
  {
    id: 'atlas',
    title: 'Atlas intérieur',
    artist: 'Studio Moussiqa',
    genre: 'Ambient',
    year: 2026,
    palette: 'sage',
    mark: 'a',
    description: 'Un horizon ouvert. Des textures douces pour prendre le temps.'
  },
  {
    id: 'nuit',
    title: 'Après minuit',
    artist: 'Studio Moussiqa',
    genre: 'Électronique',
    year: 2026,
    palette: 'violet',
    mark: 'n',
    description: 'La ville ralentit, les synthés prennent le relais.'
  },
  {
    id: 'soleil',
    title: 'Soleil lent',
    artist: 'Studio Moussiqa',
    genre: 'Chill',
    year: 2026,
    palette: 'orange',
    mark: 's',
    description: 'Des boucles lumineuses et un peu de chaleur dans les écouteurs.'
  },
  {
    id: 'maree',
    title: 'Marée douce',
    artist: 'Studio Moussiqa',
    genre: 'Focus',
    year: 2026,
    palette: 'blue',
    mark: 'm',
    description: 'Une respiration, quelques notes, et de la place pour vos idées.'
  }
]

export const demoTracks = [
  ['horizon', 'Horizon', 'atlas', 32],
  ['derive', 'Dérive', 'atlas', 32],
  ['neon', 'Néon bleu', 'nuit', 32],
  ['insomnie', 'Insomnie', 'nuit', 32],
  ['ambre', 'Ambre', 'soleil', 32],
  ['eclaircie', 'Éclaircie', 'soleil', 32],
  ['ecume', 'Écume', 'maree', 32],
  ['reflets', 'Reflets', 'maree', 32]
].map(([id, title, albumId, duration]) => {
  const album = demoAlbums.find((a) => a.id === albumId)
  return {
    id,
    title,
    albumId,
    album: album.title,
    artist: album.artist,
    genre: album.genre,
    palette: album.palette,
    mark: album.mark,
    duration,
    url: `/demo/${id}.wav`
  }
})

export const initialPlaylists = [
  {
    id: 'calme',
    name: 'Une pause, enfin',
    songIds: ['horizon', 'ecume', 'derive', 'reflets'],
    palette: 'sage'
  },
  {
    id: 'soir',
    name: 'La nuit nous appartient',
    songIds: ['neon', 'insomnie', 'ambre'],
    palette: 'violet'
  }
]
