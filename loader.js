/**
 * The site's loading screen: the black OG BANDIT turning on black, the same on every page.
 *
 * The page carries the markup and its few CSS rules itself (so the screen covers it from the
 * first paint, before any script runs):
 *
 *   <div class="vb-loader" data-vb-loader="self"><canvas></canvas></div>
 *
 * and loads this module. It draws the toy into the canvas, spinning.
 *
 * data-vb-loader="self": it leaves on its own once the page is ready — window.vbReady = true, a
 *   'vb-ready' (or the dresser's 'ogb-ready') event, or else the window's load event; never later
 *   than MAX_MS. It finishes the turn it's on so the toy ends facing front, then fades out softly
 *   (opacity and a slight zoom out, .vb-loader.is-out in the page's CSS) and removes itself.
 * Any other value: the page hides it itself (the metro, which tracks its own load); the loop stops
 * once the screen has gone.
 *
 * A link straight into a product (?producto=) skips the screen: the product sheet opens at once.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

var MODEL = '/og-bandit/og-bandit-silueta.glb';
var MAX_MS = 6000;
/** Radians per second: about 1.3 s a turn. */
var SPEED = 4.8;
var TURN = Math.PI * 2;

var el = document.querySelector('[data-vb-loader]');
if (el) start(el);

function start(el) {
  var self = el.getAttribute('data-vb-loader') === 'self';
  if (self && /[?&]producto=/.test(location.search)) { el.remove(); return; }
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = el.querySelector('canvas');

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  var scene = new THREE.Scene();
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  // One black vinyl toy, lit to read on black: a warm key, a strong rim from behind.
  var key = new THREE.DirectionalLight(0xfff3e2, 2.2); key.position.set(6, 10, 9); scene.add(key);
  var rim = new THREE.DirectionalLight(0xf0ebe1, 3.2); rim.position.set(-7, 8, -9); scene.add(rim);
  var rim2 = new THREE.DirectionalLight(0xf0ebe1, 1.6); rim2.position.set(8, 3, -6); scene.add(rim2);
  var camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 5.6, 27);
  camera.lookAt(0, 5, 0);
  var pivot = new THREE.Group();
  scene.add(pivot);
  function size() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  size();
  var black = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0b, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });
  new GLTFLoader().loadAsync(MODEL).then(function (g) {
    g.scene.traverse(function (o) { if (o.isMesh) o.material = black; });
    pivot.add(g.scene);
  }).catch(function () { /* no toy: the screen still fades on time */ });

  // When to go (self mode).
  var ready = !!window.vbReady, leaving = false, gone = false;
  function onReady() { ready = true; }
  addEventListener('vb-ready', onReady);
  addEventListener('ogb-ready', onReady);
  if (document.readyState === 'complete') ready = true;
  else addEventListener('load', onReady);
  setTimeout(onReady, MAX_MS);

  function leave() {
    if (leaving) return;
    leaving = true;
    el.classList.add('is-out');
    setTimeout(function () { gone = true; el.remove(); }, 900);
  }

  var rot = 0, clock = new THREE.Clock();
  renderer.setAnimationLoop(function () {
    var dt = Math.min(clock.getDelta(), 0.1);
    if (!leaving) {
      if (still) { if (self && ready) leave(); }
      else {
        var next = rot + dt * SPEED;
        // Ready: finish the turn it's on (at least one), facing front, then go.
        if (self && ready && next >= TURN && Math.floor(next / TURN) > Math.floor(rot / TURN)) {
          rot = Math.floor(next / TURN) * TURN;
          leave();
        } else rot = next;
      }
      pivot.rotation.y = rot;
    } else if (!still) {
      // Still turning gently while it fades, so it doesn't freeze on the way out.
      rot += dt * SPEED * 0.35;
      pivot.rotation.y = rot;
    }
    // A page that hides the screen itself: stop once it's out of sight.
    if (!self && !gone && getComputedStyle(el).visibility === 'hidden') gone = true;
    if (gone) {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      pmrem.dispose();
      return;
    }
    renderer.render(scene, camera);
  });
}
