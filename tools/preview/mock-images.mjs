// Simple flat SVG illustrations used ONLY by the offline design preview.
// They stand in for real GBG product photos, which the owner supplies.
// Each is drawn on white, like the real square product shots will be.

const wrap = (body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<rect width="600" height="600" fill="#ffffff"/>
<ellipse cx="300" cy="520" rx="190" ry="18" fill="#000" opacity="0.06"/>
${body}
<text x="300" y="585" text-anchor="middle" font-family="Arial" font-size="16" fill="#9aa1ac">Sample image – ${label}</text>
</svg>`;

export const images = {
  handbag: wrap(`<path d="M220 220 q80 -120 160 0" fill="none" stroke="#6b3a1f" stroke-width="18"/>
    <rect x="150" y="220" width="300" height="290" rx="34" fill="#a0522d"/>
    <rect x="150" y="300" width="300" height="16" fill="#7a3d1f"/><rect x="280" y="296" width="40" height="40" rx="6" fill="#d4af37"/>`, 'handbag'),
  backpack: wrap(`<rect x="190" y="150" width="220" height="360" rx="70" fill="#1f4e79"/>
    <rect x="225" y="330" width="150" height="130" rx="24" fill="#2b6aa3"/><rect x="250" y="120" width="100" height="60" rx="30" fill="none" stroke="#163a5a" stroke-width="14"/>
    <rect x="235" y="350" width="130" height="10" fill="#163a5a"/>`, 'backpack'),
  purse: wrap(`<rect x="160" y="260" width="280" height="200" rx="28" fill="#c2185b"/><path d="M160 300 h280 l-140 70z" fill="#ad1457"/><circle cx="300" cy="350" r="14" fill="#d4af37"/>`, 'purse'),
  trainers: wrap(`<path d="M110 430 q10 -120 120 -150 l60 60 q90 20 190 40 q40 10 40 50 v30 h-410z" fill="#f5f5f5" stroke="#263238" stroke-width="8"/>
    <rect x="110" y="455" width="410" height="34" rx="12" fill="#263238"/><path d="M240 330 l40 20 M260 310 l40 20 M280 295 l40 20" stroke="#e53935" stroke-width="10"/>`, 'trainers'),
  heels: wrap(`<path d="M130 400 q120 -160 260 -40 l90 70 v30 h-120 l-60 -40 q-50 -20 -90 -10 v100 h-30 z" fill="#111"/><rect x="155" y="400" width="18" height="110" fill="#111"/>`, 'heels'),
  watch: wrap(`<rect x="255" y="90" width="90" height="420" rx="20" fill="#5d4037"/><circle cx="300" cy="300" r="105" fill="#d4af37"/><circle cx="300" cy="300" r="86" fill="#fff"/>
    <path d="M300 300 v-60 M300 300 h45" stroke="#0b1f3a" stroke-width="8" stroke-linecap="round"/>`, 'watch'),
  necklace: wrap(`<path d="M170 170 q130 280 260 0" fill="none" stroke="#d4af37" stroke-width="8"/><path d="M300 330 l-28 40 28 50 28 -50z" fill="#1e88e5" stroke="#d4af37" stroke-width="6"/>`, 'necklace'),
  earrings: wrap(`<circle cx="220" cy="210" r="16" fill="#d4af37"/><circle cx="380" cy="210" r="16" fill="#d4af37"/><path d="M220 226 v40" stroke="#d4af37" stroke-width="6"/><path d="M380 226 v40" stroke="#d4af37" stroke-width="6"/>
    <circle cx="220" cy="320" r="54" fill="none" stroke="#d4af37" stroke-width="12"/><circle cx="380" cy="320" r="54" fill="none" stroke="#d4af37" stroke-width="12"/>`, 'earrings'),
  mug: wrap(`<rect x="180" y="200" width="200" height="260" rx="22" fill="#0b1f3a"/><path d="M380 260 h40 a50 50 0 0 1 0 120 h-40" fill="none" stroke="#0b1f3a" stroke-width="26"/>
    <rect x="180" y="250" width="200" height="24" fill="#c9a227"/>`, 'mug'),
  pan: wrap(`<ellipse cx="260" cy="340" rx="170" ry="60" fill="#37474f"/><ellipse cx="260" cy="328" rx="150" ry="46" fill="#546e7a"/><rect x="420" y="320" width="150" height="26" rx="13" fill="#212121"/>`, 'frying pan'),
  storage: wrap(`<rect x="140" y="250" width="320" height="230" rx="18" fill="#cfd8dc" opacity="0.9"/><rect x="130" y="220" width="340" height="44" rx="12" fill="#26a69a"/><rect x="270" y="236" width="60" height="12" rx="6" fill="#00796b"/>`, 'storage box'),
  speaker: wrap(`<rect x="200" y="140" width="200" height="360" rx="40" fill="#212121"/><circle cx="300" cy="380" r="70" fill="#424242"/><circle cx="300" cy="380" r="30" fill="#616161"/><circle cx="300" cy="230" r="34" fill="#424242"/>`, 'speaker'),
  lamp: wrap(`<path d="M220 150 h160 l50 140 h-260z" fill="#ffd60a"/><rect x="290" y="290" width="20" height="170" fill="#9e9e9e"/><rect x="220" y="460" width="160" height="30" rx="10" fill="#616161"/>`, 'lamp'),
  scarf: wrap(`<path d="M200 140 q100 40 200 0 l-30 200 q-70 30 -140 0z" fill="#8e24aa"/><path d="M230 330 l-20 170 h60 l10 -160z M370 330 l20 170 h-60 l-10 -160z" fill="#7b1fa2"/>`, 'scarf'),
  shop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><rect width="800" height="600" fill="#e9ecef"/>
    <rect x="0" y="420" width="800" height="180" fill="#cfd4da"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${60 + i * 180}" y="120" width="140" height="300" fill="#fff" stroke="#adb5bd"/>
      ${[0, 1, 2].map((j) => `<rect x="${70 + i * 180}" y="${150 + j * 90}" width="120" height="8" fill="#868e96"/>
      <rect x="${78 + i * 180}" y="${110 + j * 90}" width="30" height="40" fill="hsl(${i * 70 + j * 30},55%,55%)"/><rect x="${118 + i * 180}" y="${118 + j * 90}" width="26" height="32" fill="hsl(${i * 50 + j * 60 + 20},60%,50%)"/><rect x="${152 + i * 180}" y="${104 + j * 90}" width="28" height="46" fill="hsl(${i * 90 + j * 40 + 200},50%,45%)"/>`).join('')}`).join('')}
    <text x="400" y="560" text-anchor="middle" font-family="Arial" font-size="20" fill="#495057">Sample image – replace with a real photo of the shop</text></svg>`,
};
