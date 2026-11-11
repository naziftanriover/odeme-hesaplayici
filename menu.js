// =====================================================================
// Sol menü + Lucky/Yankee ekranı
// Menüde bir isme tıklanınca ortadaki program değişir.
// Adres çubuğunda #lucky15, #sistemli gibi görünür; sayfa yenilense de
// aynı program açık kalır.
// =====================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const tl = (x) => bicimle(x); // app.js'teki Türkçe sayı biçimi
  // Kasiyerin yazdığı metni HTML içine güvenle koymak için
  const kacis = (m) => String(m).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ------------------------------------------------------------------
  // GÖRÜNÜM DEĞİŞTİRME
  // ------------------------------------------------------------------
  // Menüdeki bahis isimlerini lucky.js listesinden oluştur
  const menuTurleri = new Set();
  $('menu-bahisler').innerHTML = LUCKY_AILELER.map(([aile, baslik]) => {
    const linkHtml = Object.entries(LUCKY_TURLER)
      .filter(([, t]) => t.aile === aile)
      .map(([kod, t]) => {
        menuTurleri.add(kod);
        return `<a href="#${kod}" data-gorunum="lucky">${t.ad} <small>${satirSayisi(kod)}</small></a>`;
      }).join('');
    return `<p class="menu-baslik">${baslik}</p>${linkHtml}`;
  }).join('');

  const linkler = [...document.querySelectorAll('.menu a')];

  function goster(adres) {
    const kod = (adres || '').replace('#', '') || 'odeme';
    const lucky = menuTurleri.has(kod);
    const gorunum = lucky ? 'lucky' : (kod === 'sistemli' ? 'sistemli' : 'odeme');

    document.querySelectorAll('.gorunum').forEach((el) => {
      el.hidden = el.id !== 'gorunum-' + gorunum;
    });
    linkler.forEach((a) => {
      const aktif = a.getAttribute('href') === '#' + (gorunum === 'odeme' ? 'odeme' : kod);
      a.classList.toggle('aktif', aktif);
      if (aktif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    if (lucky) luckyKur(kod);
    if (gorunum === 'sistemli') {
      // Sistemli kupon programını ilk açılışta yükle
      const f = $('sistemli-cerceve');
      if (!f.src) f.src = f.dataset.src;
    }
    document.title = gorunum === 'odeme' ? 'Ödeme Hesaplayıcı'
      : gorunum === 'sistemli' ? 'Sistemli Kupon Hesaplama'
      : LUCKY_TURLER[kod].ad + ' Hesaplayıcı';
  }

  window.addEventListener('hashchange', () => goster(location.hash));

  // ------------------------------------------------------------------
  // LUCKY / YANKEE EKRANI
  // ------------------------------------------------------------------
  // Oran tipi: kesirli (5/2) ya da ondalık (3,50). Seçim hatırlanır.
  const oranTipi = () => $('l-oran-tipi').value;
  try { const k = localStorage.getItem('odeme-oran-tipi'); if (k) $('l-oran-tipi').value = k; } catch (e) {}
  function oranTipiUygula() {
    const kesirli = oranTipi() === 'kesirli';
    document.querySelectorAll('#l-secimler .l-oran').forEach((el) => { el.placeholder = kesirli ? '5/2' : '3,50'; });
    $('l-ipucu').textContent = (kesirli
      ? 'Kesirli: 5/2, 11/4, EVS yaz. Düz sayı ondalık sayılır (5 = 4/1).'
      : 'Ondalık: 3,50 veya 3.50 yaz (nokta-virgül fark etmez). 5/2 ve EVS de olur.')
      + ' Fiyatı boş at kaybetti sayılır. NR = at koşmadı, bahis iade.';
  }
  $('l-oran-tipi').addEventListener('change', () => {
    try { localStorage.setItem('odeme-oran-tipi', oranTipi()); } catch (e) {}
    oranTipiUygula();
  });
  oranTipiUygula();

  // Bahis girişi: satır başı ya da toplam yatırılan. Seçim hatırlanır.
  const bahisTipi = () => $('l-bahis-tipi').value;
  try { const b = localStorage.getItem('odeme-bahis-tipi'); if (b) $('l-bahis-tipi').value = b; } catch (e) {}
  function bahisTipiUygula() {
    $('l-birim-etiket').textContent = bahisTipi() === 'toplam' ? 'Toplam yatırılan' : 'Satır başı bahis';
  }
  $('l-bahis-tipi').addEventListener('change', () => {
    try { localStorage.setItem('odeme-bahis-tipi', bahisTipi()); } catch (e) {}
    bahisTipiUygula();
  });
  bahisTipiUygula();

  let aktifTur = null;
  // Seçimlerin girilen değerleri; tür değişince ortak satırlar korunur
  let kayit = [];

  const SONUCLAR = [
    ['won', 'Kazandı'],
    ['placed', 'Plase'],
    ['lost', 'Kaybetti'],
    ['void', 'NR (iade)'],
  ];

  function satirHtml(i, v) {
    const secenek = SONUCLAR.map(([d, ad]) =>
      `<option value="${d}"${v.sonuc === d ? ' selected' : ''}>${ad}</option>`).join('');
    const dh = [1, 2, 3, 4].map((n) =>
      `<option value="${n}"${Number(v.dh) === n ? ' selected' : ''}>${n === 1 ? 'Yok' : n + ' at'}</option>`).join('');
    return `<div class="l-satir" data-sira="${i}" data-sonuc="${v.sonuc}">
      <span class="l-no">${i + 1}</span>
      <input class="l-oran" inputmode="text" autocomplete="off" placeholder="${oranTipi() === 'kesirli' ? '5/2' : '3,50'}" value="${kacis(v.oran)}">
      <select class="l-sonuc">${secenek}</select>
      <input class="l-r4" inputmode="numeric" autocomplete="off" placeholder="0" value="${kacis(v.r4)}">
      <select class="l-dh">${dh}</select>
    </div>`;
  }

  function satirlariOku() {
    return [...document.querySelectorAll('#l-secimler .l-satir')].map((s) => ({
      oran: s.querySelector('.l-oran').value,
      sonuc: s.querySelector('.l-sonuc').value,
      r4: s.querySelector('.l-r4').value,
      dh: s.querySelector('.l-dh').value,
    }));
  }

  // Seçilen türe göre ekranı kurar (seçim sayısı, başlık, açıklama)
  function luckyKur(kod) {
    if (aktifTur === kod) return;
    // Ekrandaki satırlar kaydedilir; küçük türe geçip dönünce fazla satırlar kaybolmaz
    if (aktifTur) { const ekran = satirlariOku(); kayit = ekran.concat(kayit.slice(ekran.length)); }
    aktifTur = kod;
    const t = LUCKY_TURLER[kod];
    $('l-baslik').textContent = t.ad;
    $('l-aciklama').textContent = `${t.secim} seçim · ${satirSayisi(kod)} bahis: ${turIcerigi(kod)}`;
    let html = '';
    for (let i = 0; i < t.secim; i++) {
      html += satirHtml(i, kayit[i] || { oran: '', sonuc: 'won', r4: '', dh: 1 });
    }
    $('l-secimler').innerHTML = html;
    // SOLİBET bonusları sadece teklisi olan türlerde (Patent, Lucky 15/31/63) var;
    // Trixie, Yankee, Canadian, Heinz, Super Heinz, Goliath'ta bonus yok.
    $('l-bonus-bolum').hidden = !t.tekli;
    luckyGuncelle();
  }

  // Ekrandaki değerlerle hesabı yapar. Eksik bilgi varsa null döner.
  function luckyGirdi() {
    const t = LUCKY_TURLER[aktifTur];
    const girilen = sayiyaCevir($('l-birim').value);
    const [pay, payda] = $('l-plase').value.split('/').map(Number);
    const ewMod = $('l-ew').value;
    // Toplam girildiyse satır başı = toplam ÷ satır sayısı. Küsuratlı olabilir (100 ÷ 15),
    // bu yüzden motora tam kesir olarak verilir; toplam bahis kuruşu kuruşuna girilen tutar olur.
    const satirAdedi = satirSayisi(aktifTur) * (ewMod ? 2 : 1);
    const toplamModu = bahisTipi() === 'toplam';
    const birim = toplamModu ? girilen / satirAdedi : girilen;
    let birimBahis = girilen;
    if (toplamModu && girilen > 0) {
      const k = kesreCevir(String(girilen));
      birimBahis = { p: k.p, q: k.q * BigInt(satirAdedi) };
    }
    const satirlar = satirlariOku();
    const hatalar = [];      // oranı eksik/hatalı satırlar
    const r4Hatalari = [];   // Rule 4 0-90 dışında veya hatalı yazılmış satırlar
    const secimler = satirlar.map((s, i) => {
      const oran = oranCevir(s.oran);
      // Fiyatı boş bırakılan at kaybetti sayılır (NR seçildiyse NR kalır)
      const bos = s.oran.trim() === '';
      const sonuc = bos && s.sonuc !== 'void' ? 'lost' : s.sonuc;
      const oynadi = sonuc === 'won' || sonuc === 'placed';
      if (oynadi && !(oran > 1)) hatalar.push(i + 1); // yazılmış ama hatalı fiyat
      const r4 = sayiyaCevir(s.r4);
      if (!sayiGecerliMi(s.r4) || r4 > 90) r4Hatalari.push(i + 1);
      return {
        oran: oran > 1 ? oran : 2, // kaybeden/NR atın oranı hesabı etkilemez
        oranMetin: oran > 1 ? s.oran : undefined, // motor tam kesirle hesaplasın (4/6 gibi)
        oranGecerli: oran > 1,
        sonuc,
        rule4: Math.min(r4, 90),
        dhKazan: oynadi ? (Number(s.dh) || 1) : 1, // dead heat sadece kazanan/plase atta
      };
    });
    return {
      hatalar, r4Hatalari, birim, girilen, toplamModu, birimGecerli: sayiGecerliMi($('l-birim').value), satirlar,
      girdi: {
        tur: aktifTur, secimler, birimBahis, birimSayi: birim, toplamModu,
        ew: Boolean(ewMod), ewMod: ewMod || 'winToWin',
        plaseKesri: { pay, payda },
        bonusHepsiYuzde: t.tekli ? sayiyaCevir($('l-bonus-yuzde').value) : 0,
        bonusTekKazanCarpan: t.tekli ? sayiyaCevir($('l-bonus-carpan').value) : 0,
      },
    };
  }

  let sonHesap = null;

  function luckyGuncelle() {
    if (!aktifTur) return;
    // Satırları sonuca göre renklendir
    document.querySelectorAll('#l-secimler .l-satir').forEach((s) => {
      const secilen = s.querySelector('.l-sonuc').value;
      const bos = s.querySelector('.l-oran').value.trim() === '';
      s.dataset.sonuc = bos && secilen !== 'void' ? 'lost' : secilen;
    });
    $('l-plase').disabled = !$('l-ew').value;
    $('l-bonus-ozet').textContent = $('l-ew').value === 'equallyDivided'
      ? 'eşit bölünmüş EW\'de bonus yok'
      : `tek kazanan ×${$('l-bonus-carpan').value || '1'} +1 · hepsi kazanırsa %${$('l-bonus-yuzde').value || '0'} · NR varsa yok`;

    const { hatalar, r4Hatalari, birim, girilen, toplamModu, birimGecerli, girdi } = luckyGirdi();
    const satir = satirSayisi(aktifTur) * (girdi.ew ? 2 : 1);
    // Küsuratlı satır başı 4 haneyle gösterilir (100 ÷ 15 = 6,6667)
    const birimYazi = Math.abs(birim * 100 - Math.round(birim * 100)) > 1e-9 ? bicimle(birim, 4) : tl(birim);
    $('l-satir-notu').textContent = `${satir} satır × ${birimYazi}`;

    const hata = $('l-hata');
    $('l-birim').classList.toggle('hatali', !birimGecerli);
    document.querySelectorAll('#l-secimler .l-satir').forEach((sat, i) => {
      sat.querySelector('.l-oran').classList.toggle('hatali', hatalar.includes(i + 1));
      sat.querySelector('.l-r4').classList.toggle('hatali', r4Hatalari.includes(i + 1));
    });
    if (!(birim > 0) || hatalar.length || r4Hatalari.length) {
      hata.textContent = !(birim > 0) ? (toplamModu ? 'Toplam yatırılan tutarı yaz (0\'dan büyük).' : 'Satır başı bahis tutarını yaz (0\'dan büyük).')
        : hatalar.length ? `Oran eksik veya hatalı: ${hatalar.join(', ')}. seçim`
        : `Rule 4 0 ile 90 arasında olmalı: ${r4Hatalari.join(', ')}. seçim`;
      $('l-toplam-bahis').textContent = tl(toplamModu ? girilen : birim * satir);
      $('l-getiri').textContent = '0,00';
      $('l-kar').textContent = '—';
      $('l-detay').innerHTML = '';
      sonHesap = null;
      return;
    }
    hata.textContent = '';

    const r = luckyHesapla(girdi);
    sonHesap = { r, girdi };
    $('l-toplam-bahis').textContent = tl(r.toplamBahis);
    $('l-getiri').textContent = tl(r.getiri);
    $('l-kar').textContent = (r.kar >= 0 ? 'Kâr ' : 'Zarar ') + tl(Math.abs(r.kar)) + ' ₺';

    // Kutu rengi: kâr = yeşil, zarar ama getiri var = mavi, hiç getiri yok = kırmızı
    const kutu = $('l-odeme-kutu');
    kutu.classList.remove('tamam', 'eksik', 'fazla');
    kutu.classList.add(r.kar >= 0 ? 'tamam' : r.getiri > 0 ? 'fazla' : 'eksik');

    // Kombinasyon dökümü
    let d = '<div class="l-grup baslik"><span>Kombinasyon</span><span>Satır</span><span>Win</span>'
      + (girdi.ew ? '<span>Plase</span>' : '') + '</div>';
    r.gruplar.forEach((g) => {
      d += `<div class="l-grup"><span>${grupAdi(g.anahtar)}</span><span>${g.satir}</span><span>${tl(g.kazanc)}</span>`
        + (girdi.ew ? `<span>${tl(g.plase)}</span>` : '') + '</div>';
    });
    if (r.bonus) d += `<div class="l-grup l-bonus-satir"><span>Bonus</span><span></span><span>${tl(r.bonus)}</span>${girdi.ew ? '<span></span>' : ''}</div>`;
    $('l-detay').innerHTML = d;
    $('l-detay').classList.toggle('ew', girdi.ew);
  }

  $('gorunum-lucky').addEventListener('input', luckyGuncelle);
  $('gorunum-lucky').addEventListener('change', luckyGuncelle);

  $('l-temizle').addEventListener('click', () => {
    kayit = [];
    const kod = aktifTur;
    aktifTur = null;
    $('l-birim').value = '';
    // SOLİBET varsayılanlarına dön
    $('l-bonus-yuzde').value = '10';
    $('l-bonus-carpan').value = '2';
    luckyKur(kod);
    $('l-birim').focus();
  });

  // ---------------- Lucky termal fişi ----------------
  // Fişi son hesaptan hazırlar. Hesap eksikse false döner.
  function luckyFisHazirla() {
    luckyGuncelle();
    if (!sonHesap) return false;
    const { r, girdi } = sonHesap;
    const t = LUCKY_TURLER[girdi.tur];
    const satirlar = satirlariOku();
    const s = (sol, sag, sinif = '') => `<div class="s ${sinif}"><span>${sol}</span><span>${sag}</span></div>`;
    const sonucAdi = Object.fromEntries(SONUCLAR);
    const kac = (x) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(x);
    let h = '';

    h += '<div class="orta marka-fis">SOLİBET</div>';
    h += `<div class="orta">${t.ad.toLocaleUpperCase('tr-TR')} HESABI</div>`;
    h += '<div class="orta kucuk">' + new Date().toLocaleString('tr-TR') + '</div>';
    h += '<div class="kalin-cizgi"></div>';
    const b = girdi.birimSayi;
    const kusurat = Math.abs(b * 100 - Math.round(b * 100)) > 1e-9;
    h += s('Satır başı', kusurat ? bicimle(b, 4) : tl(b));
    h += s('Satır', String(r.satirSayisi) + (girdi.ew ? ' (EW)' : ''));
    if (girdi.ew) {
      h += s('Each-Way', girdi.ewMod === 'equallyDivided' ? 'Eşit bölünmüş' : 'Win to Win', 'kucuk');
      h += s('Plase kesri', girdi.plaseKesri.pay + '/' + girdi.plaseKesri.payda, 'kucuk');
    }
    h += s('TOPLAM BAHİS', tl(r.toplamBahis), 'buyuk');
    h += '<div class="cizgi"></div>';

    satirlar.forEach((sat, i) => {
      const sec = girdi.secimler[i];
      // Oran fişte seçilen tipte, yanında diğer tipte yazılır: "4/1 (5,00)" ya da "5,00 (4/1)"
      // Kasiyer kesir yazdıysa (6/4 gibi) aynen korunur
      // Oranı okunamayan kaybeden/NR at için "—" yazılır
      const yazilan = sat.oran.trim().toUpperCase().replace(/\s/g, '');
      const kesirHali = /[/-]|EV/.test(yazilan) ? kacis(yazilan.replace('-', '/')) : kesirliYaz(sec.oran);
      const oranYazi = !sec.oranGecerli ? '—'
        : oranTipi() === 'kesirli' ? `${kesirHali} (${tl(sec.oran)})`
        : `${tl(sec.oran)} (${kesirHali})`;
      h += s(`${i + 1}. ${oranYazi}`, sonucAdi[sec.sonuc]);
      const ek = [];
      if (sec.rule4) ek.push(`Rule 4: ${sec.rule4}p`);
      if (sec.dhKazan > 1) ek.push(`DH: ${sec.dhKazan} at`);
      if (ek.length) h += s(ek.join(' · '), '', 'girinti kucuk');
    });
    h += '<div class="cizgi"></div>';

    r.gruplar.forEach((g) => {
      const tutar = g.kazanc + g.plase;
      h += s(`${g.satir} x ${grupAdi(g.anahtar)}`, tl(tutar), 'kucuk');
    });
    if (girdi.ew) {
      h += s('Win getirisi', tl(r.kazancGetiri), 'kucuk');
      h += s('Plase getirisi', tl(r.plaseGetiri), 'kucuk');
    }
    if (r.bonus) h += s('Bonus', tl(r.bonus), 'kucuk');
    h += '<div class="cizgi"></div>';
    h += s('ÖDEME', tl(r.getiri), 'buyuk');
    h += s(r.kar >= 0 ? 'Net kâr' : 'Net zarar', tl(Math.abs(r.kar)), 'kucuk');
    h += '<div class="kalin-cizgi"></div>';
    h += '<div class="orta kucuk">Bilgi amaçlıdır</div>';

    $('fis').innerHTML = h;
    return true;
  }

  $('l-yazdir').addEventListener('click', () => {
    if (luckyFisHazirla()) window.print();
  });

  // Ctrl+P ile yazdırılsa bile fiş o an açık olan ekrandan hazırlanır;
  // yazdırma bitince fiş temizlenir (eski müşterinin fişi tekrar çıkmaz).
  window.addEventListener('beforeprint', () => {
    if (!$('gorunum-odeme').hidden && window.odemeFisHazirla) window.odemeFisHazirla();
    else if (!$('gorunum-lucky').hidden) { if (!luckyFisHazirla()) $('fis').innerHTML = ''; }
    else $('fis').innerHTML = '';
  });
  window.addEventListener('afterprint', () => { $('fis').innerHTML = ''; });

  // ------------------------------------------------------------------
  // AÇIK / KOYU TEMA
  // İlk açılışta bilgisayarın ayarı geçerli; düğmeye basınca seçim saklanır.
  // ------------------------------------------------------------------
  const GUNES = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
  const AY = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  const sistemAcik = window.matchMedia('(prefers-color-scheme: light)');

  function aktifTema() {
    return document.documentElement.dataset.theme || (sistemAcik.matches ? 'light' : 'dark');
  }
  function temaDugmesiniGuncelle() {
    const acik = aktifTema() === 'light';
    // Düğme, geçilecek temayı gösterir
    $('tema-ikon').innerHTML = acik ? AY : GUNES;
    $('tema-yazi').textContent = acik ? 'Koyu tema' : 'Açık tema';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = acik ? '#ffffff' : '#081a10';
  }
  $('tema-dugme').addEventListener('click', () => {
    const yeni = aktifTema() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = yeni;
    try { localStorage.setItem('odeme-tema', yeni); } catch (e) { /* saklanamazsa sorun değil */ }
    temaDugmesiniGuncelle();
  });
  sistemAcik.addEventListener('change', temaDugmesiniGuncelle);
  temaDugmesiniGuncelle();

  // Açılışta adresteki programı göster
  goster(location.hash);
})();
