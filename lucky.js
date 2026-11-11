// =====================================================================
// Sistem bahis hesabı (Lucky, Yankee, Flag, Union Jack ...) — saf hesap.
// BETFORMULA-ESKI projesindeki motorun (multiples.ts) sade JS hali.
// Ekran kodu menu.js içindedir.
//
// Her bahis türü "parçalar" listesidir:
//   { tip: 'kat', ayaklar: [0,2,3] }  → bu seçimlerden düz kombine (tekli, ikili...)
//   { tip: 'sart', ilk, ikinci, kat } → şartlı bahis (SSA kat=1, DSA kat=2):
//        ilk seçim öderse, birim × kat kadar tutar ikinci seçime aktarılır
// =====================================================================

// ---------------- Yardımcılar ----------------
const sira = (n) => Array.from({ length: n }, (_, i) => i);
const aralik = (a, b) => sira(b - a + 1).map((i) => i + a);

// n elemandan k'lı tüm kombinasyonlar: [[0,1],[0,2],...]
function kombinasyonlar(n, k) {
  const sonuc = [];
  const yap = (bas, secilen) => {
    if (secilen.length === k) { sonuc.push(secilen.slice()); return; }
    for (let i = bas; i < n; i++) { secilen.push(i); yap(i + 1, secilen); secilen.pop(); }
  };
  yap(0, []);
  return sonuc;
}

// Verilen seçim alt kümesinden, istenen boylarda tüm düz kombineler
function katlar(altKume, boylar) {
  return boylar.flatMap((k) =>
    kombinasyonlar(altKume.length, k).map((c) => ({ tip: 'kat', ayaklar: c.map((i) => altKume[i]) })));
}

// "Up and down": her çift için A→B ve B→A şartlı bahisleri
function asagiYukari(altKume, kat) {
  return kombinasyonlar(altKume.length, 2).flatMap(([a, b]) => [
    { tip: 'sart', ilk: altKume[a], ikinci: altKume[b], kat },
    { tip: 'sart', ilk: altKume[b], ikinci: altKume[a], kat },
  ]);
}

// Union Jack 3×3 tablo (A–I): 3 satır, 3 sütun, 2 çapraz
const UNION_JACK_HATLARI = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ---------------- Bahis türleri ----------------
// aile : menüdeki grup
// secim: gereken seçim sayısı (null = değişken, Akümülatör)
// tekli: teklileri var mı (tek kazanan bonusu için)
const tur = (ad, aile, secim, tekli, kur) => ({ ad, aile, secim, tekli, kur });
const tamKapsam = (n) => katlar(sira(n), aralik(2, n));
const tekliDahil = (n) => katlar(sira(n), aralik(1, n));
const flag = (n) => [...tamKapsam(n), ...asagiYukari(sira(n), 1)];

const LUCKY_TURLER = {
  single:         tur('Single (Tekli)', 'duz', 1, true, () => katlar([0], [1])),
  double:         tur('Double (İkili)', 'duz', 2, false, () => katlar([0, 1], [2])),
  treble:         tur('Treble (Üçlü)', 'duz', 3, false, () => katlar([0, 1, 2], [3])),
  accumulator:    tur('Accumulator (Kombine)', 'duz', null, false, (n) => katlar(sira(n), [n])),

  trixie:         tur('Trixie', 'tam', 3, false, (n) => katlar(sira(n), [2, 3])),
  yankee:         tur('Yankee', 'tam', 4, false, tamKapsam),
  canadian:       tur('Canadian / Super Yankee', 'tam', 5, false, tamKapsam),
  heinz:          tur('Heinz', 'tam', 6, false, tamKapsam),
  superheinz:     tur('Super Heinz', 'tam', 7, false, tamKapsam),
  goliath:        tur('Goliath', 'tam', 8, false, tamKapsam),

  patent:         tur('Patent', 'lucky', 3, true, tekliDahil),
  lucky15:        tur('Lucky 15', 'lucky', 4, true, tekliDahil),
  lucky31:        tur('Lucky 31', 'lucky', 5, true, tekliDahil),
  lucky63:        tur('Lucky 63', 'lucky', 6, true, tekliDahil),

  ssa:            tur('Single Stakes About (SSA)', 'sart', 2, false, () => asagiYukari([0, 1], 1)),
  dsa:            tur('Double Stakes About (DSA)', 'sart', 2, false, () => asagiYukari([0, 1], 2)),
  roundrobin:     tur('Round Robin', 'sart', 3, false, (n) => [...katlar(sira(n), [2, 3]), ...asagiYukari(sira(n), 1)]),
  flag:           tur('Flag', 'sart', 4, false, flag),
  superflag:      tur('Super Flag', 'sart', 5, false, flag),
  heinzflag:      tur('Heinz Flag', 'sart', 6, false, flag),
  superheinzflag: tur('Super Heinz Flag', 'sart', 7, false, flag),
  goliathflag:    tur('Goliath Flag', 'sart', 8, false, flag),

  // Alphabet: A-B-C Patent + D-E-F Patent + B-C-D-E Yankee + 6'lı kombine
  alphabet:       tur('Alphabet', 'ozel', 6, true, () => [
    ...katlar([0, 1, 2], [1, 2, 3]),
    ...katlar([3, 4, 5], [1, 2, 3]),
    ...katlar([1, 2, 3, 4], [2, 3, 4]),
    ...katlar(sira(6), [6]),
  ]),
  ujtrebles:      tur('Union Jack Trebles', 'ozel', 9, false, () => UNION_JACK_HATLARI.flatMap((h) => katlar(h, [3]))),
  ujtrixie:       tur('Union Jack Trixie', 'ozel', 9, false, () => UNION_JACK_HATLARI.flatMap((h) => katlar(h, [2, 3]))),
  ujpatent:       tur('Union Jack Patent', 'ozel', 9, true, () => UNION_JACK_HATLARI.flatMap((h) => katlar(h, [1, 2, 3]))),
  ujroundrobin:   tur('Union Jack Round Robin', 'ozel', 9, false, () => UNION_JACK_HATLARI.flatMap((h) => [...katlar(h, [2, 3]), ...asagiYukari(h, 1)])),
};

// Menüde gösterilen gruplar (sırasıyla). Motor diğer türleri de bilir
// (Flag, Union Jack ...); istenirse buraya eklenince menüde çıkar.
const LUCKY_AILELER = [
  ['tam', 'Tam Kapsam (Teksiz)'],
  ['lucky', 'Tam Kapsam (Tekli Dahil)'],
];

const AKUMULATOR_EN_AZ = 2;
const AKUMULATOR_EN_COK = 20;

// Oran metnini ondalık orana çevirir:
//   "5/2" → 3.5   |   "EVS" → 2   |   "3,5" veya "3.5" → 3.5
// Geçersizse NaN döner.
function oranCevir(metin) {
  if (metin == null) return NaN;
  const s = String(metin).trim().toUpperCase().replace(/\s/g, '');
  if (s === '') return NaN;
  if (s === 'EVS' || s === 'EVENS' || s === 'EV') return 2;
  const kesir = s.match(/^(\d+(?:[.,]\d+)?)[/-](\d+(?:[.,]\d+)?)$/);
  if (kesir) {
    const pay = Number(kesir[1].replace(',', '.'));
    const payda = Number(kesir[2].replace(',', '.'));
    return payda > 0 && pay > 0 ? pay / payda + 1 : NaN;
  }
  const d = Number(s.replace(',', '.'));
  return d > 1 ? d : NaN;
}

// Bir seçimin kazanç ve plase çarpanları.
// secim: { oran, sonuc: 'won'|'placed'|'lost'|'void', rule4 (kuruş 0-90),
//          dhKazan (birinciliği kaç at paylaştı, 1 = yok) }
function ayakCarpanlari(secim, plaseKesri) {
  const r4 = Math.min(Math.max(secim.rule4 || 0, 0), 90);
  const kazanOrani = (secim.oran - 1) * (1 - r4 / 100) + 1;
  const plaseOrani = (kazanOrani - 1) * plaseKesri.pay / plaseKesri.payda + 1;
  const dhK = 1 / (secim.dhKazan > 1 ? secim.dhKazan : 1);
  switch (secim.sonuc) {
    case 'won':    return { kazan: kazanOrani * dhK, plase: plaseOrani, kazanOrani, plaseOrani };
    case 'placed': return { kazan: 0, plase: plaseOrani, kazanOrani, plaseOrani };
    case 'void':   return { kazan: 1, plase: 1, kazanOrani, plaseOrani };
    default:       return { kazan: 0, plase: 0, kazanOrani, plaseOrani };
  }
}

// Şartlı bahis: ilk seçime birim; öderse min(getiri, birim × kat) ikinciye aktarılır.
// NR olan ilk seçim bahsi iade eder, o da aktarılır.
function sartliOde(birim, ilk, ikinci, kat) {
  const r1 = birim * ilk;
  if (r1 === 0) return 0;
  const aktar = Math.min(r1, birim * kat);
  return r1 - aktar + aktar * ikinci;
}

// Kuruşa yuvarlama
const yuvarla = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

// Türün seçim sayısı (Akümülatör için girilen sayı)
function secimSayisi(turKodu, n) {
  const t = LUCKY_TURLER[turKodu];
  return t.secim ?? Math.min(Math.max(n || 4, AKUMULATOR_EN_AZ), AKUMULATOR_EN_COK);
}

// ANA HESAP
// girdi: {
//   tur, secimler: [...], birimBahis (satır başı bahis),
//   ew: true/false (each-way), ewMod: 'winToWin' | 'equallyDivided',
//   plaseKesri: { pay, payda },
//   bonusHepsiYuzde: tüm atlar kazanırsa kazanca % bonus,
//   bonusTekKazanCarpan: tek at kazanırsa teklinin oran çarpanı (teklisi olan türlerde)
// }
function luckyHesapla(girdi) {
  const t = LUCKY_TURLER[girdi.tur];
  if (!t) throw new Error('Bilinmeyen bahis türü');
  const n = girdi.secimler.length;
  if (t.secim !== null && n !== t.secim) throw new Error(`${t.ad} için ${t.secim} seçim gerekir`);
  if (t.secim === null && n < AKUMULATOR_EN_AZ) throw new Error('En az 2 seçim gerekir');
  const birim = girdi.birimBahis;
  const ew = Boolean(girdi.ew);
  const bolunmus = ew && girdi.ewMod === 'equallyDivided';
  const pk = girdi.plaseKesri || { pay: 1, payda: 4 };

  const ayaklar = girdi.secimler.map((s) => ayakCarpanlari(s, pk));
  const parcalar = t.kur(n);

  const gruplar = new Map(); // anahtar → { anahtar, satir, kazanc, plase }
  let kazancToplam = 0, plaseToplam = 0;

  for (const c of parcalar) {
    let w, p = 0, anahtar;
    if (c.tip === 'kat') {
      anahtar = c.ayaklar.length;
      if (bolunmus) {
        // Eşit bölünmüş EW: her ayağın getirisi bir sonraki ayağın
        // kazanç ve plase kısmına eşit dağıtılır
        let W = birim, P = birim;
        for (let i = 0; i < c.ayaklar.length - 1; i++) {
          const a = ayaklar[c.ayaklar[i]];
          const yarim = (W * a.kazan + P * a.plase) / 2;
          W = yarim; P = yarim;
        }
        const son = ayaklar[c.ayaklar[c.ayaklar.length - 1]];
        w = W * son.kazan;
        p = P * son.plase;
      } else {
        w = c.ayaklar.reduce((acc, i) => acc * ayaklar[i].kazan, birim);
        if (ew) p = c.ayaklar.reduce((acc, i) => acc * ayaklar[i].plase, birim);
      }
    } else {
      anahtar = 'sart';
      w = sartliOde(birim, ayaklar[c.ilk].kazan, ayaklar[c.ikinci].kazan, c.kat);
      if (ew) p = sartliOde(birim, ayaklar[c.ilk].plase, ayaklar[c.ikinci].plase, c.kat);
    }
    const g = gruplar.get(anahtar) || { anahtar, satir: 0, kazanc: 0, plase: 0 };
    g.satir++; g.kazanc += w; g.plase += p;
    gruplar.set(anahtar, g);
    kazancToplam += w;
    plaseToplam += p;
  }

  // Şirket bonusları (sadece kazanç kısmına)
  let bonus = 0;
  const kazananlar = girdi.secimler.filter((s) => s.sonuc === 'won').length;
  if (kazananlar === n && girdi.bonusHepsiYuzde > 0) {
    bonus += kazancToplam * Math.min(girdi.bonusHepsiYuzde, 100) / 100;
  }
  const carpan = girdi.bonusTekKazanCarpan;
  if (t.tekli && kazananlar === 1 && carpan > 1) {
    const idx = girdi.secimler.findIndex((s) => s.sonuc === 'won');
    const tekliSayisi = parcalar.filter((c) => c.tip === 'kat' && c.ayaklar.length === 1 && c.ayaklar[0] === idx).length;
    const dh = 1 / (girdi.secimler[idx].dhKazan > 1 ? girdi.secimler[idx].dhKazan : 1);
    bonus += birim * dh * Math.max(ayaklar[idx].kazanOrani - 1, 0) * (Math.min(carpan, 10) - 1) * tekliSayisi;
  }

  const satirSayisi = parcalar.length * (ew ? 2 : 1);
  const toplamBahis = birim * satirSayisi;
  const getiri = kazancToplam + plaseToplam + bonus;
  const siraNo = (a) => (a === 'sart' ? 99 : a);

  return {
    satirSayisi,
    toplamBahis: yuvarla(toplamBahis),
    kazancGetiri: yuvarla(kazancToplam),
    plaseGetiri: yuvarla(plaseToplam),
    bonus: yuvarla(bonus),
    getiri: yuvarla(getiri),
    kar: yuvarla(getiri - toplamBahis),
    gruplar: [...gruplar.values()]
      .sort((a, b) => siraNo(a.anahtar) - siraNo(b.anahtar))
      .map((g) => ({ ...g, kazanc: yuvarla(g.kazanc), plase: yuvarla(g.plase) })),
    ayaklar: ayaklar.map((a) => ({ kazanOrani: a.kazanOrani, plaseOrani: a.plaseOrani })),
  };
}

// Grup adı: 1 → "Tekli", 2 → "İkili", 'sart' → "Şartlı (SSA)"
function grupAdi(anahtar) {
  if (anahtar === 'sart') return 'Şartlı (SSA/DSA)';
  return ['', 'Tekli', 'İkili', 'Üçlü', 'Dörtlü', 'Beşli', 'Altılı', 'Yedili', 'Sekizli', 'Dokuzlu'][anahtar] || anahtar + "'li";
}

// Türün satır (bahis) sayısı
function satirSayisi(turKodu, n) {
  return LUCKY_TURLER[turKodu].kur(secimSayisi(turKodu, n)).length;
}

// Türün içeriği: "4 tekli, 6 ikili, 4 üçlü, 1 dörtlü"
function turIcerigi(turKodu, n) {
  const say = new Map();
  for (const c of LUCKY_TURLER[turKodu].kur(secimSayisi(turKodu, n))) {
    const a = c.tip === 'kat' ? c.ayaklar.length : 'sart';
    say.set(a, (say.get(a) || 0) + 1);
  }
  return [...say.entries()]
    .sort((a, b) => (a[0] === 'sart' ? 99 : a[0]) - (b[0] === 'sart' ? 99 : b[0]))
    .map(([a, s]) => s + ' ' + grupAdi(a).toLocaleLowerCase('tr-TR'))
    .join(', ');
}

if (typeof module !== 'undefined') {
  module.exports = {
    LUCKY_TURLER, LUCKY_AILELER, AKUMULATOR_EN_AZ, AKUMULATOR_EN_COK,
    kombinasyonlar, oranCevir, ayakCarpanlari, luckyHesapla, grupAdi, turIcerigi, satirSayisi, secimSayisi,
  };
}
