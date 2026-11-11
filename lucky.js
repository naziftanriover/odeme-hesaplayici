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
//   "5/2" → 3.5   |   "EVS" → 2   |   düz sayı ondalık orandır: "5" → 5 (= 4/1)
// Nokta ve virgül fark etmez. Geçersizse NaN döner.
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
  if (!/^\d+(?:[.,]\d+)?$/.test(s)) return NaN;
  const d = Number(s.replace(',', '.'));
  return d > 1 ? d : NaN;
}

// Bahisçilerin kullandığı standart kesirler (önce bunlara bakılır)
const STANDART_KESIRLER = [
  '1/10','1/9','1/8','2/13','1/6','1/5','2/9','1/4','2/7','3/10','1/3','4/11','2/5','4/9','1/2',
  '8/15','4/7','8/13','4/6','8/11','4/5','5/6','10/11','1/1','11/10','6/5','5/4','11/8','6/4',
  '13/8','7/4','15/8','2/1','9/4','5/2','11/4','3/1','10/3','7/2','4/1','9/2','5/1','11/2',
  '6/1','13/2','7/1','15/2','8/1','17/2','9/1','10/1','11/1','12/1','14/1','16/1','18/1',
  '20/1','22/1','25/1','28/1','33/1','40/1','50/1','66/1','80/1','100/1',
];

// Ondalık oranı kesirli yazar: 5 → "4/1", 3.5 → "5/2", 2 → "EVS", 1.62 → "8/13"
function kesirliYaz(ondalik) {
  const x = ondalik - 1;
  if (!(x > 0)) return '—';
  if (Math.abs(x - 1) < 1e-9) return 'EVS';
  // Standart kesre çok yakınsa onu kullan (ondalık fiyatlar 2 haneye yuvarlıdır)
  for (const k of STANDART_KESIRLER) {
    const [p, q] = k.split('/').map(Number);
    if (Math.abs(x - p / q) <= 0.006) return k === '1/1' ? 'EVS' : k;
  }
  // En yakın sade kesir (payda en fazla 100)
  let enIyi = [Math.round(x), 1], hata = Math.abs(x - Math.round(x));
  for (let payda = 1; payda <= 100 && hata > 1e-9; payda++) {
    const pay = Math.round(x * payda);
    const h = Math.abs(x - pay / payda);
    if (pay > 0 && h < hata - 1e-12) { enIyi = [pay, payda]; hata = h; }
  }
  return enIyi[0] + '/' + enIyi[1];
}

// ---------------------------------------------------------------------
// TAM KESİRLİ HESAP
// Para hesabı kayan noktayla yapılırsa (4/6 = 1,6666...) yarım kuruş
// sınırında 1 kuruş hata çıkabilir. Bu yüzden motor her sayıyı tam kesir
// (pay/payda, BigInt) olarak tutar; sadece en sonda kuruşa yuvarlanır.
// ---------------------------------------------------------------------
const kebob = (a, b) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a; };
function K(p, q = 1n) {
  if (q < 0n) { p = -p; q = -q; }
  const g = kebob(p, q) || 1n;
  return { p: p / g, q: q / g };
}
const kTopla = (a, b) => K(a.p * b.q + b.p * a.q, a.q * b.q);
const kCikar = (a, b) => K(a.p * b.q - b.p * a.q, a.q * b.q);
const kCarp = (a, b) => K(a.p * b.p, a.q * b.q);
const kBol = (a, b) => K(a.p * b.q, a.q * b.p);
const kKucuk = (a, b) => a.p * b.q < b.p * a.q;
const SIFIR = K(0n), BIR = K(1n);

// Ondalık metni ("7.77", "1,5", "12") ya da sayıyı tam kesre çevirir
function kesreCevir(x) {
  if (typeof x === 'object' && x && 'p' in x) return x;
  let s = typeof x === 'number' ? String(x) : String(x).trim().replace(',', '.');
  if (/e/i.test(s)) s = Number(s).toFixed(12);
  const m = s.match(/^(-?)(\d*)(?:\.(\d+))?$/);
  if (!m) return K(BigInt(Math.round(Number(x) * 1e9)), 1000000000n);
  const kesir = m[3] || '';
  const p = BigInt((m[2] || '0') + kesir) * (m[1] ? -1n : 1n);
  return K(p, 10n ** BigInt(kesir.length));
}

// Oran metnini tam kesre çevirir: "5/2" → 7/2, "EVS" → 2, "1.909" → 1909/1000
function oranKesri(metin) {
  const s = String(metin ?? '').trim().toUpperCase().replace(/\s/g, '');
  if (s === 'EVS' || s === 'EVENS' || s === 'EV') return K(2n);
  const kesir = s.match(/^(\d+(?:[.,]\d+)?)[/-](\d+(?:[.,]\d+)?)$/);
  if (kesir) return kTopla(kBol(kesreCevir(kesir[1]), kesreCevir(kesir[2])), BIR);
  if (/^\d+(?:[.,]\d+)?$/.test(s)) return kesreCevir(s);
  return null;
}

// Tam kesri kuruşa yuvarlar (yarım kuruş sıfırdan uzağa) ve sayı döner
function kurus(a) {
  const neg = a.p < 0n;
  const p = neg ? -a.p : a.p;
  const k = (2n * p * 100n + a.q) / (2n * a.q); // yuvarlanmış kuruş
  const r = Number(k) / 100;
  return neg && r ? -r : r;
}

// Bir seçimin kazanç ve plase çarpanları (tam kesir).
// secim: { oran (sayı) veya oranMetin ("5/2"), sonuc: 'won'|'placed'|'lost'|'void',
//          rule4 (kuruş 0-90), dhKazan (kaç at berabere bitirdi, 1 = yok) }
// Dead heat: kazanan atta Win kısmı, plase atta (son plase yerinde
// beraberlik) Plase kısmı berabere at sayısına bölünür.
function ayakCarpanlari(secim, plaseKesri) {
  const oran = (secim.oranMetin != null && oranKesri(secim.oranMetin)) || kesreCevir(secim.oran);
  const r4 = kesreCevir(Math.min(Math.max(secim.rule4 || 0, 0), 90));
  const kazanOrani = kTopla(kCarp(kCikar(oran, BIR), kCikar(BIR, kBol(r4, K(100n)))), BIR);
  const plaseOrani = kTopla(kCarp(kCikar(kazanOrani, BIR), K(BigInt(plaseKesri.pay), BigInt(plaseKesri.payda))), BIR);
  const dhK = K(1n, BigInt(secim.dhKazan > 1 ? secim.dhKazan : 1));
  switch (secim.sonuc) {
    case 'won':    return { kazan: kCarp(kazanOrani, dhK), plase: plaseOrani, kazanOrani, plaseOrani };
    case 'placed': return { kazan: SIFIR, plase: kCarp(plaseOrani, dhK), kazanOrani, plaseOrani };
    case 'void':   return { kazan: BIR, plase: BIR, kazanOrani, plaseOrani };
    default:       return { kazan: SIFIR, plase: SIFIR, kazanOrani, plaseOrani };
  }
}

// Şartlı bahis: ilk seçime birim; öderse min(getiri, birim × kat) ikinciye aktarılır.
// NR olan ilk seçim bahsi iade eder, o da aktarılır.
function sartliOde(birim, ilk, ikinci, kat) {
  const r1 = kCarp(birim, ilk);
  if (r1.p === 0n) return SIFIR;
  const sinir = kCarp(birim, K(BigInt(kat)));
  const aktar = kKucuk(r1, sinir) ? r1 : sinir;
  return kTopla(kCikar(r1, aktar), kCarp(aktar, ikinci));
}

// Kuruşa yuvarlama (sayılar için): yarım kuruş sıfırdan uzağa
const yuvarla = (x) => kurus(kesreCevir(x));

// Türün seçim sayısı (Akümülatör için girilen sayı)
function secimSayisi(turKodu, n) {
  const t = LUCKY_TURLER[turKodu];
  return t.secim ?? Math.min(Math.max(n || 4, AKUMULATOR_EN_AZ), AKUMULATOR_EN_COK);
}

// ANA HESAP
// girdi: {
//   tur, secimler: [...], birimBahis (satır başı bahis; sayı ya da "7,77"),
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
  const birim = kesreCevir(girdi.birimBahis);
  const ew = Boolean(girdi.ew);
  const bolunmus = ew && girdi.ewMod === 'equallyDivided';
  const pk = girdi.plaseKesri || { pay: 1, payda: 4 };
  const IKI = K(2n);

  const ayaklar = girdi.secimler.map((s) => ayakCarpanlari(s, pk));
  const parcalar = t.kur(n);

  const gruplar = new Map(); // anahtar → { anahtar, satir, kazanc, plase }
  let kazancToplam = SIFIR, plaseToplam = SIFIR;

  for (const c of parcalar) {
    let w, p = SIFIR, anahtar;
    if (c.tip === 'kat') {
      anahtar = c.ayaklar.length;
      if (bolunmus) {
        // Eşit bölünmüş EW: her ayağın getirisi bir sonraki ayağın
        // kazanç ve plase kısmına eşit dağıtılır
        let W = birim, P = birim;
        for (let i = 0; i < c.ayaklar.length - 1; i++) {
          const a = ayaklar[c.ayaklar[i]];
          const yarim = kBol(kTopla(kCarp(W, a.kazan), kCarp(P, a.plase)), IKI);
          W = yarim; P = yarim;
        }
        const son = ayaklar[c.ayaklar[c.ayaklar.length - 1]];
        w = kCarp(W, son.kazan);
        p = kCarp(P, son.plase);
      } else {
        w = c.ayaklar.reduce((acc, i) => kCarp(acc, ayaklar[i].kazan), birim);
        if (ew) p = c.ayaklar.reduce((acc, i) => kCarp(acc, ayaklar[i].plase), birim);
      }
    } else {
      anahtar = 'sart';
      w = sartliOde(birim, ayaklar[c.ilk].kazan, ayaklar[c.ikinci].kazan, c.kat);
      if (ew) p = sartliOde(birim, ayaklar[c.ilk].plase, ayaklar[c.ikinci].plase, c.kat);
    }
    const g = gruplar.get(anahtar) || { anahtar, satir: 0, kazanc: SIFIR, plase: SIFIR };
    g.satir++; g.kazanc = kTopla(g.kazanc, w); g.plase = kTopla(g.plase, p);
    gruplar.set(anahtar, g);
    kazancToplam = kTopla(kazancToplam, w);
    plaseToplam = kTopla(plaseToplam, p);
  }

  // Şirket bonusları (sadece kazanç kısmına)
  let bonus = SIFIR;
  const kazananlar = girdi.secimler.filter((s) => s.sonuc === 'won').length;
  if (kazananlar === n && girdi.bonusHepsiYuzde > 0) {
    bonus = kTopla(bonus, kBol(kCarp(kazancToplam, kesreCevir(Math.min(girdi.bonusHepsiYuzde, 100))), K(100n)));
  }
  const carpan = girdi.bonusTekKazanCarpan;
  if (t.tekli && kazananlar === 1 && carpan > 1) {
    const idx = girdi.secimler.findIndex((s) => s.sonuc === 'won');
    const tekliSayisi = parcalar.filter((c) => c.tip === 'kat' && c.ayaklar.length === 1 && c.ayaklar[0] === idx).length;
    const dh = K(1n, BigInt(girdi.secimler[idx].dhKazan > 1 ? girdi.secimler[idx].dhKazan : 1));
    const kar = kCikar(ayaklar[idx].kazanOrani, BIR);
    const karPoz = kKucuk(kar, SIFIR) ? SIFIR : kar;
    const ek = kCikar(kesreCevir(Math.min(carpan, 10)), BIR);
    bonus = kTopla(bonus, kCarp(kCarp(kCarp(kCarp(birim, dh), karPoz), ek), K(BigInt(tekliSayisi))));
  }

  const satirSayisi = parcalar.length * (ew ? 2 : 1);
  const toplamBahis = kCarp(birim, K(BigInt(satirSayisi)));
  const getiri = kTopla(kTopla(kazancToplam, plaseToplam), bonus);
  const siraNo = (a) => (a === 'sart' ? 99 : a);
  const sayi = (a) => Number(a.p) / Number(a.q);

  return {
    satirSayisi,
    toplamBahis: kurus(toplamBahis),
    kazancGetiri: kurus(kazancToplam),
    plaseGetiri: kurus(plaseToplam),
    bonus: kurus(bonus),
    getiri: kurus(getiri),
    kar: kurus(kCikar(getiri, toplamBahis)),
    gruplar: [...gruplar.values()]
      .sort((a, b) => siraNo(a.anahtar) - siraNo(b.anahtar))
      .map((g) => ({ ...g, kazanc: kurus(g.kazanc), plase: kurus(g.plase) })),
    ayaklar: ayaklar.map((a) => ({ kazanOrani: sayi(a.kazanOrani), plaseOrani: sayi(a.plaseOrani) })),
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
    kombinasyonlar, oranCevir, oranKesri, kesirliYaz, kurus, ayakCarpanlari, luckyHesapla, grupAdi, turIcerigi, satirSayisi, secimSayisi,
  };
}
