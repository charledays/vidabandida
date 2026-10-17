/**
 * "Guardar mi OG BANDIT": a short form (A.K.A, skills, city), then a 1080 × 1920 image (an Instagram story) of the toy as it is
 * dressed right now, on a dark industrial wall, with a short ABOUT: who made it, their
 * skills, the colorway and every piece it wears. Download it or share it straight from the phone.
 *
 * The photo is taken with the dress-up's own renderer (index.html exposes it as window.__ogb). The answers go
 * to analytics (analytics.js: skills, city, the look; never the A.K.A, which can be a real name) and, when an
 * endpoint is set there, to the list of people who made one.
 */
const api = new Proxy({}, { get: (_, k) => window.__ogb[k] });   // set by the dress-up's module
const W = 1080, H = 1920;                                // Instagram story
/** Keep clear of Instagram's own bars: the profile row on top, the reply bar at the bottom. */
const SAFE_TOP = 230, SAFE_BOTTOM = 260;
const INK = "#0d0d0e", CREAM = "#efeae0", ACC = "#D63B0C";
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const SANS = '"Archivo Narrow", "Helvetica Neue", Arial, sans-serif';

// ---------- the form ----------
const css = document.createElement("style");
css.textContent = `
.ogb-save { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 16px; background: rgba(8,8,9,.72); }
.ogb-save[hidden] { display: none; }
.ogb-card { width: min(440px, 100%); max-height: calc(100svh - 32px); overflow: auto; background: #121213; color: ${CREAM}; border: 1px solid #2a2a2c; border-radius: 6px; padding: 20px; display: grid; gap: 14px; }
.ogb-card h2 { margin: 0; font: 700 22px/1 ${SANS}; letter-spacing: .04em; text-transform: uppercase; }
.ogb-card h2 q { quotes: "\\201C" "\\201D"; }
.ogb-card p { margin: 0; font: 400 13px/1.45 ${SANS}; color: #a9a59c; }
.ogb-card label { display: grid; gap: 6px; font: 500 11px/1 ${MONO}; letter-spacing: .12em; text-transform: uppercase; color: #a9a59c; }
.ogb-card input { appearance: none; border: 1px solid #333336; border-radius: 4px; background: #0b0b0c; color: ${CREAM}; padding: 12px; font: 500 16px/1.2 ${SANS}; }
.ogb-card input:focus { outline: 2px solid ${ACC}; outline-offset: 1px; border-color: transparent; }
.ogb-card .row { display: flex; gap: 10px; flex-wrap: wrap; }
.ogb-card .btn2 { appearance: none; border: 1px solid ${CREAM}; background: ${CREAM}; color: ${INK}; border-radius: 4px; padding: 13px 16px; font: 700 12px/1 ${SANS}; letter-spacing: .16em; text-transform: uppercase; cursor: pointer; text-decoration: none; text-align: center; flex: 1; }
.ogb-card .btn2.ghost { background: transparent; color: ${CREAM}; border-color: #3a3a3d; }
.ogb-card .btn2:focus-visible { outline: 2px solid ${ACC}; outline-offset: 2px; }
.ogb-card img { width: 100%; height: auto; border-radius: 4px; display: block; background: #000; }
.ogb-card .fine { font: 400 11px/1.4 ${MONO}; color: #77746d; }
.ogb-card .err { color: #ff8a65; font: 500 12px/1.3 ${SANS}; }
`;
document.head.appendChild(css);

const box = document.createElement("div");
box.className = "ogb-save"; box.hidden = true;
box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "ogb-save-title");
box.innerHTML = `
<form class="ogb-card" id="ogb-form" novalidate>
  <h2 id="ogb-save-title">Guarda tu OG BANDIT</h2>
  <p>Firma tu versión. Tu nombre y tus skills van en la imagen.</p>
  <label>Nombre o A.K.A <input name="aka" maxlength="24" autocomplete="nickname" required placeholder="Ej. Charle$Days"></label>
  <label>Skills (sepáralas con coma) <input name="skills" maxlength="90" placeholder="Fotografía, producción musical, tattoo"></label>
  <label>Ciudad <input name="city" maxlength="28" autocomplete="address-level2" placeholder="Lima"></label>
  <p class="err" id="ogb-err" hidden></p>
  <div class="row"><button class="btn2" type="submit">Crear mi imagen</button><button class="btn2 ghost" type="button" data-close>Cancelar</button></div>
  <p class="fine">Guardamos tus skills y tu ciudad para conocer a la comunidad VIDABANDIDA.</p>
</form>
<div class="ogb-card" id="ogb-result" hidden>
  <h2>Tu OG BANDIT</h2>
  <img id="ogb-img" alt="Tu OG BANDIT con tu nombre y tus skills">
  <div class="row"><a class="btn2" id="ogb-dl" download>Descargar</a><button class="btn2 ghost" type="button" id="ogb-share" hidden>Compartir</button></div>
  <div class="row"><button class="btn2 ghost" type="button" data-close>Seguir vistiendo</button></div>
</div>`;
document.body.appendChild(box);
const form = box.querySelector("#ogb-form"), result = box.querySelector("#ogb-result"), err = box.querySelector("#ogb-err");
let lastFocus = null, url = null, file = null;

function open() {
  lastFocus = document.activeElement;
  form.hidden = false; result.hidden = true; err.hidden = true; box.hidden = false;
  try { const saved = JSON.parse(localStorage.getItem("ogb-firma") || "{}"); for (const k of ["aka", "skills", "city"]) if (saved[k]) form.elements[k].value = saved[k]; } catch {}
  form.elements.aka.focus();
  window.vbTrack?.("og_bandit_save_open");
}
function close() { box.hidden = true; lastFocus?.focus?.(); }
box.addEventListener("click", e => { if (e.target === box || e.target.closest("[data-close]")) close(); });
addEventListener("keydown", e => { if (e.key === "Escape" && !box.hidden) close(); });
document.getElementById("save")?.addEventListener("click", open);

form.addEventListener("submit", async e => {
  e.preventDefault();
  const aka = form.elements.aka.value.trim().replace(/\s+/g, " ");
  const skills = form.elements.skills.value.split(",").map(s => s.trim()).filter(Boolean).slice(0, 6);
  const city = form.elements.city.value.trim();
  if (!aka) { err.textContent = "Pon tu nombre o tu A.K.A."; err.hidden = false; form.elements.aka.focus(); return; }
  try { localStorage.setItem("ogb-firma", JSON.stringify({ aka, skills: skills.join(", "), city })); } catch {}
  const btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Creando…";
  try {
    const look = describe();
    const canvas = await compose({ aka, skills, city, look });
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    const name = `og-bandit-${aka.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vidabandida"}.png`;
    file = new File([blob], name, { type: "image/png" });
    box.querySelector("#ogb-img").src = url;
    const dl = box.querySelector("#ogb-dl"); dl.href = url; dl.download = name;
    const share = box.querySelector("#ogb-share");
    share.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
    form.hidden = true; result.hidden = false; box.querySelector("#ogb-dl").focus();
    window.vbSaveBandit?.({ aka, skills, city, look });
  } catch (x) {
    err.textContent = "No se pudo crear la imagen. Intenta otra vez."; err.hidden = false;
  } finally { btn.disabled = false; btn.textContent = "Crear mi imagen"; }
});
box.querySelector("#ogb-dl").addEventListener("click", () => window.vbTrack?.("og_bandit_download"));
box.querySelector("#ogb-share").addEventListener("click", async () => {
  try { await navigator.share({ files: [file], title: "Mi OG BANDIT", text: "Mi OG BANDIT · vidabandida.art/og-bandit" }); window.vbTrack?.("og_bandit_share"); } catch {}
});

// ---------- what it's wearing ----------
function describe() {
  const s = api.getState(), { COLORS, SLOTS, nameOf } = api;
  const acc = [];
  for (const [key, , opts] of SLOTS) {
    const o = opts.find(([id]) => id === s[key]);
    if (o && o[0] !== "none") acc.push(o[3] || `${o[1]}${o[2] ? " " + o[2].toLowerCase() : ""}`);
  }
  return {
    tee: nameOf(COLORS.tee, s.tee), shorts: nameOf(COLORS.shorts, s.shorts), shoes: nameOf(COLORS.shoes, s.shoes),
    accessories: acc
  };
}

// ---------- the photo: the toy as it stands now, from a fixed three-quarter angle, on transparent ----------
function photo(w, h) {
  const { renderer, scene, camera, controls, resize } = api;
  const pos = camera.position.clone(), pr = renderer.getPixelRatio(), auto = controls.autoRotate;
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const t = controls.target;
  // far enough back for the whole toy, head to soles, with room around it
  // close enough that the toy fills most of the frame, head to soles
  camera.position.set(t.x + 5.0, t.y + 0.7, t.z + 24.5); camera.lookAt(t); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").drawImage(renderer.domElement, 0, 0, w, h);
  renderer.setPixelRatio(pr); camera.position.copy(pos); controls.autoRotate = auto; resize(); controls.update();
  return c;
}

// ---------- the poster ----------
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function industrial(g) {
  const r = rng(77);
  g.fillStyle = "#0e0e0f"; g.fillRect(0, 0, W, H);
  // poured concrete: speckle and soft blotches
  for (let i = 0; i < 9000; i++) { const v = 18 + r() * 26 | 0; g.fillStyle = `rgba(${v},${v},${v + 1},${0.35 + r() * 0.4})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = r() * H, rad = 60 + r() * 220, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${r() < 0.5 ? "0,0,0" : "60,60,62"},${0.10 + r() * 0.12})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // steel panels: seams and rivets
  g.strokeStyle = "rgba(0,0,0,0.75)"; g.lineWidth = 3;
  const cols = [270, 540, 810], rowY = 1180;
  for (const x of cols) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  g.beginPath(); g.moveTo(0, rowY); g.lineTo(W, rowY); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.05)"; g.lineWidth = 1;
  for (const x of cols) { g.beginPath(); g.moveTo(x + 2, 0); g.lineTo(x + 2, H); g.stroke(); }
  for (const x of [0, ...cols, W]) for (let y = 30; y < H; y += 92) {
    for (const dx of [-14, 14]) {
      const px = x + dx; if (px < 6 || px > W - 6) continue;
      g.fillStyle = "rgba(0,0,0,0.6)"; g.beginPath(); g.arc(px + 1, y + 1, 4.5, 0, 7); g.fill();
      g.fillStyle = "rgba(120,120,124,0.45)"; g.beginPath(); g.arc(px, y, 4, 0, 7); g.fill();
    }
  }
  // water streaks
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H * 0.6, l = 120 + r() * 380; const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, "rgba(0,0,0,0.22)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x, y, 1 + r() * 3, l); }
  // the light on the toy, and the room falling off into the dark
  const spot = g.createRadialGradient(W * 0.5, H * 0.42, 40, W * 0.5, H * 0.42, 620);
  spot.addColorStop(0, "rgba(255,240,215,0.20)"); spot.addColorStop(1, "rgba(255,240,215,0)");
  g.fillStyle = spot; g.fillRect(0, 0, W, H);
  const vig = g.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.85);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.78)");
  g.fillStyle = vig; g.fillRect(0, 0, W, H);
}
/** Type that may sit over the toy: a soft black aura round every letter so it reads on white vinyl too. */
function aura(g, draw) {
  // a wide soft halo, then a tight dense one hugging the letters, then the type itself on top
  g.save(); g.shadowColor = "rgba(0,0,0,1)"; g.shadowOffsetX = 0; g.shadowOffsetY = 0;
  for (const blur of [26, 26, 12, 12, 5, 5, 2]) { g.shadowBlur = blur; draw(); }
  g.restore(); draw();
}
function fit(g, text, max, font) { let s = font.size; g.font = `${font.weight} ${s}px ${font.family}`; while (g.measureText(text).width > max && s > 10) { s -= 1; g.font = `${font.weight} ${s}px ${font.family}`; } return s; }
function wrap(g, text, max) {
  const words = text.split(" "), lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function loadImg(src) { return new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }); }

async function compose({ aka, skills, city, look }) {
  await document.fonts.load(`700 40px "Archivo Narrow"`).catch(() => {});
  await document.fonts.load(`500 20px "IBM Plex Mono"`).catch(() => {});
  const logo = await loadImg("/metro/images/web/vb/logo-block.png");
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  industrial(g);

  // the toy, standing in the light, with a contact shadow
  const TX = W / 2, FEET = 1535;                                     // where the toy stands
  const sh = g.createRadialGradient(TX, FEET / 0.2, 10, TX, FEET / 0.2, 230);
  sh.addColorStop(0, "rgba(0,0,0,0.7)"); sh.addColorStop(1, "rgba(0,0,0,0)");
  g.save(); g.scale(1, 0.2); g.fillStyle = sh; g.fillRect(TX - 260, FEET / 0.2 - 260, 520, 520); g.restore();
  const toy = photo(1080, 1350);
  // the toy fills about 87 % of the photo's height, centred in it: drop it so its soles land on FEET
  g.drawImage(toy, TX - 540, FEET - 675 - 587, 1080, 1350);

  // header: the logo, the title, and whose it is
  const no = String(Math.floor(Date.now() / 1000) % 100000).padStart(5, "0");
  if (logo) { const lw = 190, lh = lw * logo.naturalHeight / logo.naturalWidth; g.globalAlpha = 0.95; g.drawImage(logo, 56, SAFE_TOP, lw, lh); g.globalAlpha = 1; }
  g.fillStyle = "rgba(239,234,224,0.6)"; g.textBaseline = "alphabetic";
  g.font = `500 17px ${MONO}`; g.textAlign = "right";
  aura(g, () => g.fillText(`Nº ${no}`, W - 56, SAFE_TOP + 24));
  g.textAlign = "left"; g.fillStyle = CREAM;
  // the name is the headline; OG BANDIT sits small above it
  g.font = `700 34px ${SANS}`; aura(g, () => g.fillText("OG BANDIT", 54, SAFE_TOP + 92));
  fit(g, aka.toUpperCase(), 720, { weight: 700, size: 84, family: SANS });
  g.fillStyle = ACC; aura(g, () => g.fillText(aka.toUpperCase(), 50, SAFE_TOP + 172));

  // about: just the data, set close like a technical sheet, nothing labelled (the name is already above)
  const x = 56, w = 400;
  const facts = [skills.length ? skills.join(", ") : "", city, look.tee].filter(Boolean).map(s => s.toUpperCase());
  g.font = `500 17px ${MONO}`;
  const lines = facts.flatMap((f, i) => (i ? [null] : []).concat(wrap(g, f, w)));   // null: a rule between facts
  const h = 44 + lines.reduce((n, l) => n + (l === null ? 14 : 23), 0);
  // sits at the bottom, clear of Instagram's reply bar; it may cross the shoes, so every line gets the aura
  let ty = H - SAFE_BOTTOM - 14 - h;
  const rule = (y, a) => aura(g, () => { g.fillStyle = `rgba(239,234,224,${a})`; g.fillRect(x, y, w, 1); });
  g.fillStyle = CREAM; g.font = `700 22px ${SANS}`; aura(g, () => g.fillText("ABOUT", x, ty));
  rule(ty + 14, 0.45);
  ty += 44;
  g.font = `500 17px ${MONO}`;
  for (const l of lines) {
    if (l === null) { rule(ty - 12, 0.25); ty += 14; continue; }
    g.fillStyle = CREAM; aura(g, () => g.fillText(l, x, ty)); ty += 23;
  }
  rule(ty - 8, 0.45);

  // footer
  g.fillStyle = "rgba(239,234,224,0.5)"; g.font = `500 14px ${MONO}`;
  g.textAlign = "right";
  aura(g, () => g.fillText("VIDABANDIDA.ART/OG-BANDIT", W - 56, SAFE_TOP + 48));
  const date = new Date().toLocaleDateString("es-PE");
  aura(g, () => g.fillText(date, W - 56, SAFE_TOP + 70));
  g.textAlign = "left";
  return c;
}
