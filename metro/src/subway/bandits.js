/**
 * OG BANDIT, the VIDABANDIDA toy, riding the line: one sitting on the bench across from you in the car, and
 * a few waiting on the platforms further down the line (a pair at one stop, one alone at the next…).
 *
 * The toy is the dress-up page's own model (/og-bandit/og-bandit.glb: pieces, rig and moves), loaded once
 * after the subway is up (it is heavy and not needed to start the ride), then cloned per figure. Each figure
 * wears a Chlorotype colorway: the shirt's bleach wash and the VIDABANDIDA lettering front and back, as on
 * the dress-up page. Figures on a platform are parented to that station, so they arrive and leave with it.
 *
 * Car axes (config.js): +x along the train, +y up, +z from the door wall toward the camera. The model faces
 * +z, so seated on the door-side bench or standing on a platform, it looks into the car.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CAR } from './config.js';

var MODEL = '/og-bandit/og-bandit.glb';
var ART = { front: '/og-bandit/vb-wordmark.png', back: '/og-bandit/vb-back.png' };
/** Model units → metres: the toy stands about 0.9 m tall (the model is 10.45 units). */
var SCALE = 0.085;

/** Chlorotype colorways: fabric, lettering, and the wash (null: the black one stays plain). */
var TEES = {
  grayWorker: { fabric: '#6d6e74', letters: '#d9d5bf', wash: { blotch: 0.34, dots: 150, seed: 11 } },
  pinkPress: { fabric: '#b97d86', letters: '#e3cfb8', wash: { blotch: 0.26, dots: 110, seed: 23 } },
  spaceSteel: { fabric: '#1b262c', letters: '#9a928a', wash: { blotch: 0.5, dots: 130, seed: 37 } },
  cloudy: { fabric: '#7fb6d1', letters: '#b5d8e6', wash: { blotch: 0.28, dots: 120, seed: 41 } },
  blackcat: { fabric: '#0f241a', letters: '#b9421d', wash: null }
};

/**
 * The cast. `where`: 'car' (seated on the door-side bench, seat index) or a station index (standing on its
 * platform; x along the platform from the doors, z out from the platform edge, negative = toward the wall).
 * `move`: the dress-up page's clip (idle, dance, briefcase, pose); `turn`: yaw in radians.
 */
var CAST = [
  { where: 'car', seat: 1, tee: 'spaceSteel', shorts: '#19191b', shoes: '#e2dccd' },
  { where: 1, x: -0.8, z: -1.9, turn: 0.25, move: 'idle', tee: 'pinkPress', shorts: '#3a3b3d', shoes: '#f3f3f1' },
  { where: 1, x: -0.12, z: -2.9, turn: -0.35, move: 'dance', tee: 'cloudy', shorts: '#2f405c', shoes: '#e2dccd' },
  { where: 2, x: -0.3, z: -2.0, turn: -0.2, move: 'briefcase', tee: 'grayWorker', shorts: '#8b7b58', shoes: '#1a1a1a' },
  { where: 3, x: -0.55, z: -1.8, turn: 0.15, move: 'pose', tee: 'blackcat', shorts: '#19191b', shoes: '#8a1c1c' }
];
var CLIPS = { idle: 'MOV_1_IDLE', dance: 'MOV_3_BAILE', briefcase: 'MOV_4_MALETIN', pose: 'MOV_5_POSE' };

/** Vinyl parts glossy, clothes matte: [roughness, clearcoat] per piece (as on the dress-up page). */
var FINISH = { VB_TEE: [0.78, 0.04], VB_SHORTS: [0.74, 0.06], VB_SHOES: [0.55, 0.25], VB_PANDA_WHITE: [0.4, 0.4], VB_EYE_WHITE: [0.3, 0.6] };

function seeded(seed) { return function () { return (seed = (seed * 16807) % 2147483647) / 2147483647; }; }

/** The shirt's hand-bleached wash, a tileable 512 px texture (same recipe as the dress-up page). */
var washCache = {};
function washTexture(fabric, w) {
  if (washCache[fabric]) return washCache[fabric];
  var N = 512, c = document.createElement('canvas');
  c.width = c.height = N;
  var g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  var rnd = seeded(w.seed * 7919);
  function lattice(P) {
    var v = Float32Array.from({ length: P * P }, rnd);
    function at(i, j) { return v[((j % P + P) % P) * P + ((i % P + P) % P)]; }
    return function (x, y) {
      x *= P; y *= P;
      var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
      var sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return (at(i, j) * (1 - sx) + at(i + 1, j) * sx) * (1 - sy) + (at(i, j + 1) * (1 - sx) + at(i + 1, j + 1) * sx) * sy;
    };
  }
  var n1 = lattice(3), n2 = lattice(6), n3 = lattice(12), n4 = lattice(32);
  function sm(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  var r0 = parseInt(fabric.slice(1, 3), 16), g0 = parseInt(fabric.slice(3, 5), 16), b0 = parseInt(fabric.slice(5, 7), 16);
  var cream = [233, 226, 211];
  for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
    var u = x / N, v = y / N, n = n1(u, v) * 0.55 + n2(u, v) * 0.3 + n3(u, v) * 0.15;
    var cloud = sm(0.5, 0.78, n), dark = 1 - sm(0.22, 0.46, n);
    var f = 1 + w.blotch * (cloud - 0.35 * dark) + (n4(u, v) - 0.5) * 0.07 + (rnd() - 0.5) * 0.1;
    var k = cloud * w.blotch * 0.6, i = (y * N + x) * 4;
    d[i] = r0 * f * (1 - k) + cream[0] * k; d[i + 1] = g0 * f * (1 - k) + cream[1] * k; d[i + 2] = b0 * f * (1 - k) + cream[2] * k; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (var s = 0; s < w.dots; s++) {
    var px = rnd() * N, py = rnd() * N, r = rnd() < 0.1 ? 3 + rnd() * 2 : 1.2 + rnd() * 1.6;
    g.fillStyle = 'rgba(' + cream.join(',') + ',' + (0.5 + rnd() * 0.45).toFixed(2) + ')';
    [-N, 0, N].forEach(function (dx) {
      [-N, 0, N].forEach(function (dy) {
        if (px + dx < -4 || px + dx > N + 4 || py + dy < -4 || py + dy > N + 4) return;
        g.beginPath(); g.arc(px + dx, py + dy, r, 0, Math.PI * 2); g.fill();
      });
    });
  }
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return (washCache[fabric] = tex);
}

/** The wash, laid on the shirt from its three axes in the shirt's own space (no UV seams, moves with the cloth). */
function withWash(m, map) {
  var uniforms = { washMap: { value: map } };
  m.onBeforeCompile = function (sh) {
    sh.uniforms.washMap = uniforms.washMap;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWashPos;\nvarying vec3 vWashNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWashPos = position;\nvWashNrm = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D washMap;\nvarying vec3 vWashPos;\nvarying vec3 vWashNrm;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n' +
        'vec3 wb = pow(abs(normalize(vWashNrm)), vec3(4.0)); wb /= (wb.x + wb.y + wb.z);\n' +
        'vec3 wp = vWashPos * 0.42;\n' +
        'diffuseColor.rgb *= (texture2D(washMap, wp.yz) * wb.x + texture2D(washMap, wp.xz) * wb.y + texture2D(washMap, wp.xy) * wb.z).rgb;');
  };
  m.customProgramCacheKey = function () { return 'vb-wash'; };
  return m;
}

/** A print: the art tinted to the lettering colour, speckled and faded like a bleach print. */
function printTexture(img, color, seed) {
  var c = document.createElement('canvas');
  c.width = 1024; c.height = Math.round(1024 * img.height / img.width);
  var g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-out';
  var rnd = seeded(seed);
  for (var i = 0; i < 2600; i++) {
    g.globalAlpha = 0.25 + rnd() * 0.6;
    g.beginPath(); g.arc(rnd() * c.width, rnd() * c.height, 0.3 + rnd() * 1.1, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function loadImage(src) {
  return new Promise(function (ok) {
    var img = new Image();
    img.onload = function () { ok(img); };
    img.onerror = function () { ok(null); };
    img.src = src;
  });
}

/** Keep only triangles that face the projection (no smeared streaks down the sleeve sides). */
function facingOnly(geo, side) {
  var pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  var P = [], N = [], U = [];
  for (var t = 0; t < pos.count; t += 3) {
    var nz = nor.getZ(t) + nor.getZ(t + 1) + nor.getZ(t + 2);
    if (side * nz / 3 < 0.35) continue;
    for (var k = 0; k < 3; k++) {
      var i = t + k;
      P.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      N.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      U.push(uv.getX(i), uv.getY(i));
    }
  }
  var out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  geo.dispose();
  return out;
}

/** The print rides the shirt: each of its vertices borrows the bone weights of the nearest shirt vertex. */
function skinnedToShirt(geo, mat, tee) {
  var tp = tee.geometry.attributes.position, si = tee.geometry.attributes.skinIndex, sw = tee.geometry.attributes.skinWeight;
  var cell = 0.25, grid = new Map(), v = new THREE.Vector3(), world = [];
  function key(x, y, z) { return x + ',' + y + ',' + z; }
  for (var i = 0; i < tp.count; i++) {
    v.fromBufferAttribute(tp, i).applyMatrix4(tee.matrixWorld);
    world.push(v.x, v.y, v.z);
    var kk = key(Math.floor(v.x / cell), Math.floor(v.y / cell), Math.floor(v.z / cell));
    if (!grid.has(kk)) grid.set(kk, []);
    grid.get(kk).push(i);
  }
  var pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count;
  var idx = new Uint16Array(n * 4), wts = new Float32Array(n * 4);
  var inv = tee.matrixWorld.clone().invert(), nInv = new THREE.Matrix3().getNormalMatrix(inv);
  for (var p = 0; p < n; p++) {
    v.fromBufferAttribute(pos, p);
    var cx = Math.floor(v.x / cell), cy = Math.floor(v.y / cell), cz = Math.floor(v.z / cell);
    var best = -1, bd = Infinity;
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) for (var dz = -1; dz <= 1; dz++) {
      var list = grid.get(key(cx + dx, cy + dy, cz + dz)) || [];
      for (var q = 0; q < list.length; q++) {
        var j = list[q], d = Math.pow(world[3 * j] - v.x, 2) + Math.pow(world[3 * j + 1] - v.y, 2) + Math.pow(world[3 * j + 2] - v.z, 2);
        if (d < bd) { bd = d; best = j; }
      }
    }
    for (var c = 0; c < 4; c++) {
      idx[4 * p + c] = best >= 0 ? si.getComponent(best, c) : 0;
      wts[4 * p + c] = best >= 0 ? sw.getComponent(best, c) : (c ? 0 : 1);
    }
    v.applyMatrix4(inv); pos.setXYZ(p, v.x, v.y, v.z);
    v.fromBufferAttribute(nor, p).applyMatrix3(nInv).normalize(); nor.setXYZ(p, v.x, v.y, v.z);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
  var m = new THREE.SkinnedMesh(geo, mat);
  m.position.copy(tee.position); m.quaternion.copy(tee.quaternion); m.scale.copy(tee.scale);
  tee.parent.add(m);
  m.bind(tee.skeleton, tee.bindMatrix);
  return m;
}

/** Front lettering and back arch on every shirt piece (the shirt and both sleeves), built once on the template. */
function addPrints(root, tees, art) {
  var main = tees.reduce(function (a, b) { return b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a; });
  [[art.front, 1, 7.1], [art.back, -1, 6.1]].forEach(function (spec) {
    var img = spec[0], side = spec[1], span = spec[2];
    if (!img) return;
    var y = 5.05;
    var hit = new THREE.Raycaster(new THREE.Vector3(0, y, 30 * side), new THREE.Vector3(0, 0, -side)).intersectObject(main, false)[0];
    var p = hit ? hit.point : new THREE.Vector3(0, y, 1.6 * side);
    var helper = new THREE.Object3D();
    helper.position.copy(p);
    helper.lookAt(p.clone().add(new THREE.Vector3(0, 0, side)));
    var w = span, h = span * img.height / img.width;
    if (h > 2.2) { w *= 2.2 / h; h = 2.2; }
    var mat = new THREE.MeshPhysicalMaterial({ transparent: true, roughness: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    tees.forEach(function (piece) {
      var geo = facingOnly(new DecalGeometry(piece, p, helper.rotation, new THREE.Vector3(w, h, 3.4)), side);
      if (!geo.attributes.position.count) { geo.dispose(); return; }
      var m = skinnedToShirt(geo, mat, piece);
      m.userData.print = side > 0 ? 'front' : 'back';
    });
  });
}

export function createBandits(options) {
  var scene = options.scene, stationViews = options.stationViews, reduceMotion = options.reduceMotion;
  var figures = [];
  var group = new THREE.Group();
  group.name = 'og-bandits';
  scene.add(group);

  /**
   * Seated like a toy on a shelf: the legs swung straight out in front, soles toward you. The leg is one
   * piece below the thigh joint (the foot bone carries the shin and the shoe), so the foot keeps its pose
   * relative to the thigh and the whole leg points forward.
   */
  var sitDelta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2 + 0.12);
  var splay = { L: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.16),
    R: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.16) };
  function sit(fig) {
    ['L', 'R'].forEach(function (s) {
      var thigh = fig.bones['thigh' + s], foot = fig.bones['foot' + s];
      if (!thigh || !foot) return;
      thigh.quaternion.copy(splay[s]).multiply(sitDelta).multiply(fig.rest['thigh' + s]);
      foot.quaternion.copy(fig.rest['foot' + s]);
    });
  }

  var gltfLoader = new GLTFLoader(new THREE.LoadingManager());
  var ready = Promise.all([gltfLoader.loadAsync(MODEL), loadImage(ART.front), loadImage(ART.back)]).then(function (r) {
    var gltf = r[0], art = { front: r[1], back: r[2] };
    var template = gltf.scene;
    var tees = [];
    template.traverse(function (o) {
      if (!o.isMesh) return;
      var name = o.material.name, f = FINISH[name] || [0.32, 0.55];
      var m = new THREE.MeshPhysicalMaterial({ color: o.material.color, roughness: f[0], clearcoat: f[1], clearcoatRoughness: 0.3, side: THREE.DoubleSide, name: name });
      if (o.material.normalMap) { m.normalMap = o.material.normalMap; m.normalScale.copy(o.material.normalScale); }
      o.material = m;
      o.frustumCulled = false;                                         // skinned: the bind-pose bounds lie when posed
      if (name === 'VB_TEE') tees.push(o);
    });
    template.updateMatrixWorld(true);
    if (tees.length) addPrints(template, tees, art);

    CAST.forEach(function (c, n) {
      var root = SkeletonUtils.clone(template);
      var tee = TEES[c.tee];
      var mats = {};
      function own(m) {
        if (mats[m.uuid]) return mats[m.uuid];
        var copy = m.clone();
        var name = m.name;
        if (name === 'VB_SHORTS') copy.color.set(c.shorts);
        if (name === 'VB_SHOES') copy.color.set(c.shoes);
        if (name === 'VB_TEE') {
          if (tee.wash) { copy.color.set(0xffffff); withWash(copy, washTexture(tee.fabric, tee.wash)); }
          else copy.color.set(tee.fabric);
        }
        return (mats[m.uuid] = copy);
      }
      var printMats = {};
      root.traverse(function (o) {
        if (!o.isMesh) return;
        if (o.userData.print) {
          var side = o.userData.print;
          if (!printMats[side]) {
            printMats[side] = o.material.clone();
            printMats[side].map = printTexture(side === 'front' ? art.front : art.back, tee.letters, 101 + n * 17 + (side === 'back' ? 5 : 0));
          }
          o.material = printMats[side];
        } else o.material = own(o.material);
      });
      root.scale.setScalar(SCALE);

      var bones = {}, rest = {};
      root.traverse(function (o) { if (o.isBone) { var k = o.name.replace(/[^A-Za-z]/g, ''); bones[k] = o; rest[k] = o.quaternion.clone(); } });
      var fig = { root: root, bones: bones, rest: rest, mixer: null, seated: c.where === 'car', host: null };

      var clip = gltf.animations.find(function (a) { return a.name === CLIPS[c.move || 'idle']; });
      if (clip) {
        fig.mixer = new THREE.AnimationMixer(root);
        var action = fig.mixer.clipAction(clip);
        action.play();
        // Not in step with each other: each starts somewhere in its loop.
        fig.mixer.setTime((n * 1.37) % clip.duration);
      }

      if (fig.seated) {
        var s = CAR.seat;
        var x = s.x0 + (c.seat + 0.5) * s.width;
        // Hips (model y ≈ 2.4) on the seat pan, back against the seat back.
        root.position.set(x, s.height + 0.05 - 2.4 * SCALE, 0.16);
        sit(fig);
        group.add(root);
      } else {
        var view = stationViews[c.where];
        if (!view) return;
        root.position.set(c.x, 0, c.z);
        root.rotation.y = c.turn || 0;
        view.group.add(root);
        fig.host = view.group;
      }
      figures.push(fig);
    });
  }).catch(function (e) { console.warn('OG BANDIT did not load', e); });

  function update(dt) {
    for (var i = 0; i < figures.length; i++) {
      var f = figures[i];
      if (f.host && !f.host.visible) continue;                         // a platform out of sight: no need to animate
      if (f.mixer && !reduceMotion) f.mixer.update(dt);
      if (f.seated) {
        sit(f);
        // the idle's own sway would lift him off the seat: keep the hips where they were set
        if (f.bones.hips) f.bones.hips.position.y = Math.min(f.bones.hips.position.y, 2.2);
      }
    }
  }

  return { ready: ready, update: update, group: group };
}
