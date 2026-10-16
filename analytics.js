/**
 * Analytics for vidabandida.art (metro, shop, OG BANDIT). One place for the Google Analytics 4 tag and the
 * events the pages send. Nothing loads until GA_ID is set.
 *
 *   vbTrack(name, params)   a GA4 event (no personal data: never names, emails or phone numbers)
 *   vbSaveBandit(record)    someone saved their OG BANDIT: the look, skills and city go to GA4; the whole
 *                           record (A.K.A included) goes to SAVE_URL when one is set (e.g. a Google Sheet's
 *                           Apps Script web app), so the list of who made one lives with VIDABANDIDA.
 */
(function () {
  var GA_ID = 'G-B3R38DTC9D';   // Google Analytics 4 measurement ID (vidabandida.art web stream)
  var SAVE_URL = '';       // where saved OG BANDITs are recorded (POST, JSON); empty = nowhere

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (GA_ID) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID);
  }
  window.vbTrack = function (name, params) {
    if (GA_ID) gtag('event', name, params || {});
  };
  window.vbSaveBandit = function (r) {
    var cut = function (v) { return String(v || '').slice(0, 100); };
    window.vbTrack('og_bandit_saved', {
      skills: cut(r.skills.join(', ')), city: cut(r.city),
      colorway: cut(r.look.tee), shorts: cut(r.look.shorts), shoes: cut(r.look.shoes),
      accessories: cut(r.look.accessories.join(', ')), skills_count: r.skills.length
    });
    r.skills.forEach(function (skill) { window.vbTrack('og_bandit_skill', { skill: cut(skill.toLowerCase()) }); });
    if (SAVE_URL) {
      try {
        fetch(SAVE_URL, {
          method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ at: new Date().toISOString(), aka: r.aka, skills: r.skills, city: r.city, look: r.look })
        });
      } catch (e) { /* offline: the image is still theirs */ }
    }
  };
})();
