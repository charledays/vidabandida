/**
 * Spray can. With a mouse the cursor is a gloved hand on a Montana GOLD can: hold the button to paint anything
 * in the car except the floor (wall, door frame, seats and their base, poles, windows, the door
 * leaves), and the few signs and ads that are fair game (options.paintable: the 601 tag, the
 * motto sign, the eye of Charles). Through the open doors or out on the platform it paints the
 * station wall too (options.walls: each station's paint layer). Over the line map the can steps
 * aside for the normal pointer so a stop can be picked. See-through overlays (acrylic glare, the
 * glass's sheen) don't stop the paint: it lands on what's behind them.
 * The tools (bottom left): Mirar / Pintar, then, while painting, three brushes (BRUSHES), the
 * colours and Limpiar. Looking, a drag turns the head; painting, it sprays, and Space, the right
 * button or two fingers still look round.
 *
 * Fixed surfaces pick up paint through three projections of the car (onto the x-y, x-z and z-y
 * planes), injected into their materials: a surface shows the projection that faces it most
 * squarely. Each projection also stores the depth where its paint landed, so a stroke on a seat
 * front doesn't also appear on the wall behind it. The door leaves move, so each carries its
 * own paint layer instead; a tag across the seam splits when the doors open. Hold still on an
 * upright surface and the paint runs.
 */
import * as THREE from 'three';
import { CAR } from './config.js';
import { tracker, canvasTexture } from './geo.js';
import { LINE } from './stations.js?v=20261018';

export var COLORS = [
  { name: 'Line orange', hex: LINE.color },
  { name: 'Yellow', hex: '#f2c318' },
  { name: 'Pink', hex: '#ff2e88' },
  { name: 'Blue', hex: '#2f6bff' },
  { name: 'Lime', hex: '#b6f01a' },
  { name: 'White', hex: '#f4f1ea' },
  { name: 'Black', hex: '#111111' }
];

/** Cutout of a gloved hand on a Montana GOLD can; the CSS lines its nozzle up with the aim dot. */
var CAN = { src: '/metro/images/subway/montana-gold.png' };

/** Texture pixels per meter of surface. */
var PPM = 256;
/** Radius of the nozzle's dense core, m. */
var NOZZLE = 0.03;
/** Stamp spacing along a stroke, m. */
var STEP = NOZZLE * 0.35;
/** The part of the car that takes paint: what any framing can see, out past the poles. */
var BOX_MIN = new THREE.Vector3(-4.2, 0, -0.15);
var BOX_MAX = new THREE.Vector3(4.4, 2.3, 1.0);
var BOX_SIZE = BOX_MAX.clone().sub(BOX_MIN);
/** How far (m) a surface may sit from where the paint landed and still show it. */
var DEPTH_TOLERANCE = 0.04;
/**
 * The brushes. aerosol: the soft can, a wide misty halo with a few droplets; marcador: a solid
 * marker line, clean edges; seco: a dry, grainy spray, no halo, a dense speckle that thins out.
 * r: nozzle radius (× NOZZLE); halo: the soft gradient's strength; dots: droplets per stamp and
 * their spread (× r); solid: a filled core (alpha); drip: how wide its runs are (× 1).
 */
var BRUSHES = {
  aerosol: { name: 'Aerosol', r: 1.6, halo: 1.6, dots: 8, spread: 1, solid: 0, drip: 1,
    icon: '<svg viewBox="0 0 32 20" aria-hidden="true"><path d="M3 14c6-2 8-9 14-8s8 7 12 3" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" opacity="0.45" filter="url(#brush-blur)"/><defs><filter id="brush-blur"><feGaussianBlur stdDeviation="1.4"/></filter></defs></svg>' },
  marcador: { name: 'Marcador', r: 0.7, halo: 0, dots: 0, spread: 0, solid: 0.92, drip: 0.8,
    icon: '<svg viewBox="0 0 32 20" aria-hidden="true"><path d="M3 14c6-2 8-9 14-8s8 7 12 3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>' },
  seco: { name: 'Spray seco', r: 1.1, halo: 0, dots: 34, spread: 1.25, solid: 0, drip: 0.6,
    icon: '<svg viewBox="0 0 32 20" aria-hidden="true"><path d="M3 14c6-2 8-9 14-8s8 7 12 3" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0.6 1.4"/></svg>' }
};

/** Texture pixels per meter on the station walls: a big surface, so a coarser grain. */
var WALL_PPM = 128;
/** Pixels between raycasts when a stroke jumps from one surface to another. */
var SUBSTEP_PX = 4;

var dL = CAR.doorCenterX - CAR.doorWidth / 2;
var dR = CAR.doorCenterX + CAR.doorWidth / 2;
var leafW = CAR.doorWidth / 2;

/** Each projection: the plane's two axes (a across, b up the canvas) and the depth axis. */
var PROJECTIONS = {
  z: { a: 'x', b: 'y', d: 'z' },
  y: { a: 'x', b: 'z', d: 'y' },
  x: { a: 'z', b: 'y', d: 'x' }
};

function rgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 };
}
function rgba(c, a) {
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a.toFixed(3) + ')';
}
/** Roughly normal in -1.5..1.5. */
function gauss() {
  return Math.random() + Math.random() + Math.random() - 1.5;
}

var VERTEX_HEAD = 'varying vec3 vPaintPos;\nvarying vec3 vPaintNormal;\n';
var VERTEX_BODY = [
  'vec4 paintP = vec4(transformed, 1.0);',
  '#ifdef SPRAY_UNLIT',
  'vec3 paintN = normal;',
  '#else',
  'vec3 paintN = objectNormal;',
  '#endif',
  '#ifdef USE_INSTANCING',
  '  paintP = instanceMatrix * paintP;',
  '  paintN = mat3(instanceMatrix) * paintN;',
  '#endif',
  'vPaintPos = (modelMatrix * paintP).xyz;',
  'vPaintNormal = mat3(modelMatrix) * paintN;'
].join('\n');
var FRAGMENT_HEAD = [
  'varying vec3 vPaintPos;',
  'varying vec3 vPaintNormal;',
  'uniform sampler2D uPaintZ, uPaintY, uPaintX, uDepthZ, uDepthY, uDepthX;',
  'uniform vec3 uPaintMin, uPaintSize, uPaintTol, uDoorway;',
  'float paintMask = 0.0;'
].join('\n');
var FRAGMENT_BODY = [
  '{',
  '  vec3 pr = (vPaintPos - uPaintMin) / uPaintSize;',
  '  vec3 an = abs(vPaintNormal);',
  '  vec4 pc; float pd; float pv; float tol;',
  '  if (an.z >= an.x && an.z >= an.y) { pc = texture2D(uPaintZ, pr.xy); pd = texture2D(uDepthZ, pr.xy).r; pv = pr.z; tol = uPaintTol.z; }',
  '  else if (an.y >= an.x) { pc = texture2D(uPaintY, pr.xz); pd = texture2D(uDepthY, pr.xz).r; pv = pr.y; tol = uPaintTol.y; }',
  '  else { pc = texture2D(uPaintX, pr.zy); pd = texture2D(uDepthX, pr.zy).r; pv = pr.x; tol = uPaintTol.x; }',
  '  vec3 inBox = step(vec3(0.0), pr) * step(pr, vec3(1.0));',
  // The leaves in the doorway carry their own paint (they move).
  '  float doorway = step(uDoorway.x, vPaintPos.x) * step(vPaintPos.x, uDoorway.y) * step(vPaintPos.z, uDoorway.z);',
  '  paintMask = pc.a * inBox.x * inBox.y * inBox.z * (1.0 - doorway) * (1.0 - smoothstep(tol, tol * 2.0, abs(pv - pd)));',
  '  diffuseColor.rgb = mix(diffuseColor.rgb, pc.rgb, paintMask);',
  '  diffuseColor.a = max(diffuseColor.a, paintMask);',
  '}'
].join('\n');

export function createSpray(options) {
  var camera = options.camera;
  var canvas = options.canvas;
  var root = options.root;
  var registry = options.registry;
  var leaves = options.leaves;
  var surfaces = options.surfaces;
  var unpaintable = options.unpaintable;
  var noPaint = options.noPaint;
  /** Meshes (or groups) that take paint even inside a noPaint group; lit or unlit materials. */
  var paintable = options.paintable || [];
  var selecting = options.selecting;
  var walls = options.walls || [];
  var onHiss = options.onHiss || function () {};
  var onMode = options.onMode || function () {};
  var fine = options.finePointer;

  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'spray';

  function blankCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  // --- Paint targets -------------------------------------------------------------------
  // A target takes stamps at (a, b) in meters on its own plane; depth is used by projections.

  var projections = {};
  Object.keys(PROJECTIONS).forEach(function (key) {
    var p = PROJECTIONS[key];
    var c = blankCanvas(BOX_SIZE[p.a] * PPM, BOX_SIZE[p.b] * PPM);
    var dc = blankCanvas(c.width, c.height);
    var tex = canvasTexture(c, registry);
    var depthTex = new THREE.CanvasTexture(dc);
    depthTex.colorSpace = THREE.NoColorSpace;
    depthTex.minFilter = depthTex.magFilter = THREE.NearestFilter;
    depthTex.generateMipmaps = false;
    registry.textures.push(depthTex);
    projections[key] = {
      key: key,
      axes: p,
      canvas: c,
      ctx: c.getContext('2d'),
      depthCtx: dc.getContext('2d'),
      tex: tex,
      depthTex: depthTex,
      dirty: false,
      upright: key !== 'y',
      toPx: function (a, b) { return [(a - BOX_MIN[p.a]) * PPM, (BOX_MAX[p.b] - b) * PPM]; },
      depthStyle: function (d) {
        var v = Math.round(THREE.MathUtils.clamp((d - BOX_MIN[p.d]) / BOX_SIZE[p.d], 0, 1) * 255);
        return 'rgb(' + v + ',' + v + ',' + v + ')';
      }
    };
  });

  var uniforms = {
    uPaintZ: { value: projections.z.tex }, uDepthZ: { value: projections.z.depthTex },
    uPaintY: { value: projections.y.tex }, uDepthY: { value: projections.y.depthTex },
    uPaintX: { value: projections.x.tex }, uDepthX: { value: projections.x.depthTex },
    uPaintMin: { value: BOX_MIN },
    uPaintSize: { value: BOX_SIZE },
    uPaintTol: { value: new THREE.Vector3(DEPTH_TOLERANCE / BOX_SIZE.x, DEPTH_TOLERANCE / BOX_SIZE.y, DEPTH_TOLERANCE / BOX_SIZE.z) },
    uDoorway: { value: new THREE.Vector3(dL + 0.002, dR - 0.002, -0.005) }
  };

  /** Teach a material to show the projected paint. */
  function inject(mat) {
    if (mat.userData.spray) return;
    mat.userData.spray = true;
    var previous = mat.onBeforeCompile;
    mat.onBeforeCompile = function (shader, renderer) {
      if (previous) previous.call(this, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <fog_vertex>', '#include <fog_vertex>\n' + VERTEX_BODY);
      shader.fragmentShader = FRAGMENT_HEAD + '\n' + shader.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAGMENT_BODY)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.75, paintMask);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - paintMask;');
    };
    // Unlit (MeshBasic) materials have no objectNormal in their vertex shader: use the attribute.
    if (mat.isMeshBasicMaterial) mat.defines = Object.assign({}, mat.defines, { SPRAY_UNLIT: '' });
    mat.customProgramCacheKey = function () { return 'spray'; };
    mat.needsUpdate = true;
  }
  surfaces.forEach(function (g) {
    g.traverse(function (o) {
      if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
      if (unpaintable.indexOf(o.material) >= 0) return;
      inject(o.material);
    });
  });
  paintable.forEach(function (g) {
    g.traverse(function (o) {
      if (!o.isMesh || !o.material || overlay(o.material)) return;
      if (o.material.isMeshStandardMaterial || o.material.isMeshBasicMaterial) inject(o.material);
    });
  });
  /**
   * A see-through layer laid over a surface (acrylic glare, the glass's sheen): not a target
   * itself. Only unlit or additive ones: the glass pane is lit and takes paint, and the door
   * leaves' paint layers are found through their leaf.
   */
  function overlay(mat) {
    return !!mat && (mat.blending === THREE.AdditiveBlending || (mat.isMeshBasicMaterial && mat.transparent && mat.depthWrite === false));
  }

  // The leaves: a layer just proud of the face (over the tag), riding with each leaf.
  var doorLayers = leaves.map(function (leaf) {
    var c = blankCanvas(leafW * PPM, CAR.doorHeight * PPM);
    var tex = canvasTexture(c, registry);
    var mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.75 });
    registry.materials.push(mat);
    var mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(leafW, CAR.doorHeight)), mat);
    // After the window glass, so paint on a window sits on it rather than behind the tint.
    mesh.renderOrder = 3;
    mesh.position.set(0, CAR.doorHeight / 2, options.leafFront + 0.004);
    leaf.add(mesh);
    return {
      leaf: leaf,
      canvas: c,
      ctx: c.getContext('2d'),
      tex: tex,
      dirty: false,
      upright: true,
      toPx: function (a, b) { return [(a + leafW / 2) * PPM, (CAR.doorHeight - b) * PPM]; }
    };
  });
  var targets = [projections.z, projections.y, projections.x].concat(doorLayers);

  // The station walls: a canvas per wall, made on its first stroke.
  var wallTargets = walls.map(function (w) {
    var t = {
      mesh: w.mesh,
      ppm: WALL_PPM,
      upright: true,
      dirty: false,
      toPx: function (a, b) { return [(a + w.width / 2) * WALL_PPM, (w.height - b) * WALL_PPM]; },
      ensure: function () {
        if (t.canvas) return;
        t.canvas = blankCanvas(w.width * WALL_PPM, w.height * WALL_PPM);
        t.ctx = t.canvas.getContext('2d');
        t.tex = canvasTexture(t.canvas, registry);
        w.mesh.material.map = t.tex;
        w.mesh.material.needsUpdate = true;
        w.mesh.visible = true;
        targets.push(t);
      },
      height: w.height
    };
    return t;
  });
  var wallMeshes = wallTargets.map(function (t) { return t.mesh; });
  function wallOf(o) {
    for (var i = 0; i < wallTargets.length; i++) if (wallTargets[i].mesh === o) return wallTargets[i];
    return null;
  }

  // --- Paint ---------------------------------------------------------------------------

  var color = rgb(COLORS[0].hex);
  var brush = BRUSHES.aerosol;

  function puff(t, a, b, depth, amount) {
    if (t.ensure) t.ensure();
    var B = brush;
    var r = NOZZLE * B.r * (t.ppm || PPM);
    var p = t.toPx(a, b);
    var ctx = t.ctx;
    if (B.halo) {
      var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 1.6);
      g.addColorStop(0, rgba(color, 0.16 * B.halo * amount));
      g.addColorStop(0.45, rgba(color, 0.08 * B.halo * amount));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(p[0] - r * 1.6, p[1] - r * 1.6, r * 3.2, r * 3.2);
    }
    if (B.solid) {
      ctx.fillStyle = rgba(color, B.solid);
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Atomized droplets: dense in the core, thinning out into overspray.
    ctx.fillStyle = rgba(color, 0.8);
    for (var k = 0; k < B.dots * amount; k++) {
      var s = 0.6 + Math.random() * 1.2;
      ctx.fillRect(p[0] + gauss() * r * 0.9 * B.spread, p[1] + gauss() * r * 0.9 * B.spread, s, s);
    }
    if (t.depthCtx) {
      t.depthCtx.fillStyle = t.depthStyle(depth);
      t.depthCtx.beginPath();
      t.depthCtx.arc(p[0], p[1], r * 1.7, 0, Math.PI * 2);
      t.depthCtx.fill();
    }
    t.dirty = true;
  }

  var drips = [];
  function addDrip(hit) {
    if (!hit.target.upright) return;
    drips.push({
      target: hit.target,
      a: hit.a + gauss() * NOZZLE * 0.4,
      b: hit.b - NOZZLE * 0.3,
      depth: hit.depth,
      v: 0.05 + Math.random() * 0.05,
      left: 0.03 + Math.random() * 0.14,
      w: (0.003 + Math.random() * 0.003) * brush.drip,
      color: color
    });
  }
  function runDrips(dt) {
    for (var i = drips.length - 1; i >= 0; i--) {
      var d = drips[i];
      var t = d.target;
      var ppm = t.ppm || PPM;
      var step = Math.min(d.left, d.v * dt);
      var p = t.toPx(d.a, d.b);
      d.b -= step;
      d.left -= step;
      d.v *= 1 - 0.5 * dt;
      var ctx = t.ctx;
      ctx.strokeStyle = rgba(d.color, 0.9);
      ctx.lineWidth = d.w * ppm;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0], p[1] + step * ppm);
      ctx.stroke();
      // A bead where it stops.
      if (d.left <= 0) {
        ctx.fillStyle = rgba(d.color, 0.9);
        ctx.beginPath();
        ctx.arc(p[0], p[1] + step * ppm, d.w * ppm * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t.depthCtx) {
        t.depthCtx.fillStyle = t.depthStyle(d.depth);
        t.depthCtx.fillRect(p[0] - d.w * PPM * 1.5, p[1] - 1, d.w * PPM * 3, step * PPM + d.w * PPM * 2);
      }
      t.dirty = true;
      if (d.left <= 0 || d.b < 0.02) drips.splice(i, 1);
    }
  }

  function flush() {
    targets.forEach(function (t) {
      if (!t.dirty) return;
      t.tex.needsUpdate = true;
      if (t.depthTex) t.depthTex.needsUpdate = true;
      t.dirty = false;
    });
  }

  function buff() {
    drips.length = 0;
    targets.forEach(function (t) {
      t.ctx.clearRect(0, 0, t.canvas.width, t.canvas.height);
      if (t.depthCtx) t.depthCtx.clearRect(0, 0, t.canvas.width, t.canvas.height);
      t.dirty = true;
    });
  }

  // --- Aim -----------------------------------------------------------------------------

  var ray = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var normal = new THREE.Vector3();
  var local = new THREE.Vector3();
  var instance = new THREE.Matrix4();
  var pickables = surfaces.concat(noPaint, paintable);

  function leafOf(o) {
    for (; o; o = o.parent) {
      for (var i = 0; i < doorLayers.length; i++) if (doorLayers[i].leaf === o) return doorLayers[i];
    }
    return null;
  }
  function within(o, groups) {
    for (; o; o = o.parent) if (groups.indexOf(o) >= 0) return true;
    return false;
  }

  /** What the nozzle points at, as { target, a, b, depth }, or null if it won't take paint. */
  function aim(at) {
    ray.setFromCamera(at, camera);
    // Through any overlay to the first real surface.
    var hit = ray.intersectObjects(pickables.concat(wallMeshes), true).filter(function (h) { return !overlay(h.object.material); })[0];
    if (!hit || (within(hit.object, noPaint) && !within(hit.object, paintable))) return null;
    var o = hit.object;
    var wall = wallOf(o);
    if (wall) {
      local.copy(hit.point);
      o.worldToLocal(local);
      if (local.y + wall.height / 2 < 0.02) return null;                   // not the floor line
      return { target: wall, a: local.x, b: local.y + wall.height / 2, depth: 0 };
    }
    var door = leafOf(o);
    if (door) {
      local.copy(hit.point);
      door.leaf.worldToLocal(local);
      return { target: door, a: local.x, b: local.y, depth: 0 };
    }
    if (!o.material || !o.material.userData.spray || !hit.face) return null;
    var pt = hit.point;
    if (pt.x < BOX_MIN.x || pt.y < BOX_MIN.y || pt.z < BOX_MIN.z || pt.x > BOX_MAX.x || pt.y > BOX_MAX.y || pt.z > BOX_MAX.z) return null;
    normal.copy(hit.face.normal);
    if (o.isInstancedMesh && hit.instanceId != null) {
      o.getMatrixAt(hit.instanceId, instance);
      normal.transformDirection(instance);
    }
    normal.transformDirection(o.matrixWorld);
    var ax = Math.abs(normal.x), ay = Math.abs(normal.y), az = Math.abs(normal.z);
    var key = az >= ax && az >= ay ? 'z' : ay >= ax ? 'y' : 'x';
    var axes = PROJECTIONS[key];
    return { target: projections[key], a: pt[axes.a], b: pt[axes.b], depth: pt[axes.d] };
  }

  /** Two hits on the same surface can be joined with a straight run of stamps. */
  function sameSurface(h0, h1) {
    return h0.target === h1.target && Math.abs(h0.depth - h1.depth) < DEPTH_TOLERANCE;
  }

  // --- Input + cursor ------------------------------------------------------------------

  var cursor = document.createElement('div');
  cursor.className = 'spray-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="spray-dot"></span><span class="spray-mist"></span><img class="spray-can" alt="" src="' + CAN.src + '">';
  root.appendChild(cursor);

  var tools = root.querySelector('[data-spray-tools]');
  var lookBtn = tools.querySelector('[data-mode-look]');
  var paintBtn = tools.querySelector('[data-mode-paint]');
  var swatches = tools.querySelector('[data-swatches]');
  var brushBox = tools.querySelector('[data-brushes]');
  var clearBtn = tools.querySelector('[data-clear]');
  tools.hidden = false;
  tools.classList.toggle('has-mouse', fine);

  /**
   * Mirar / Pintar, the same on every device and everywhere (car or platform). Looking, a drag
   * turns the head; painting, a drag sprays. While painting you can still look round without
   * switching: hold Space or drag with the right button (mouse), or use two fingers (touch).
   */
  var mode = 'look';
  var hold = false;                                                      // Space or the right button held
  var touches = 0;                                                       // fingers down on the scene
  var hovering = false;
  var painting = false;
  var hissing = false;
  var last = null;
  var lastNdc = new THREE.Vector2();
  var wet = 0;

  function armed() { return mode === 'paint' && !hold && touches < 2; }
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    lookBtn.setAttribute('aria-pressed', m === 'look' ? 'true' : 'false');
    paintBtn.setAttribute('aria-pressed', m === 'paint' ? 'true' : 'false');
    tools.classList.toggle('is-painting', m === 'paint');
    // While painting, a finger's drag paints instead of scrolling the ride or looking round.
    canvas.style.touchAction = m === 'paint' ? 'none' : '';
    if (m !== 'paint') { painting = false; last = null; }
    refresh();
    onMode(m);
  }
  /** Out on the platform (true) or back on the train: nothing changes, the mode is the visitor's. */
  function setPlatform() { refresh(); }

  function refresh() {
    var sel = selecting();
    var paintNow = armed() || painting;
    var away = !paintNow || (sel.onMap && !painting);
    cursor.classList.toggle('is-on', fine && hovering && paintNow);
    cursor.classList.toggle('is-away', away);
    cursor.classList.toggle('is-spraying', hissing);
    if (fine) canvas.style.cursor = away ? sel.cursor || (sel.stop >= 0 ? 'pointer' : (hold ? 'grabbing' : 'grab')) : 'none';
  }

  function setNdc(e) {
    var rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  }

  function onMove(e) {
    setNdc(e);
    hovering = true;
    cursor.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    refresh();
  }
  function onDown(e) {
    if (e.pointerType === 'touch') {
      touches++;
      // A second finger: the two of them look round, the stroke stops.
      if (touches > 1) { painting = false; last = null; refresh(); return; }
    }
    if (e.button === 2 && e.pointerType === 'mouse') { hold = true; painting = false; refresh(); return; }
    if (!armed() || e.button !== 0) return;
    onMove(e);
    if (selecting().onMap) return;
    painting = true;
    last = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
    refresh();
  }
  function onUp(e) {
    if (e && e.pointerType === 'touch') touches = Math.max(0, touches - 1);
    if (e && e.button === 2 && e.pointerType === 'mouse' && !spaceDown) hold = false;
    painting = false;
    last = null;
    refresh();
  }
  function onLeave() {
    hovering = false;
    refresh();
  }
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  // The right button looks round while painting: no context menu over the scene.
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  // Hold Space to look round while painting (not while typing somewhere).
  var spaceDown = false;
  function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  window.addEventListener('keydown', function (e) {
    if (e.code !== 'Space' || typing(e) || mode !== 'paint') return;
    e.preventDefault();
    if (spaceDown) return;
    spaceDown = hold = true;
    painting = false;
    refresh();
  });
  window.addEventListener('keyup', function (e) {
    if (e.code !== 'Space' || !spaceDown) return;
    spaceDown = hold = false;
    refresh();
  });
  window.addEventListener('blur', function () { spaceDown = hold = false; touches = 0; refresh(); });

  function pick(i) {
    color = rgb(COLORS[i].hex);
    cursor.style.color = COLORS[i].hex;
    Array.prototype.forEach.call(swatches.children, function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
  }
  COLORS.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.setProperty('--swatch', c.hex);
    b.setAttribute('aria-label', c.name);
    b.addEventListener('click', function () { pick(i); });
    swatches.appendChild(b);
  });
  pick(0);

  // The brushes, each shown by its own stroke (BRUSHES).
  function pickBrush(id) {
    brush = BRUSHES[id];
    Array.prototype.forEach.call(brushBox.children, function (b) { b.setAttribute('aria-pressed', b.dataset.brush === id ? 'true' : 'false'); });
  }
  Object.keys(BRUSHES).forEach(function (id) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'brush';
    b.dataset.brush = id;
    b.setAttribute('aria-label', BRUSHES[id].name);
    b.title = BRUSHES[id].name;
    b.innerHTML = BRUSHES[id].icon;
    b.addEventListener('click', function () { pickBrush(id); });
    brushBox.appendChild(b);
  });
  pickBrush('aerosol');

  lookBtn.addEventListener('click', function () { setMode('look'); });
  paintBtn.addEventListener('click', function () { setMode('paint'); });
  // Limpiar asks once: the first press arms it for a few seconds, the second wipes everything.
  var clearTimer = 0;
  clearBtn.addEventListener('click', function () {
    if (!clearBtn.classList.contains('is-confirm')) {
      clearBtn.classList.add('is-confirm');
      clearBtn.textContent = '¿Limpiar todo?';
      clearTimer = setTimeout(resetClear, 3000);
      return;
    }
    buff();
    resetClear();
  });
  function resetClear() {
    clearTimeout(clearTimer);
    clearBtn.classList.remove('is-confirm');
    clearBtn.textContent = 'Limpiar';
  }

  // --- Frame ---------------------------------------------------------------------------

  var between = new THREE.Vector2();

  function update(dt) {
    var hit = null;
    if (painting && !selecting().onMap) {
      camera.updateMatrixWorld();
      hit = aim(ndc);
    }
    if (!!hit !== hissing) {
      hissing = !!hit;
      onHiss(hissing);
      refresh();
    }
    if (hit) {
      if (last && sameSurface(last, hit)) {
        var dist = Math.hypot(hit.a - last.a, hit.b - last.b);
        var n = Math.max(1, Math.ceil(dist / STEP));
        // Held in place, paint builds with time rather than with frames.
        var amount = 0.55, reps = 1;
        if (n === 1) { reps = Math.max(1, Math.round(dt * 60)); amount *= Math.min(1, dt * 60); }
        for (var i = 1; i <= n; i++) {
          var f = i / n;
          for (var r = 0; r < reps; r++) puff(hit.target, last.a + (hit.a - last.a) * f, last.b + (hit.b - last.b) * f, last.depth + (hit.depth - last.depth) * f, amount);
        }
        wet = dist < 0.004 ? wet + dt : Math.max(0, wet - dt * 2);
        if (wet > 0.55) { wet = 0.25; addDrip(hit); }
      } else {
        // New surface (or a fresh press): walk the gap on screen so edges and seams fill in.
        if (last) {
          var w = canvas.clientWidth / 2, h = canvas.clientHeight / 2;
          var steps = Math.min(24, Math.ceil(Math.hypot((ndc.x - lastNdc.x) * w, (ndc.y - lastNdc.y) * h) / SUBSTEP_PX));
          for (var s = 1; s < steps; s++) {
            var mid = aim(between.lerpVectors(lastNdc, ndc, s / steps));
            if (mid) puff(mid.target, mid.a, mid.b, mid.depth, 0.55);
          }
        }
        puff(hit.target, hit.a, hit.b, hit.depth, 0.55);
        wet = 0;
      }
      last = hit;
      lastNdc.copy(ndc);
    } else {
      last = null;
      wet = 0;
    }
    if (drips.length) runDrips(dt);
    flush();
  }

  function dispose() {
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('pointerleave', onLeave);
    cursor.remove();
    onHiss(false);
  }

  return {
    group: group,
    update: update,
    buff: buff,
    /** Painting right now (Pintar, not looking round with Space / the right button / two fingers): drags paint. */
    touchArmed: function () { return armed(); },
    /** 'look' | 'paint', and setting it. */
    mode: function () { return mode; },
    setMode: setMode,
    /** Out on the platform (true) or back on the train. */
    setPlatform: setPlatform,
    dispose: dispose
  };
}
