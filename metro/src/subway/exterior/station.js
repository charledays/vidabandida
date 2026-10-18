/**
 * Station template. buildStation(data) returns a platform, tiled wall with name tablets,
 * columns, hanging signs and the billboard holding the station's artwork. The group's origin is
 * the point that lines up with the middle of the car doors when the train stops, so the
 * billboard sits right behind the doors.
 */
import * as THREE from 'three';
import { WORLD, CAR, WORDMARK } from '../config.js';
import { LINE } from '../stations.js?v=20261018';
import { tracker, textCanvas, canvasTexture, frameGeometry } from '../geo.js';
import { createTakeover, TAKEOVER } from './takeover.js?v=20261019';
import { rng } from '../materials.js';

var SIGN_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
var TABLET_FONT = 'Georgia, "Times New Roman", serif';

/**
 * Name tablet: black enamel with an orange rule, the VIDABANDIDA logo across the top and the stop's
 * name under it (for the shop stop, just SHOP). The logo is drawn in once it has loaded.
 */
var logoImage = null;
function tabletTexture(registry, name) {
  var label = name.replace(/^VIDABANDIDA\s*/i, '').toUpperCase();
  var c = textCanvas(1024, 300, function (ctx, w, h) { paintTablet(ctx, w, h, label, null); });
  var tex = canvasTexture(c, registry);
  if (!logoImage) { logoImage = new Image(); logoImage.src = WORDMARK.src; }
  function withLogo() {
    paintTablet(c.getContext('2d'), c.width, c.height, label, logoImage);
    tex.needsUpdate = true;
  }
  if (logoImage.complete && logoImage.naturalWidth) withLogo();
  else logoImage.addEventListener('load', withLogo);
  return tex;
}
function paintTablet(ctx, w, h, label, logo) {
  ctx.fillStyle = '#0e0e0f';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = LINE.color;
  ctx.fillRect(0, 0, w, 10);
  ctx.fillRect(0, h - 10, w, 10);
  if (logo) {
    var lw = w * 0.74, lh = lw * logo.naturalHeight / logo.naturalWidth;
    ctx.drawImage(logo, (w - lw) / 2, h * 0.16, lw, lh);
  }
  ctx.fillStyle = '#f0ebe1';
  ctx.font = '700 ' + h * 0.2 + 'px ' + SIGN_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '6px';
  ctx.fillText(label, w / 2, h * 0.76, w - 120);
  // Enamel grime toward the edges.
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0.25)');
  g.addColorStop(0.4, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Black hanging sign with the line bullet and station name in white. */
function hangingSignTexture(registry, name) {
  var c = textCanvas(1024, 170, function (ctx, w, h) {
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 10, w, 4);
    ctx.font = '700 ' + h * 0.46 + 'px ' + SIGN_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 40, h * 0.56);
    var r = h * 0.3;
    ctx.fillStyle = LINE.color;
    ctx.beginPath();
    ctx.arc(w - 40 - r, h * 0.56, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + r * 1.25 + 'px ' + SIGN_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(LINE.bullet, w - 40 - r, h * 0.56 + r * 0.06);
  });
  return canvasTexture(c, registry);
}

/**
 * Platform floor: poured concrete in slabs, speckled aggregate, scuffs and old stains. One tile
 * covers FLOOR_TILE metres; shared by every station.
 */
var FLOOR_TILE = 3.6;
var floorCache = null;
function platformFloorTexture(registry) {
  if (floorCache) return floorCache;
  var rand = rng(907);
  var c = textCanvas(1024, 1024, function (ctx, w, h) {
    ctx.fillStyle = '#4a4744';
    ctx.fillRect(0, 0, w, h);
    // Broad mottling, then aggregate.
    for (var k = 0; k < 90; k++) {
      var r = w * (0.04 + rand() * 0.12);
      var x = rand() * w, y = rand() * h;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      var dark = rand() < 0.55;
      g.addColorStop(0, dark ? 'rgba(30,26,22,0.16)' : 'rgba(150,145,135,0.1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (var a = 0; a < 26000; a++) {
      var v = rand();
      ctx.fillStyle = v < 0.5 ? 'rgba(30,28,25,0.35)' : 'rgba(170,165,155,0.3)';
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.6, 1 + rand() * 1.6);
    }
    // Scuffs from foot traffic, a few dark stains (gum, spills).
    for (var s = 0; s < 260; s++) {
      ctx.strokeStyle = 'rgba(20,18,16,' + (0.05 + rand() * 0.12).toFixed(3) + ')';
      ctx.lineWidth = 1 + rand() * 3;
      var sx = rand() * w, sy = rand() * h, len = 8 + rand() * 40, ang = rand() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      ctx.stroke();
    }
    for (var d = 0; d < 40; d++) {
      ctx.fillStyle = 'rgba(18,16,14,' + (0.25 + rand() * 0.35).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 2 + rand() * 6, 2 + rand() * 5, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Slab joints: every half tile, darker with a lighter worn lip.
    [0, 0.5].forEach(function (f) {
      ctx.fillStyle = 'rgba(20,18,16,0.6)';
      ctx.fillRect(f * w, 0, 3, h);
      ctx.fillRect(0, f * h, w, 3);
      ctx.fillStyle = 'rgba(160,155,145,0.25)';
      ctx.fillRect(f * w + 3, 0, 1, h);
      ctx.fillRect(0, f * h + 3, w, 1);
    });
  });
  floorCache = canvasTexture(c, registry);
  floorCache.wrapS = floorCache.wrapT = THREE.RepeatWrapping;
  return floorCache;
}

/** Platform-edge tactile strip: safety yellow, truncated domes in rows, worn in the middle. */
var stripCache = null;
function tactileTexture(registry) {
  if (stripCache) return stripCache;
  var rand = rng(41);
  var c = textCanvas(512, 256, function (ctx, w, h) {
    ctx.fillStyle = '#c9a21a';
    ctx.fillRect(0, 0, w, h);
    var step = w / 12;
    for (var y = step / 2; y < h; y += step) {
      for (var x = step / 2 + ((y / step | 0) % 2) * step / 2; x < w; x += step) {
        var g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, step * 0.32);
        g.addColorStop(0, 'rgba(255,236,140,0.9)');
        g.addColorStop(0.7, 'rgba(190,150,20,1)');
        g.addColorStop(1, 'rgba(90,70,10,0.8)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, step * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (var k = 0; k < 500; k++) {
      ctx.fillStyle = 'rgba(30,25,15,' + (rand() * 0.25).toFixed(3) + ')';
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 12, 1 + rand() * 4);
    }
  });
  stripCache = canvasTexture(c, registry);
  stripCache.wrapS = stripCache.wrapT = THREE.RepeatWrapping;
  return stripCache;
}

/** Soft dark band where the floor meets the wall (and the wall's foot catches less light). */
var aoCache = null;
function wallFootTexture(registry) {
  if (aoCache) return aoCache;
  aoCache = canvasTexture(textCanvas(8, 128, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.35, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }), registry);
  return aoCache;
}

function bandTexture(registry) {
  var c = textCanvas(256, 64, function (ctx, w, h) {
    // VIDABANDIDA line stripe: yellow with a dark brown band through the middle (a fifth of its height).
    ctx.fillStyle = '#fbe54d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2b1005';
    ctx.fillRect(0, h * 0.4, w, h * 0.2);
  });
  var tex = canvasTexture(c, registry);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Painted concrete ceiling, one beam bay per repeat: off-white, form-board lines, stains, soot by the beams. */
function ceilingTexture(registry) {
  var c = textCanvas(512, 512, function (ctx, w, h) {
    var rand = rng(4242);
    ctx.fillStyle = '#9c988e';
    ctx.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += h / 9) {
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fillRect(0, y, w, 2);
    }
    for (var k = 0; k < 14; k++) {
      var x = rand() * w, yy = rand() * h, r = 20 + rand() * 90;
      var g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
      g.addColorStop(0, 'rgba(60,50,36,' + (0.1 + rand() * 0.15).toFixed(2) + ')');
      g.addColorStop(1, 'rgba(60,50,36,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, yy - r, r * 2, r * 2);
    }
    var e = ctx.createLinearGradient(0, 0, w, 0);
    e.addColorStop(0, 'rgba(20,18,14,0.35)');
    e.addColorStop(0.12, 'rgba(20,18,14,0)');
    e.addColorStop(0.88, 'rgba(20,18,14,0)');
    e.addColorStop(1, 'rgba(20,18,14,0.35)');
    ctx.fillStyle = e;
    ctx.fillRect(0, 0, w, h);
  });
  var tex = canvasTexture(c, registry);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Baked light. The ceiling fixtures cast no real light (dozens of lamps would be too many for a
 * phone), so their pools and the shadows between them are painted once, here, and multiplied
 * over the wall and floor. One pattern spans three beam bays, starting at a beam: two fixtures a
 * bay at its quarter points, alternately a touch warm and a touch cool, one tired tube in the
 * run. Light stays at 1 (the surface untouched) in the pools; shadow takes it down from there.
 */
var BAKE_BAYS = 3;
var bakeFixtures = [];
for (var bj = 0; bj < BAKE_BAYS; bj++) {
  [0.25, 0.75].forEach(function (q, qi) {
    var n = bakeFixtures.length;
    bakeFixtures.push({ u: (bj + q) / BAKE_BAYS, warm: (bj + qi) % 2 === 0, power: n === 3 ? 0.5 : 0.92 + (n % 3) * 0.04 });
  });
}
function poolColor(f, a) {
  return (f.warm ? 'rgba(255,247,234,' : 'rgba(240,246,255,') + a.toFixed(3) + ')';
}
/** A soft elliptical pool (rx, ry) at (x, y), alpha a at its heart. */
function pool(ctx, x, y, rx, ry, color0, color1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx / ry, 1);
  var g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  g.addColorStop(0, color0);
  g.addColorStop(1, color1);
  ctx.fillStyle = g;
  ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
  ctx.restore();
}
/** A shade gradient from `dark` at (x0, y0) to none at (x1, y1), multiplied in. */
function shade(ctx, x0, y0, x1, y1, dark, rect) {
  var g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, 'rgb(' + dark + ',' + dark + ',' + dark + ')');
  g.addColorStop(1, 'rgb(255,255,255)');
  ctx.fillStyle = g;
  ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
}

/**
 * The back wall's light (canvas top = ceiling): pools spreading down from each fixture, the
 * beams' shadow on the upper wall, the columns' faint shade, dark corners at ceiling and floor.
 */
function bakedWallTexture(registry, px) {
  var W = px * BAKE_BAYS, H = px;
  var c = textCanvas(W, H, function (ctx) {
    ctx.fillStyle = 'rgb(192,192,192)';
    ctx.fillRect(0, 0, W, H);
    bakeFixtures.forEach(function (f) {
      [-W, 0, W].forEach(function (dx) {
        pool(ctx, f.u * W + dx, H * 0.2, px * 0.62, H * 0.95, poolColor(f, f.power), poolColor(f, 0));
      });
    });
    ctx.globalCompositeOperation = 'multiply';
    for (var b = 0; b <= BAKE_BAYS; b++) {
      var bx = b / BAKE_BAYS * W, bw = px * 0.16;
      // Beam: hard-ish shadow up top, softening down the wall. Column: a faint full-height shade.
      shade(ctx, bx, 0, bx, H * 0.4, 120, [bx - bw / 2, 0, bw, H * 0.4]);
      var g = ctx.createLinearGradient(bx - px * 0.14, 0, bx + px * 0.14, 0);
      g.addColorStop(0, 'rgb(255,255,255)');
      g.addColorStop(0.5, 'rgb(222,222,222)');
      g.addColorStop(1, 'rgb(255,255,255)');
      ctx.fillStyle = g;
      ctx.fillRect(bx - px * 0.14, 0, px * 0.28, H);
    }
    shade(ctx, 0, 0, 0, H * 0.07, 105, [0, 0, W, H * 0.07]);
    shade(ctx, 0, H, 0, H * 0.9, 130, [0, H * 0.9, W, H * 0.1]);
  });
  var tex = canvasTexture(c, registry);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** The platform floor's light (canvas top = wall side): a pool under each fixture, both rows. */
function bakedFloorTexture(registry, px) {
  var S = WORLD.station;
  var W = px * BAKE_BAYS, H = px;
  function rowY(z) { return (1 - (-z - 0.13) / S.platformDepth) * H; }
  var c = textCanvas(W, H, function (ctx) {
    ctx.fillStyle = 'rgb(168,168,168)';
    ctx.fillRect(0, 0, W, H);
    [[-1.7, 1], [-4.6, 0.86]].forEach(function (row) {
      bakeFixtures.forEach(function (f) {
        [-W, 0, W].forEach(function (dx) {
          pool(ctx, f.u * W + dx, rowY(row[0]), px * 0.5, H * 0.3, poolColor(f, f.power * row[1]), poolColor(f, 0));
        });
      });
    });
  });
  var tex = canvasTexture(c, registry);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Light hanging in the air under a fixture: a tall, faint trapezoid, gone before the floor. */
var hazeCache = null;
function hazeTexture(registry) {
  if (hazeCache) return hazeCache;
  hazeCache = canvasTexture(textCanvas(64, 128, function (ctx, w, h) {
    for (var y = 0; y < h; y++) {
      var t = y / (h - 1);
      var half = w / 2 * (0.55 + 0.45 * t);
      var a = Math.pow(1 - t, 1.8);
      var g = ctx.createLinearGradient(w / 2 - half, 0, w / 2 + half, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(w / 2 - half, y, half * 2, 1);
    }
  }), registry);
  return hazeCache;
}

/**
 * Worn concrete's sheen (roughness: dark = smooth): polished where feet go, duller in the
 * corners, a few gummy spots that never shine. Same tiling as the floor's colour.
 */
var floorRoughCache = null;
function platformFloorRoughness(registry) {
  if (floorRoughCache) return floorRoughCache;
  var rand = rng(1907);
  var c = textCanvas(512, 512, function (ctx, w, h) {
    ctx.fillStyle = 'rgb(150,150,150)';
    ctx.fillRect(0, 0, w, h);
    for (var k = 0; k < 60; k++) {
      var r = w * (0.06 + rand() * 0.18), x = rand() * w, y = rand() * h;
      var smooth = rand() < 0.6;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, smooth ? 'rgba(70,70,70,0.35)' : 'rgba(210,210,210,0.3)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (var d = 0; d < 30; d++) {
      ctx.fillStyle = 'rgb(240,240,240)';
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  floorRoughCache = canvasTexture(c, registry);
  floorRoughCache.colorSpace = THREE.NoColorSpace;
  floorRoughCache.wrapS = floorRoughCache.wrapT = THREE.RepeatWrapping;
  return floorRoughCache;
}

/** Multiplied over what's behind it, untouched by tone mapping or fog: baked shadow. */
function multiplyMaterial(map) {
  return new THREE.MeshBasicMaterial({
    map: map, transparent: true, depthWrite: false, toneMapped: false, fog: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor
  });
}

/** The visit sign's face: MTA black, white rule along the top, the station name in white. */
function visitSignTexture(registry, name, w, h) {
  var c = textCanvas(w, h, function (ctx) {
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2f2f0';
    ctx.fillRect(h * 0.14, h * 0.1, w - h * 0.28, h * 0.04);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + h * 0.46 + 'px ' + SIGN_FONT;
    ctx.fillText(name, h * 0.24, h * 0.6, w * 0.66);
  });
  return canvasTexture(c, registry);
}

/** The tab on the sign, always lit: safety yellow, "VISIT →" in black. */
function visitTabTexture(registry, w, h) {
  var c = textCanvas(w, h, function (ctx) {
    ctx.fillStyle = '#f2c318';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, h * 0.18);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 ' + h * 0.42 + 'px ' + SIGN_FONT;
    ctx.fillText('VISIT \u2192', w / 2, h * 0.54);
  });
  return canvasTexture(c, registry);
}

/**
 * gap(a, b): signed shortest distance from b to a around the circle line. content: the
 * station's resolved takeover (content.js), or null for a plain station.
 */
/**
 * Tags on the tiles, either side of the paste-up, at hand height (under the name tablets).
 * TAGS is the artwork (transparent WebP; aspect = width / height). STATION_TAGS hands each
 * station its own few, so every tag shows up at most twice along the whole line. None is ever
 * bigger than the paste-up (PW x PH below). Seeded per station, so they stay put. Positions are
 * relative to the poster; setViewpoint moves the group with it.
 */
var VB = '/metro/images/web/vb/';
var TAGS = {
  'fabrika': 1.277, 'dev': 1.400, 'vdba': 2.522, 'firma-roja': 1.347, 'firma-blanca': 1.347,
  'inkfame': 1.766, 'criterio-blanco': 1.914, '601': 1.110, 'jueves-deskillz-baluga': 0.950,
  'criterio-amarillo': 1.573, 'charlesdays': 2.241
};
var STATION_TAGS = {
  'shop': ['fabrika', 'vdba', 'inkfame', '601', 'charlesdays', 'criterio-amarillo'],
  'og-bandit': ['dev', 'firma-roja', 'criterio-blanco', 'jueves-deskillz-baluga', 'vdba', 'fabrika'],
  'featured': ['inkfame', 'firma-blanca', '601', 'dev', 'charlesdays'],
  'filosofia': ['criterio-amarillo', 'firma-roja', 'jueves-deskillz-baluga', 'criterio-blanco', 'firma-blanca'],
  // The secret stop is tagged end to end: every tag, twice, packed tight (TAG_DENSE).
  'bandidaje-fino': ['fabrika', 'criterio-amarillo', 'dev', 'firma-roja', 'inkfame', 'vdba', '601', 'charlesdays',
    'jueves-deskillz-baluga', 'criterio-blanco', 'firma-blanca', 'vdba', 'inkfame', 'fabrika', 'firma-roja',
    'charlesdays', '601', 'dev', 'criterio-blanco', 'firma-blanca', 'criterio-amarillo', 'jueves-deskillz-baluga']
};
var TAG_DENSE = { 'bandidaje-fino': true };
/** Tags that are also links (main.js opens them on a still click). */
var TAG_LINKS = {
  'criterio-blanco': 'https://www.hechoconcriterio.com',
  'criterio-amarillo': 'https://www.hechoconcriterio.com',
  'charlesdays': 'https://www.charlesdays.art',
  'dev': 'https://www.devinosor.io'
};
var TAG_MAX_W = 0.95, TAG_MAX_H = 1.2;                                     // paste-up is 1.02 x 1.36
var TAG_LOW = 0.35, TAG_HIGH = 1.95;                                     // under the name tablets
var tagMats = {};
function wallTags(data, loader, keep, track) {
  var group = new THREE.Group();
  var list = STATION_TAGS[data.id];
  if (!list) return group;
  var rand = rng(data.id.charCodeAt(0) * 97 + data.id.length * 13);
  var dense = !!TAG_DENSE[data.id];
  // Next free x on the right / left of the poster; a dense wall has two rows of them (low, high).
  var reach = dense ? [[0.75, 0.75], [0.75, 0.75]] : [[0.85, 0.85]];
  var BANDS = dense ? [[0.3, 1.15], [1.1, 1.95]] : [[TAG_LOW, TAG_HIGH]];
  list.forEach(function (id, i) {
    var aspect = TAGS[id], src = VB + 'tag-' + id + '.webp';
    var side = i % 2;                                                    // alternate right, left
    var row = dense ? (i >> 1) % 2 : 0;
    var band = BANDS[row];
    var w = Math.min(TAG_MAX_W, TAG_MAX_H * aspect) * (dense ? 0.42 + rand() * 0.25 : 0.6 + rand() * 0.4);
    w = Math.min(w, (band[1] - band[0]) * aspect);                       // fits its row
    var h = w / aspect;
    var cx = reach[row][side] + w / 2 + rand() * (dense ? 0.12 : 0.5);
    reach[row][side] = cx + w / 2 + (dense ? 0.03 + rand() * 0.25 : 0.5 + rand() * 0.9);
    if (!tagMats[src]) {
      // Low alphaTest: the marker strokes are see-through where they overlap; keep that.
      var mat = track(new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.02, roughness: 0.55, depthWrite: false }));
      loader.load(src, function (m) { return function (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; m.map = tex; m.needsUpdate = true; }; }(mat));
      tagMats[src] = mat;
    }
    var mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, h)), tagMats[src]);
    // Stacked just off the tiles, all under the spray layer (+0.0095) and the poster.
    mesh.position.set(side ? -cx : cx, band[0] + h / 2 + rand() * Math.max(0, band[1] - band[0] - h), WORLD.station.wallZ + 0.006 + (i % 10) * 0.0003);
    mesh.rotation.z = (rand() - 0.5) * 0.12;
    if (TAG_LINKS[id]) mesh.userData.link = TAG_LINKS[id];
    group.add(mesh);
  });
  return group;
}

export function buildStation(data, mats, registry, loader, gap, content, options) {
  var keep = tracker(registry);
  var S = WORLD.station;
  var len = S.halfLength * 2;
  var group = new THREE.Group();
  group.name = 'station:' + data.id;

  function track(mat) { registry.materials.push(mat); return mat; }

  // Platform slab, flush with the car floor: worn concrete on top (with a little sheen, so the
  // lights pool in it), the tactile edge strip, and shade where the floor meets the wall.
  var platformMat = track(new THREE.MeshStandardMaterial({ color: 0x4a4743, roughness: 0.9 }));
  var platform = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 1.3, S.platformDepth)), platformMat);
  platform.position.set(0, -0.65, -0.13 - S.platformDepth / 2);
  group.add(platform);
  var floorTex = platformFloorTexture(registry);
  var floorMat = track(new THREE.MeshStandardMaterial({
    map: floorTex, roughness: 0.82, metalness: 0.08, envMap: mats.envMap, envMapIntensity: 0.5, bumpScale: 0.9
  }));
  floorMat.map = floorTex.clone();
  floorMat.map.repeat.set(len / FLOOR_TILE, S.platformDepth / FLOOR_TILE);
  floorMat.map.needsUpdate = true;
  registry.textures.push(floorMat.map);
  // Sheen worn into it, and the slab joints and aggregate as relief.
  floorMat.roughnessMap = platformFloorRoughness(registry).clone();
  floorMat.roughnessMap.repeat.copy(floorMat.map.repeat);
  floorMat.roughnessMap.needsUpdate = true;
  registry.textures.push(floorMat.roughnessMap);
  floorMat.bumpMap = floorMat.map;
  var floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, S.platformDepth)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.001, -0.13 - S.platformDepth / 2);
  group.add(floor);
  var stripTex = tactileTexture(registry).clone();
  stripTex.repeat.set(len / 1.2, 1);
  stripTex.needsUpdate = true;
  registry.textures.push(stripTex);
  var stripMat = track(new THREE.MeshStandardMaterial({ map: stripTex, roughness: 0.6 }));
  var strip = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, 0.6)), stripMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, 0.003, -0.13 - 0.06 - 0.3);
  group.add(strip);
  var footMat = track(new THREE.MeshBasicMaterial({ map: wallFootTexture(registry), transparent: true, depthWrite: false }));
  var foot = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, 0.9)), footMat);
  foot.rotation.x = -Math.PI / 2;
  foot.position.set(0, 0.004, S.wallZ + 0.45);
  foot.renderOrder = 1;
  group.add(foot);

  // Tiled back wall.
  var tileTex = mats.tileTexture;
  tileTex.repeat.set(len / 1.22, S.ceilingY / 1.22);
  var tileMat = track(new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.35, envMap: mats.envMap, envMapIntensity: 0.4 }));
  var wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, S.ceilingY)), tileMat);
  wall.position.set(0, S.ceilingY / 2, S.wallZ);
  group.add(wall);
  var tagGroup = content ? null : wallTags(data, loader, keep, track);
  if (tagGroup) group.add(tagGroup);
  // The wall takes spray (spray.js paints it): a clear layer over the tiles and tags, under the
  // poster, riding with the tags so it stays centred on the poster. Hidden until it has paint.
  var paintLayer = null;
  if (tagGroup) {
    var PAINT_W = 20, PAINT_H = 3;
    var paintMat = track(new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 0.75 }));
    var paintMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(PAINT_W, PAINT_H)), paintMat);
    paintMesh.position.set(0, PAINT_H / 2, S.wallZ + 0.0095);
    paintMesh.renderOrder = 2;
    paintMesh.visible = false;
    tagGroup.add(paintMesh);
    paintLayer = { mesh: paintMesh, width: PAINT_W, height: PAINT_H };
  }

  // Station identity (frieze, name tablets, hanging signs) only where there's no takeover: a
  // taken-over stop gives that wall to the work, and its name stays on the map and the display.
  var tabletSlots = 0;
  var tablets = null;
  if (!content) {
    var bandTex = bandTexture(registry);
    bandTex.repeat.set(len / 1.4, 1);
    // A touch of its own glow so the yellow reads up under the ceiling, out of the light pools.
    var bandMat = track(new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.5, emissive: 0xffffff, emissiveMap: bandTex, emissiveIntensity: 0.16 }));
    var band = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, 0.3)), bandMat);
    band.position.set(0, 3.05, S.wallZ + 0.01);
    group.add(band);

    // Name tablets along the wall, laid out by layout() once the viewpoint is known.
    var tabletMat = track(new THREE.MeshStandardMaterial({ map: tabletTexture(registry, data.name), roughness: 0.4, envMap: mats.envMap, envMapIntensity: 0.3 }));
    tabletSlots = Math.floor(len / 9.2) + 1;
    tablets = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1.9, 0.56)), tabletMat, tabletSlots);
    group.add(tablets);
  }

  // Ceiling: painted concrete between cross beams (one over each column line), with the
  // fluorescent fixtures hung in the bays so they never meet a beam.
  var ceilDepth = -S.wallZ + 0.4;
  var ceilTex = ceilingTexture(registry);
  ceilTex.repeat.set(len / S.columnStep, ceilDepth / S.columnStep);
  ceilTex.offset.set(0.5, 0);
  // Barely self-lit now: between the fixtures the ceiling falls into shadow (see the halos below).
  var ceilMat = track(new THREE.MeshStandardMaterial({ map: ceilTex, bumpMap: ceilTex, bumpScale: 1.2, emissive: 0x0d0c0a, roughness: 0.94 }));
  var ceiling = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, ceilDepth)), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, S.ceilingY, S.wallZ / 2);
  group.add(ceiling);
  var m = new THREE.Matrix4();
  var bayXs = [];
  for (var bx0 = -S.halfLength + S.columnStep / 2; bx0 < S.halfLength; bx0 += S.columnStep) bayXs.push(bx0);
  var beamMat = track(new THREE.MeshStandardMaterial({
    color: 0x232c28, roughness: 0.68, metalness: 0.3, envMap: mats.envMap, envMapIntensity: 0.3
  }));
  var beams = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.24, 0.34, ceilDepth)), beamMat, bayXs.length);
  bayXs.forEach(function (x, i) {
    m.makeTranslation(x, S.ceilingY - 0.17, S.wallZ / 2);
    beams.setMatrixAt(i, m);
  });
  group.add(beams);
  // Two fixtures per bay per row, at the bay's quarter points: a steel housing, the lit tube under it.
  var rows = [-1.7, -4.6];
  var fixtureXs = [];
  bayXs.forEach(function (x) {
    [0.25, 0.75].forEach(function (q) {
      var fx = x + S.columnStep * q;
      if (fx < S.halfLength - 0.8) fixtureXs.push(fx);
    });
  });
  var tubeCount = fixtureXs.length * rows.length;
  var tubes = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1.2, 0.05, 0.14)), mats.fluorescent, tubeCount);
  var housings = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1.3, 0.09, 0.24)), mats.steelDark, tubeCount);
  var t = 0;
  fixtureXs.forEach(function (x) {
    rows.forEach(function (z) {
      m.makeTranslation(x, S.ceilingY - 0.3, z);
      housings.setMatrixAt(t, m);
      m.makeTranslation(x, S.ceilingY - 0.36, z);
      tubes.setMatrixAt(t, m);
      t++;
    });
  });
  group.add(housings, tubes);

  // Baked light (see bakedWallTexture): pools and shadow multiplied over the wall and the floor, one
  // pattern every three bays, lined up with the beams.
  var bakePx = options && options.coarse ? 128 : 256;
  var bakeRepeat = len / (S.columnStep * BAKE_BAYS);
  var bakeOffset = -(S.columnStep / 2) / (S.columnStep * BAKE_BAYS);
  var wallBake = bakedWallTexture(registry, bakePx);
  wallBake.repeat.set(bakeRepeat, 1);
  wallBake.offset.set(bakeOffset, 0);
  var wallLight = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, S.ceilingY)), track(multiplyMaterial(wallBake)));
  // Over the wallpaper (wallZ + 0.012), under the visit sign.
  wallLight.position.set(0, S.ceilingY / 2, S.wallZ + 0.02);
  wallLight.renderOrder = 1;
  group.add(wallLight);
  var floorBake = bakedFloorTexture(registry, bakePx);
  floorBake.repeat.set(bakeRepeat, 1);
  floorBake.offset.set(bakeOffset, 0);
  var floorLight = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, S.platformDepth)), track(multiplyMaterial(floorBake)));
  floorLight.rotation.x = -Math.PI / 2;
  floorLight.position.set(0, 0.005, -0.13 - S.platformDepth / 2);
  floorLight.renderOrder = 1;
  group.add(floorLight);

  // Each fixture lights the ceiling round it: a soft halo on the paint, the rest left dark.
  var haloMat = track(new THREE.MeshBasicMaterial({
    map: mats.glowTexture, color: 0x8a8070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  var haloGeo = keep(new THREE.PlaneGeometry(2.4, 1.5));
  haloGeo.rotateX(Math.PI / 2);
  var halos = new THREE.InstancedMesh(haloGeo, haloMat, tubeCount);
  // A faint shaft of light in the air under the back row; skipped on phones.
  var haze = options && options.coarse ? null : new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1.5, 2.3)), track(new THREE.MeshBasicMaterial({
    map: hazeTexture(registry), color: 0xfff0dc, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending
  })), fixtureXs.length);
  t = 0;
  fixtureXs.forEach(function (x, i) {
    rows.forEach(function (z) {
      m.makeTranslation(x, S.ceilingY - 0.01, z);
      halos.setMatrixAt(t++, m);
    });
    if (haze) {
      m.makeTranslation(x, S.ceilingY - 0.36 - 1.15, rows[1]);
      haze.setMatrixAt(i, m);
    }
  });
  group.add(halos);
  if (haze) group.add(haze);

  // Painted I-beam columns, clear of the billboard.
  var colMat = track(new THREE.MeshStandardMaterial({ color: 0x1e2a24, roughness: 0.55, metalness: 0.3, envMap: mats.envMap, envMapIntensity: 0.5 }));
  var colGeo = keep(new THREE.BoxGeometry(0.22, S.ceilingY, 0.22));
  var colXs = [];
  for (var cx = -S.halfLength + S.columnStep / 2; cx < S.halfLength; cx += S.columnStep) colXs.push(cx);
  var columns = new THREE.InstancedMesh(colGeo, colMat, colXs.length);
  group.add(columns);

  // Hanging signs.
  if (!content) {
    var signMat = track(new THREE.MeshBasicMaterial({ map: hangingSignTexture(registry, data.name) }));
    var signGeo = keep(new THREE.PlaneGeometry(1.9, 0.32));
    [7.8, -10.6, 26].forEach(function (x) {
      var sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(x, 2.45, -4.2);
      group.add(sign);
    });
  }

  // End portals, so the station reads as a box cut into the tunnel.
  var portalGeo = keep(new THREE.PlaneGeometry(-S.wallZ + 1, S.ceilingY + 1.4));
  [-1, 1].forEach(function (side) {
    var portal = new THREE.Mesh(portalGeo, mats.concrete);
    portal.rotation.y = side * -Math.PI / 2;
    portal.position.set(side * S.halfLength, S.ceilingY / 2 - 0.7, S.wallZ / 2);
    group.add(portal);
  });

  // Billboard: black lightbox frame around the artwork. Under a takeover it's the hero piece,
  // sized to the doorway, and the click target for GET OFF along with the doorway itself.
  var B = content ? TAKEOVER.hero : S.billboard;
  var takeover = content ? createTakeover(data, content, mats, registry, options) : null;
  if (takeover) group.add(takeover.group);
  var artMat = track(new THREE.MeshBasicMaterial({ color: 0x222222 }));
  var art = new THREE.Mesh(keep(new THREE.PlaneGeometry(B.width, B.height)), artMat);
  var boardZ = S.wallZ + 0.1;
  art.position.set(0, B.bottom + B.height / 2, boardZ);
  var board = new THREE.Group();
  board.add(art);
  group.add(board);
  var frame = new THREE.Mesh(keep(frameGeometry(B.width, B.height, 0.09, 0.1, 0.01)), mats.ironwork);
  frame.position.set(0, art.position.y, boardZ - 0.06);
  board.add(frame);
  // Faint spill of light from the lightbox onto the tiles.
  var spillMat = track(new THREE.MeshBasicMaterial({
    map: mats.glowTexture, color: 0xfff4e0, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  var spill = new THREE.Mesh(keep(new THREE.PlaneGeometry(B.width * 1.9, B.height * 2.1)), spillMat);
  spill.position.set(0, art.position.y, S.wallZ + 0.02);
  board.add(spill);
  // A wallpaper takeover is the art itself: no lightbox. The board stays as the (unseen) spot
  // GET OFF pushes toward.
  if (content && content.wall === 'wallpaper') board.visible = false;
  // No artwork for this stop: no empty lightbox either.
  if (!content && !(data.billboard && data.billboard.src)) board.visible = false;

  /**
   * The way in: a paste-up poster slapped on the tiles straight ahead of where you stand when you
   * step out (station x = 0), badly stuck: a little crooked, crumpled, the top corner peeling off
   * the wall. A click takes you to the stop's page (main.js). Under the pointer it lifts and brightens.
   */
  var sign = null;
  var lit = 0;
  var posterMat = null;
  if (data.href && data.poster) {
    var PW = 1.02, PH = 1.36;
    var pgeo = keep(new THREE.PlaneGeometry(PW, PH, 14, 18));
    var pos = pgeo.attributes.position, prand = rng(data.id.length * 131 + 7);
    var bumps = [];
    for (var b = 0; b < 7; b++) bumps.push([(prand() - 0.5) * PW, (prand() - 0.5) * PH, 0.08 + prand() * 0.18, (prand() - 0.5) * 0.02]);
    for (var i = 0; i < pos.count; i++) {
      var px = pos.getX(i), py = pos.getY(i), dz = 0;
      // Paste dried in lumps: soft bubbles and creases.
      bumps.forEach(function (k) {
        var d2 = ((px - k[0]) * (px - k[0]) + (py - k[1]) * (py - k[1])) / (k[2] * k[2]);
        dz += k[3] * Math.exp(-d2);
      });
      // The top-right corner has come unstuck and curls away from the wall.
      var u = px / PW + 0.5, v = py / PH + 0.5;
      var peel = Math.max(0, (u + v - 1.45) / 0.55);
      dz += 0.16 * peel * peel;
      pos.setZ(i, Math.abs(dz) + 0.004);
    }
    pgeo.computeVertexNormals();
    posterMat = track(new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.92, alphaTest: 0.5, side: THREE.DoubleSide }));
    // Wheatpaste: thin paper pressed into the tiles, so the joints and the brick edges read through it.
    // wallUV (per vertex, set in setViewpoint once the poster is placed) is the wall's own tile space.
    posterMat.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 wallUV;\nvarying vec2 vWallUV;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWallUV = wallUV;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWallUV;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n' +
          // tiles 1/8 x 1/16 of a 1.22 m repeat, every other row offset by half (as tileTexture in materials.js)
          'vec2 bq = vec2(vWallUV.x * 8.0, vWallUV.y * 16.0);\n' +
          'bq.x += (1.0 - mod(floor(bq.y), 2.0)) * 0.5;\n' +   // the canvas offsets its odd rows, counted from the top
          'vec2 bf = fract(bq);\n' +
          'float gx = min(bf.x, 1.0 - bf.x) * 0.1525, gy = min(bf.y, 1.0 - bf.y) * 0.076;\n' +
          'float joint = 1.0 - smoothstep(0.002, 0.006, min(gx, gy));\n' +
          'float rim = (1.0 - smoothstep(0.006, 0.014, min(gx, gy))) - joint;\n' +
          'diffuseColor.rgb *= 1.0 - 0.32 * joint + 0.06 * rim;');
    };
    loader.load(data.poster, function (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      registry.textures.push(tex);
      posterMat.map = tex;
      posterMat.needsUpdate = true;
    });
    pgeo.setAttribute('wallUV', new THREE.Float32BufferAttribute(new Float32Array(pos.count * 2), 2));
    sign = new THREE.Group();
    sign.add(new THREE.Mesh(pgeo, posterMat));
    sign.rotation.z = (prand() - 0.5) * 0.09;
    sign.position.set(0, 1.42, S.wallZ + 0.01);
    group.add(sign);
  }
  /** Put the poster at x along the wall and work out where each of its points sits in the wall's tile space. */
  function placePoster(x) {
    sign.position.x = x;
    sign.updateMatrix();
    var mesh = sign.children[0], geo = mesh.geometry, p = geo.attributes.position, w = geo.attributes.wallUV;
    var v = new THREE.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(sign.matrix);
      w.setXY(i, (v.x + len / 2) / 1.22, v.y / 1.22);
    }
    w.needsUpdate = true;
  }
  /** hover: pointer on the poster (it lifts off the wall a little and brightens); dt for easing. */
  function setSign(hover, dt) {
    if (!sign) return;
    lit += ((hover ? 1 : 0) - lit) * Math.min(1, (dt || 0.016) * 9);
    posterMat.color.setScalar(0.85 + 0.25 * lit);
    sign.position.z = S.wallZ + 0.01 + 0.05 * lit;
    sign.scale.setScalar(1 + 0.03 * lit);
  }

  /** Hover over the open doorway: the hero lifts a little (0..1). */
  var hover = 0;
  function setHover(f) {
    if (Math.abs(f - hover) < 0.002) return;
    hover = f;
    spillMat.opacity = 0.35 + 0.3 * f;
    if (artMat.map) artMat.color.setScalar(1 + 0.18 * f);
  }
  var hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  /**
   * Where a seated passenger's line of sight through point x (on the door wall, z = 0) lands
   * at depth z, in station-local x.
   */
  function sightAt(camX, camZ, x, z) {
    return camX + (x - camX) * (camZ - z) / camZ - CAR.doorCenterX;
  }

  /**
   * Fit the station to the viewpoint: the billboard dead centre in the open doors, a name
   * tablet framed in the side window, no column standing in front of either.
   */
  function setViewpoint(camX, camZ) {
    var boardX = sightAt(camX, camZ, CAR.doorCenterX, boardZ);
    board.position.x = boardX;
    // The paste-up dead centre in the open doors too, so it's right there to click from the seat.
    if (sign) placePoster(boardX);
    if (tagGroup) tagGroup.position.x = boardX;                       // the tags flank the poster
    var clearHalf = B.width / 2 + 0.45;

    var windowX = sightAt(camX, camZ, (CAR.window.x0 + CAR.window.x1) / 2, S.wallZ);
    if (tablets) {
      var k = 0;
      var first = windowX - Math.floor((windowX + S.halfLength - 1.2) / 9.2) * 9.2;
      for (var tx = first; tx < S.halfLength - 1.2 && k < tabletSlots; tx += 9.2) {
        if (Math.abs(tx - boardX) < clearHalf + 1) continue;
        m.makeTranslation(tx, 2.3, S.wallZ + 0.012);
        tablets.setMatrixAt(k++, m);
      }
      for (; k < tabletSlots; k++) tablets.setMatrixAt(k, hidden);
      tablets.instanceMatrix.needsUpdate = true;
    }

    var doorSight = sightAt(camX, camZ, CAR.doorCenterX, S.columnZ);
    var windowSight = sightAt(camX, camZ, (CAR.window.x0 + CAR.window.x1) / 2, S.columnZ);
    var clearCols = [];
    colXs.forEach(function (x, i) {
      var blocks = Math.abs(x - doorSight) < 1.5 || Math.abs(x - windowSight) < 0.9;
      if (!blocks) clearCols.push(x);
      // A takeover wraps the columns itself.
      if (blocks || takeover) columns.setMatrixAt(i, hidden);
      else { m.makeTranslation(x, S.ceilingY / 2, S.columnZ); columns.setMatrixAt(i, m); }
    });
    columns.instanceMatrix.needsUpdate = true;
    if (takeover) takeover.layout({ boardX: boardX, columns: clearCols, doorSight: doorSight });
  }
  setViewpoint(0, 2.7);

  if (data.billboard && data.billboard.src) {
    loader.load(data.billboard.src, function (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      // Cover-fit the image into the board.
      var imgAspect = tex.image.width / tex.image.height;
      var boardAspect = B.width / B.height;
      if (imgAspect > boardAspect) {
        tex.repeat.set(boardAspect / imgAspect, 1);
        tex.offset.set((1 - tex.repeat.x) / 2, 0);
      } else {
        tex.repeat.set(1, imgAspect / boardAspect);
        var focusY = data.billboard.focusY == null ? 0.5 : data.billboard.focusY;
        tex.offset.set(0, (1 - tex.repeat.y) * (1 - focusY));
      }
      registry.textures.push(tex);
      artMat.map = tex;
      artMat.color.set(0xffffff);
      artMat.needsUpdate = true;
    });
  }

  /** Track position that lines up with the door centre when stopped. */
  var trackOrigin = 0;

  function place(stopDistance, distance, presence) {
    trackOrigin = stopDistance + CAR.doorCenterX;
    var x = gap(trackOrigin, distance);
    group.position.x = x;
    group.visible = Math.abs(x) < S.halfLength + Math.max(40, takeover ? takeover.reach + 30 : 0);
    // Paint the takeover a stop ahead: this station and its neighbours (stops are ~190 m apart),
    // so a first load only fetches the art around where it starts.
    if (takeover && Math.abs(x) < 260) takeover.wake();
  }

  return {
    group: group,
    place: place,
    setViewpoint: setViewpoint,
    /** The hero piece (a click target) and its size, and the doorway-hover lift. */
    hero: art,
    heroSize: B,
    setHover: setHover,
    /** The visit sign (a click target at the line's stops; at a secret stop it's just the offer) and its hover light. */
    sign: sign,
    /** The wall's spray layer ({ mesh, width, height }, centred on the poster), or null. */
    paintLayer: paintLayer,
    /** The wall tags that are links (mesh.userData.link). */
    linkTags: tagGroup ? tagGroup.children.filter(function (o) { return o.userData.link; }) : [],
    setSign: setSign,
    /** A close look at the art at a world point (the phone's tap): a sharp print there; null to undo. */
    sharpen: function (point) { if (takeover) takeover.sharpen(point ? point.x - group.position.x : null); },
    /** True when track position a (± margin) falls inside this station. */
    contains: function (a, margin) { return Math.abs(gap(a, trackOrigin)) < S.halfLength + (margin || 0); }
  };
}
