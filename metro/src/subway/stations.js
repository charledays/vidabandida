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
  { id: 'featured', name: 'Featured', note: 'Collabs', href: '/shop/', poster: V + 'pasteup-featured.webp' },
  { id: 'filosofia', name: 'Filosofía', note: 'Bandidaje fino', href: '/shop/#filosofia', poster: V + 'pasteup-filosofia.webp' }
];

/**
 * Secret stop, behind the "Bandidaje Fino" sign over the seated panda (a still click there rides
 * the train on to the next stop, dressed as this one): the calligraphy canvas floor to ceiling,
 * sheet after sheet, and the offer pasted up in the doorway's view. The 20% is honoured by hand
 * when the order is confirmed on WhatsApp: the code plus a screenshot of this wall.
 */
export var bandidajeFino = {
  id: 'bandidaje-fino',
  name: 'Bandidaje Fino',
  note: '20% en tu próxima compra',
  href: '/shop/',
  secret: true,
  takeover: {
    wall: 'wallpaper',
    images: [V + 'lienzo-caligrafia.webp'],
    pattern: true,
    deal: {
      kicker: 'Parada secreta',
      title: ['Bandidaje', 'fino.'],
      offer: '20% OFF',
      terms: ['en tu próxima compra', 'código BANDIDAJEFINO20'],
      proof: ['Haz captura de esta pared.', 'Menciona el código al ordenar.']
    }
  }
};

/** The line map's stops are the stations themselves, so the map and the ride always agree. */
export var mapStops = stations;
