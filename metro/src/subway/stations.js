/**
 * Line data: the line itself, the ad artwork, and the stations. Add a stop by adding an object
 * to `stations`; the ride, the line map and GET OFF all follow.
 */
export var LINE = { bullet: 'V', color: '#D63B0C', name: 'VIDABANDIDA Line' };

/**
 * Artwork on the ad cards in the cove: VIDABANDIDA brand posters (no photos). Card k shows adArt[k % length].
 */
var V = '/metro/images/web/vb/';
export var adArt = [
  V + 'wordmark-accent.webp', V + 'isotipo-ink.webp', V + 'logo-cream.webp', V + 'back-ink.webp',
  V + 'isotipo-accent.webp', V + 'wordmark-ink.webp'
];

/**
 * The circle line, in order; after the last stop the train comes back around to the first.
 * Each station feeds the station template (name tablets, signs), the line map (name, note, href)
 * and the visit sign on the platform wall (name, href). No billboard and no takeover: the platforms
 * are bare tile for now (the walls and columns get dressed once the artwork is agreed).
 */
export var stations = [
  { id: 'shop', name: 'VIDABANDIDA Shop', note: 'Catálogo', href: '/#catalogo' },
  { id: 'og-bandit', name: 'OG Bandit', note: 'Personaliza tu OG BANDIT', href: '/og-bandit/' },
  { id: 'featured', name: 'Featured', note: 'Collabs', href: '/#catalogo' },
  { id: 'filosofia', name: 'Filosofía', note: 'Bandidaje fino', href: '/#filosofia' }
];

/** The line map's stops are the stations themselves, so the map and the ride always agree. */
export var mapStops = stations;
