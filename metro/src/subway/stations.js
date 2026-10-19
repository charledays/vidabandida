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
 * and the paste-up poster on the platform wall (poster, href: the way into that section). No billboard
 * and no takeover: dark tile with marker tags.
 */
export var stations = [
  { id: 'shop', name: 'VIDABANDIDA Shop', note: 'Catálogo', href: '/shop/', poster: V + 'pasteup-shop.webp' },
  { id: 'og-bandit', name: 'OG Bandit', note: 'Personaliza tu OG BANDIT', href: '/og-bandit/', poster: V + 'pasteup-og-bandit.webp' },
  { id: 'featured', name: 'Featured', note: 'Collabs', href: '/featured/', poster: V + 'pasteup-featured.webp' },
  { id: 'filosofia', name: 'Filosofía', note: 'Bandidaje fino', href: '/shop/#filosofia', poster: V + 'pasteup-filosofia.webp' }
];

/**
 * Secret stop, behind the "Bandidaje Fino" sign over the seated panda (a still click there rides
 * the train on to the next stop, dressed as this one): a station like the others, its wall tagged
 * end to end (STATION_TAGS in exterior/station.js), and the offer as the paste-up. The 20% is
 * honoured by hand when the order is confirmed on WhatsApp: the code plus a screenshot.
 */
export var bandidajeFino = {
  id: 'bandidaje-fino',
  name: 'Bandidaje Fino',
  note: '20% en tu próxima compra · BANDIDAJEFINO20',
  href: '/shop/',
  secret: true,
  poster: V + 'pasteup-bandidaje-fino.webp'
};

/** The line map's stops are the stations themselves, so the map and the ride always agree. */
export var mapStops = stations;
