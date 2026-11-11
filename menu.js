// =====================================================================
// Sol menü + Lucky/Yankee ekranı
// Menüde bir isme tıklanınca ortadaki program değişir.
// Adres çubuğunda #lucky15, #sistemli gibi görünür; sayfa yenilense de
// aynı program açık kalır.
// =====================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const tl = (x) => bicimle(x); // app.js'teki Türkçe sayı biçimi

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
      <input class="l-oran" inputmode="text" autocomplete="off" placeholder="5/2" value="${v.oran}">
      <select class="l-sonuc">${secenek}</select>
      <input class="l-r4" inputmode="numeric" autocomplete="off" placeholder="0" value="${v.r4}">
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
    if (aktifTur) kayit = satirlariOku();
    aktifTur = kod;
    const t = LUCKY_TURLER[kod];
    $('l-baslik').textContent = t.ad;
    $('l-aciklama').textContent = `${t.secim} seçim · ${satirSayisi(kod)} bahis: ${turIcerigi(kod)}`;
    let html = '';
    for (let i = 0; i < t.secim; i++) {
      html += satirHtml(i, kayit[i] || { oran: '', sonuc: 'won', r4: '', dh: 1 });
    }
    $('l-secimler').innerHTML = html;
    // Tek kazanan bonusu sadece teklisi olan türlerde (Patent, Lucky) anlamlı
    $('l-carpan-alan').hidden = t.enAz !== 1;
    luckyGuncelle();
  }

  // Ekrandaki değerlerle hesabı yapar. Eksik bilgi varsa null döner.
  function luckyGirdi() {
    const t = LUCKY_TURLER[aktifTur];
    const birim = sayiyaCevir($('l-birim').value);
    const [pay, payda] = $('l-plase').value.split('/').map(Number);
    const ewMod = $('l-ew').value;
    const satirlar = satirlariOku();
    const hatalar = [];
    const secimler = satirlar.map((s, i) => {
      const oran = oranCevir(s.oran);
      if (s.sonuc !== 'void' && s.sonuc !== 'lost' && !(oran > 1)) hatalar.push(i + 1);
      return {
        oran: oran > 1 ? oran : 2, // kaybeden/NR atın oranı hesabı etkilemez
        sonuc: s.sonuc,
        rule4: Math.min(sayiyaCevir(s.r4), 90),
        dhKazan: Number(s.dh) || 1,
      };
    });
    return {
      hatalar, birim, satirlar,
      girdi: {
        tur: aktifTur, secimler, birimBahis: birim,
        ew: Boolean(ewMod), ewMod: ewMod || 'winToWin',
        plaseKesri: { pay, payda },
        bonusHepsiYuzde: sayiyaCevir($('l-bonus-yuzde').value),
        bonusTekKazanCarpan: t.enAz === 1 ? sayiyaCevir($('l-bonus-carpan').value) : 0,
      },
    };
  }

  let sonHesap = null;

  function luckyGuncelle() {
    if (!aktifTur) return;
    // Satırları sonuca göre renklendir
    document.querySelectorAll('#l-secimler .l-satir').forEach((s) => {
      s.dataset.sonuc = s.querySelector('.l-sonuc').value;
    });
    $('l-plase').disabled = !$('l-ew').value;

    const { hatalar, birim, girdi } = luckyGirdi();
    const satir = satirSayisi(aktifTur) * (girdi.ew ? 2 : 1);
    $('l-satir-notu').textContent = `${satir} satır × ${tl(birim)}`;

    const hata = $('l-hata');
    if (!birim || hatalar.length) {
      hata.textContent = !birim ? 'Satır başı bahis tutarını yaz.'
        : `Oran eksik veya hatalı: ${hatalar.join(', ')}. seçim`;
      $('l-toplam-bahis').textContent = tl(birim * satir);
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
    $('l-bonus-yuzde').value = '';
    $('l-bonus-carpan').value = '';
    luckyKur(kod);
    $('l-birim').focus();
  });

  // ---------------- Lucky termal fişi ----------------
  $('l-yazdir').addEventListener('click', () => {
    if (!sonHesap) { luckyGuncelle(); if (!sonHesap) return; }
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
    h += s('Satır başı', tl(girdi.birimBahis));
    h += s('Satır', String(r.satirSayisi) + (girdi.ew ? ' (EW)' : ''));
    if (girdi.ew) {
      h += s('Each-Way', girdi.ewMod === 'equallyDivided' ? 'Eşit bölünmüş' : 'Win to Win', 'kucuk');
      h += s('Plase kesri', girdi.plaseKesri.pay + '/' + girdi.plaseKesri.payda, 'kucuk');
    }
    h += s('TOPLAM BAHİS', tl(r.toplamBahis), 'buyuk');
    h += '<div class="cizgi"></div>';

    satirlar.forEach((sat, i) => {
      const sec = girdi.secimler[i];
      const oranYazi = sat.oran ? `${sat.oran.toUpperCase()} (${kac(sec.oran)})` : '—';
      h += s(`${i + 1}. ${oranYazi}`, sonucAdi[sat.sonuc]);
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
    window.print();
  });

  // Açılışta adresteki programı göster
  goster(location.hash);
})();
