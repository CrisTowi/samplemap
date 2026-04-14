import type { Track } from '../types'

// ─── Amen Break lineage ──────────────────────────────────────────────────────
export const amenBrother: Track = {
  id: 'amen-brother-winstons',
  title: 'Amen, Brother',
  artist: 'The Winstons',
  album: 'Amen, Brother',
  year: 1969,
  coverArt: 'https://i.scdn.co/image/ab67616d0000b273e7c9a3f7d3ecf5f48b8a7e2c',
  sampleCount: { sampledIn: 3847, sampledFrom: 0 },
}

export const thinkLynCollins: Track = {
  id: 'think-lyn-collins',
  title: 'Think (About It)',
  artist: 'Lyn Collins',
  album: 'Think About It',
  year: 1972,
  sampleCount: { sampledIn: 862, sampledFrom: 0 },
}

export const funkyDrummer: Track = {
  id: 'funky-drummer-james-brown',
  title: 'Funky Drummer',
  artist: 'James Brown',
  album: 'In the Jungle Groove',
  year: 1970,
  sampleCount: { sampledIn: 1253, sampledFrom: 0 },
}

export const straightOuttaCompton: Track = {
  id: 'straight-outta-compton-nwa',
  title: 'Straight Outta Compton',
  artist: 'N.W.A',
  album: 'Straight Outta Compton',
  year: 1988,
  sampleCount: { sampledIn: 47, sampledFrom: 3 },
}

export const nthDegree: Track = {
  id: 'nth-degree-morningwood',
  title: 'Nth Degree',
  artist: 'Morningwood',
  album: 'Morningwood',
  year: 2006,
  sampleCount: { sampledIn: 2, sampledFrom: 1 },
}

export const publicEnemyFightPower: Track = {
  id: 'fight-the-power-public-enemy',
  title: 'Fight the Power',
  artist: 'Public Enemy',
  album: 'Fear of a Black Planet',
  year: 1990,
  sampleCount: { sampledIn: 89, sampledFrom: 5 },
}

export const getOnUp: Track = {
  id: 'get-on-up-james-brown',
  title: 'Get Up (I Feel Like Being a) Sex Machine',
  artist: 'James Brown',
  album: 'Sex Machine',
  year: 1970,
  sampleCount: { sampledIn: 764, sampledFrom: 0 },
}

export const hardstep: Track = {
  id: 'hardstep-goldie',
  title: 'Inner City Life',
  artist: 'Goldie',
  album: 'Timeless',
  year: 1995,
  sampleCount: { sampledIn: 14, sampledFrom: 2 },
}

export const nwaRealOGz: Track = {
  id: 'real-ogz-nwa',
  title: 'Real Muthaphuckkin G\'s',
  artist: 'Eazy-E',
  album: 'It\'s On (Dr. Dre) 187um Killa',
  year: 1993,
  sampleCount: { sampledIn: 8, sampledFrom: 2 },
}

export const passingMeBy: Track = {
  id: 'passing-me-by-pharcyde',
  title: 'Passin\' Me By',
  artist: 'The Pharcyde',
  album: 'Bizarre Ride II the Pharcyde',
  year: 1992,
  sampleCount: { sampledIn: 12, sampledFrom: 3 },
}

// ─── Mock search results ─────────────────────────────────────────────────────
export const MOCK_SEARCH_RESULTS: Record<string, Track[]> = {
  'amen': [amenBrother],
  'amen brother': [amenBrother],
  'think': [thinkLynCollins],
  'lyn collins': [thinkLynCollins],
  'funky drummer': [funkyDrummer],
  'james brown': [funkyDrummer, getOnUp],
  'nwa': [straightOuttaCompton],
  'straight outta compton': [straightOuttaCompton],
  'public enemy': [publicEnemyFightPower],
  'fight the power': [publicEnemyFightPower],
}

// ─── Mock sample relationships ───────────────────────────────────────────────
export const MOCK_SAMPLE_RELATIONSHIPS: Record<string, {
  sampledIn: Track[];
  sampledFrom: Track[];
}> = {
  [amenBrother.id]: {
    sampledIn: [straightOuttaCompton, publicEnemyFightPower, hardstep, passingMeBy],
    sampledFrom: [],
  },
  [thinkLynCollins.id]: {
    sampledIn: [publicEnemyFightPower, nthDegree, passingMeBy],
    sampledFrom: [],
  },
  [funkyDrummer.id]: {
    sampledIn: [straightOuttaCompton, publicEnemyFightPower, passingMeBy],
    sampledFrom: [getOnUp],
  },
  [straightOuttaCompton.id]: {
    sampledIn: [nwaRealOGz],
    sampledFrom: [amenBrother, funkyDrummer, getOnUp],
  },
  [publicEnemyFightPower.id]: {
    sampledIn: [],
    sampledFrom: [amenBrother, thinkLynCollins, funkyDrummer, getOnUp, nthDegree],
  },
  [getOnUp.id]: {
    sampledIn: [funkyDrummer, straightOuttaCompton, publicEnemyFightPower],
    sampledFrom: [],
  },
  [hardstep.id]: {
    sampledIn: [],
    sampledFrom: [amenBrother, thinkLynCollins],
  },
  [passingMeBy.id]: {
    sampledIn: [],
    sampledFrom: [amenBrother, thinkLynCollins, funkyDrummer],
  },
  [nthDegree.id]: {
    sampledIn: [],
    sampledFrom: [thinkLynCollins],
  },
  [nwaRealOGz.id]: {
    sampledIn: [],
    sampledFrom: [straightOuttaCompton, amenBrother],
  },
}
