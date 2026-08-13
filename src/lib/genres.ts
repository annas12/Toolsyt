import type { GenreResult, YouTubeVideo } from '../types'

export const GENRES: Record<string, string[]> = {
  'All Genres': [],
  Pop: ['Pop', 'Indie Pop', 'Synth Pop', 'Dream Pop'],
  Reggae: ['Reggae', 'Roots Reggae', 'Reggae Pop', 'Dancehall', 'Dub', 'Ska'],
  Dangdut: ['Dangdut', 'Dangdut Koplo', 'Dangdut Melayu', 'Dangdut Pop', 'Dangdut Remix'],
  'Hip-Hop / Rap': ['Hip-Hop', 'Rap', 'Trap', 'Drill', 'Boom Bap', 'Lo-Fi Hip-Hop'],
  'R&B / Soul': ['R&B', 'Soul', 'Neo Soul'],
  Electronic: ['EDM', 'House', 'Techno', 'Trance', 'Dubstep', 'Drum & Bass', 'DJ Remix'],
  Rock: ['Rock', 'Alternative Rock', 'Indie Rock', 'Pop Rock', 'Hard Rock'],
  Metal: ['Metal', 'Metalcore', 'Heavy Metal'],
  Jazz: ['Jazz', 'Smooth Jazz', 'Vocal Jazz'],
  Blues: ['Blues', 'Blues Rock'],
  Country: ['Country', 'Country Pop'],
  Folk: ['Folk', 'Indie Folk'],
  Acoustic: ['Acoustic', 'Acoustic Pop'],
  Latin: ['Latin', 'Reggaeton', 'Latin Pop', 'Salsa', 'Bachata'],
  'K-Pop': ['K-Pop'],
  'J-Pop': ['J-Pop'],
  Afrobeats: ['Afrobeats', 'Afropop', 'Amapiano'],
  'Religious / Spiritual': ['Islamic', 'Nasheed', 'Sholawat', 'Gospel', 'Christian Worship', 'Meditation', 'Spiritual'],
  Instrumental: ['Instrumental', 'Piano', 'Orchestral'],
  'Lo-Fi': ['Lo-Fi', 'Lo-Fi Hip-Hop', 'Chillhop'],
  Soundtrack: ['Soundtrack', 'OST', 'Score'],
}

type Rule = { genre: string; subgenre: string; keywords: string[] }

const rules: Rule[] = [
  { genre: 'Reggae', subgenre: 'Roots Reggae', keywords: ['roots reggae', 'rasta', 'rastafari'] },
  { genre: 'Reggae', subgenre: 'Reggae Pop', keywords: ['reggae pop', 'pop reggae'] },
  { genre: 'Reggae', subgenre: 'Dancehall', keywords: ['dancehall'] },
  { genre: 'Reggae', subgenre: 'Dub', keywords: [' dub ', 'dub reggae'] },
  { genre: 'Reggae', subgenre: 'Ska', keywords: [' ska ', 'ska punk'] },
  { genre: 'Reggae', subgenre: 'Reggae', keywords: ['reggae'] },
  { genre: 'Dangdut', subgenre: 'Dangdut Koplo', keywords: ['koplo', 'dangdut koplo'] },
  { genre: 'Dangdut', subgenre: 'Dangdut Remix', keywords: ['dangdut remix', 'dj dangdut'] },
  { genre: 'Dangdut', subgenre: 'Dangdut Melayu', keywords: ['dangdut melayu'] },
  { genre: 'Dangdut', subgenre: 'Dangdut', keywords: ['dangdut'] },
  { genre: 'Hip-Hop / Rap', subgenre: 'Drill', keywords: [' drill ', 'uk drill'] },
  { genre: 'Hip-Hop / Rap', subgenre: 'Trap', keywords: [' trap ', 'trap music'] },
  { genre: 'Hip-Hop / Rap', subgenre: 'Boom Bap', keywords: ['boom bap'] },
  { genre: 'Hip-Hop / Rap', subgenre: 'Rap', keywords: [' rap ', 'rapper', 'hip hop', 'hip-hop'] },
  { genre: 'Electronic', subgenre: 'House', keywords: [' house music', 'deep house', 'tech house'] },
  { genre: 'Electronic', subgenre: 'Techno', keywords: ['techno'] },
  { genre: 'Electronic', subgenre: 'Trance', keywords: ['trance'] },
  { genre: 'Electronic', subgenre: 'Dubstep', keywords: ['dubstep'] },
  { genre: 'Electronic', subgenre: 'Drum & Bass', keywords: ['drum and bass', 'drum & bass', 'dnb'] },
  { genre: 'Electronic', subgenre: 'DJ Remix', keywords: ['dj remix', 'remix'] },
  { genre: 'Electronic', subgenre: 'EDM', keywords: [' edm ', 'electronic dance'] },
  { genre: 'K-Pop', subgenre: 'K-Pop', keywords: ['k-pop', 'kpop'] },
  { genre: 'J-Pop', subgenre: 'J-Pop', keywords: ['j-pop', 'jpop'] },
  { genre: 'Latin', subgenre: 'Reggaeton', keywords: ['reggaeton'] },
  { genre: 'Latin', subgenre: 'Bachata', keywords: ['bachata'] },
  { genre: 'Latin', subgenre: 'Salsa', keywords: [' salsa '] },
  { genre: 'Latin', subgenre: 'Latin Pop', keywords: ['latin pop'] },
  { genre: 'Afrobeats', subgenre: 'Amapiano', keywords: ['amapiano'] },
  { genre: 'Afrobeats', subgenre: 'Afrobeats', keywords: ['afrobeats', 'afrobeat'] },
  { genre: 'Religious / Spiritual', subgenre: 'Sholawat', keywords: ['sholawat', 'shalawat'] },
  { genre: 'Religious / Spiritual', subgenre: 'Nasheed', keywords: ['nasheed', 'nasyid'] },
  { genre: 'Religious / Spiritual', subgenre: 'Islamic', keywords: ['islamic song', 'lagu islami', 'religi islam'] },
  { genre: 'Religious / Spiritual', subgenre: 'Christian Worship', keywords: ['worship', 'praise and worship'] },
  { genre: 'Religious / Spiritual', subgenre: 'Gospel', keywords: ['gospel'] },
  { genre: 'Lo-Fi', subgenre: 'Lo-Fi', keywords: ['lofi', 'lo-fi'] },
  { genre: 'Jazz', subgenre: 'Smooth Jazz', keywords: ['smooth jazz'] },
  { genre: 'Jazz', subgenre: 'Jazz', keywords: [' jazz '] },
  { genre: 'Rock', subgenre: 'Alternative Rock', keywords: ['alternative rock'] },
  { genre: 'Rock', subgenre: 'Indie Rock', keywords: ['indie rock'] },
  { genre: 'Rock', subgenre: 'Pop Rock', keywords: ['pop rock'] },
  { genre: 'Rock', subgenre: 'Rock', keywords: [' rock '] },
  { genre: 'Metal', subgenre: 'Metalcore', keywords: ['metalcore'] },
  { genre: 'Metal', subgenre: 'Metal', keywords: [' metal '] },
  { genre: 'R&B / Soul', subgenre: 'Neo Soul', keywords: ['neo soul'] },
  { genre: 'R&B / Soul', subgenre: 'R&B', keywords: ['r&b', 'rnb'] },
  { genre: 'Acoustic', subgenre: 'Acoustic', keywords: ['acoustic', 'akustik'] },
  { genre: 'Country', subgenre: 'Country', keywords: ['country music'] },
  { genre: 'Folk', subgenre: 'Folk', keywords: ['folk music', 'indie folk'] },
  { genre: 'Soundtrack', subgenre: 'OST', keywords: ['official soundtrack', ' ost ', 'soundtrack'] },
  { genre: 'Instrumental', subgenre: 'Instrumental', keywords: ['instrumental'] },
  { genre: 'Pop', subgenre: 'Indie Pop', keywords: ['indie pop'] },
  { genre: 'Pop', subgenre: 'Synth Pop', keywords: ['synthpop', 'synth pop'] },
  { genre: 'Pop', subgenre: 'Pop', keywords: [' pop ', 'pop music'] },
]

export function classifyGenre(video: YouTubeVideo): GenreResult {
  const text = ` ${video.snippet.title} ${video.snippet.channelTitle} ${video.snippet.description} ${(video.snippet.tags || []).join(' ')} `.toLowerCase()
  for (const rule of rules) {
    const matches = rule.keywords.filter((keyword) => text.includes(keyword)).length
    if (matches) return { genre: rule.genre, subgenre: rule.subgenre, confidence: Math.min(0.95, 0.55 + matches * 0.15) }
  }
  return { genre: 'Other / Unknown', subgenre: 'Unclassified', confidence: 0.2 }
}
