// =====================================================================
// Ödeme Hesaplayıcı — SOLİBET
// Kasiyer farklı dövizlerle ödeme yaparken "ne kadar ödedim, ne kadar
// kaldı" hesabını yapar. Hiçbir yere veri göndermez.
// =====================================================================

// Uygulamadaki dövizler. TL'nin kuru her zaman 1'dir.
const DOVIZLER = ['STG', 'USD', 'EUR', 'TL'];

// İlk açılışta gelecek varsayılan kurlar (kasiyer sonra değiştirir,
// değiştirdiği değer tarayıcıda saklanır).
const VARSAYILAN_KURLAR = { STG: '66,8', USD: '50,1', EUR: '55,9' };

// KALAN bu değerden küçükse (mutlak değer) "Tamam" sayılır.
const TAMAM_SINIRI = 1;

// ---------------------------------------------------------------------
// SAF HESAP FONKSİYONLARI (ekranla ilgisi yok, kolayca değiştirilebilir)
// ---------------------------------------------------------------------

// Yazılan metin geçerli bir sayı mı? Sadece rakam, nokta ve virgül olabilir.
// Boş alan geçerlidir (0 sayılır). Eksi sayı, harf, "1e5" gibi yazımlar geçersizdir.
function sayiGecerliMi(metin) {
  const s = String(metin ?? '').replace(/\s/g, '');
  return s === '' || (/^[\d.,]+$/.test(s) && /\d/.test(s));
}

// Yazılan metni sayıya çevirir. Nokta da virgül de ondalık sayılır:
// "1392" → 1392, "66,8" → 66.8, "66.8" → 66.8, "1.234,56" → 1234.56
// Geçersiz yazım 0 döner (ekranda alan kırmızı gösterilir).
function sayiyaCevir(metin) {
  if (metin == null) return 0;
  let s = String(metin).trim().replace(/\s/g, '');
  if (s === '' || !sayiGecerliMi(s)) return 0;
  s = s.replace(/[.,]+$/, ''); // yazarken sona konan ayraç ("12,") yok sayılır

  // Nokta ve virgül aynı işi görür: tek ayraç varsa ondalıktır.
  //   "66.8" = "66,8" = 66,8    |   "50.125" = "50,125" = 50,125
  // Aynı ayraç birden çok kez geçerse binliktir: "1.234.567" → 1234567
  // İkisi birden varsa sondaki ondalık, diğeri binliktir: "1.234,56" / "1,234.56"
  const virgul = s.lastIndexOf(',');
  const nokta = s.lastIndexOf('.');
  const ayracSayisi = (s.match(/[.,]/g) || []).length;

  if (virgul > -1 && nokta > -1) {
    const ondalik = virgul > nokta ? ',' : '.';
    const binlik = ondalik === ',' ? /\./g : /,/g;
    s = s.replace(binlik, '').replace(ondalik, '.');
  } else if (ayracSayisi > 1) {
    s = s.replace(/[.,]/g, '');
  } else {
    s = s.replace(',', '.');
  }

  const sayi = Number(s);
  return Number.isFinite(sayi) ? sayi : 0;
}

// Bir satırın TL karşılığı = miktar × kur
function hesaplaTlKarsiligi(miktar, kur) {
  return miktar * kur;
}

// TOPLAM = tüm satırların TL karşılıklarının toplamı
// satirlar: [{ miktar, kur }, ...]
function hesaplaToplam(satirlar) {
  return satirlar.reduce((t, s) => t + hesaplaTlKarsiligi(s.miktar, s.kur), 0);
}

// Kuruşa yuvarlar, yarım kuruşu sıfırdan uzağa (bahis motoruyla aynı kural).
// toPrecision küçük kayan nokta hatalarını temizler (1.005 → 1.01).
function kurusaYuvarla(x) {
  const r = Math.sign(x) * Math.round(Number((Math.abs(x) * 100).toPrecision(15))) / 100;
  return r || 0; // -0 yerine 0
}

// KALAN = Ödenecek Tutar − TOPLAM (kuruşa yuvarlı, "-0,00" çıkmaz)
function hesaplaKalan(odenecek, toplam) {
  return kurusaYuvarla(odenecek - toplam);
}

// Kalanı tamamlamak için gereken döviz adedi = KALAN / kur
// Kur girilmemişse hesaplanamaz: NaN döner, ekranda "—" görünür.
function hesaplaKalanDoviz(kalan, kur) {
  return kur > 0 ? kalan / kur : NaN;
}

// KALAN'ın durumu: 'tamam' (yeşil), 'eksik' (kırmızı), 'fazla' (mavi)
function kalanDurumu(kalan) {
  if (Math.abs(kalan) < TAMAM_SINIRI) return 'tamam';
  return kalan > 0 ? 'eksik' : 'fazla';
}

// TL banknotlarının toplamı = Σ (küpür × adet) + bozuk para (coins) tutarı
// adetler: { 200: 3, 100: 1, ... }, coins: TL tutarı
function hesaplaBanknotToplam(adetler, coins) {
  let toplam = 0;
  for (const kupur in adetler) toplam += Number(kupur) * (adetler[kupur] || 0);
  return toplam + (coins || 0);
}

// Sayıyı Türkçe biçimde yazar: 199999.6 → "199.999,60"
// Yuvarlanınca sıfır olan küçük eksi değerler "-0,00" değil "0,00" yazılır.
function bicimle(sayi, ondalik = 2) {
  if (!Number.isFinite(sayi)) return '—';
  sayi = Number(sayi.toFixed(ondalik)) || 0;
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: ondalik,
    maximumFractionDigits: ondalik,
  }).format(sayi);
}

// Node.js ile test edebilmek için fonksiyonları dışa aç
if (typeof module !== 'undefined') {
  module.exports = {
    sayiyaCevir, sayiGecerliMi, kurusaYuvarla, hesaplaTlKarsiligi, hesaplaToplam, hesaplaKalan,
    hesaplaKalanDoviz, kalanDurumu, bicimle, hesaplaBanknotToplam,
  };
}

// ---------------------------------------------------------------------
// EKRAN KISMI (sadece tarayıcıda çalışır)
// ---------------------------------------------------------------------
if (typeof document !== 'undefined') {
  const $ = (id) => document.getElementById(id);

  // localStorage bazı durumlarda (gizli pencere vb.) hata verebilir
  function kurlariYukle() {
    try {
      return JSON.parse(localStorage.getItem('odeme-kurlar')) || VARSAYILAN_KURLAR;
    } catch { return VARSAYILAN_KURLAR; }
  }
  function kurlariKaydet() {
    try {
      const k = {};
      ['STG', 'USD', 'EUR'].forEach((d) => { k[d] = $('kur-' + d).value; });
      localStorage.setItem('odeme-kurlar', JSON.stringify(k));
    } catch { /* kaydedilemezse sorun değil */ }
  }

  // Ekrandaki değerleri okuyup her şeyi yeniden hesaplar
  function guncelle() {
    // Geçersiz yazılmış alanları kırmızı göster (eksi sayı, harf vb.)
    document.querySelectorAll('#gorunum-odeme input').forEach((el) => {
      const kupur = el.dataset.kupur;
      const gecerli = sayiGecerliMi(el.value) && (!kupur || /^\d*$/.test(el.value.trim()));
      el.classList.toggle('hatali', !gecerli);
    });
    const odenecek = sayiyaCevir($('odenecek').value);

    const satirlar = DOVIZLER.map((d) => {
      const miktar = sayiyaCevir($('miktar-' + d).value);
      const kur = d === 'TL' ? 1 : sayiyaCevir($('kur-' + d).value);
      $('tl-' + d).textContent = bicimle(hesaplaTlKarsiligi(miktar, kur));
      return { doviz: d, miktar, kur };
    });

    const toplam = hesaplaToplam(satirlar);
    const kalan = hesaplaKalan(odenecek, toplam);
    const durum = kalanDurumu(kalan);

    $('toplam').textContent = bicimle(toplam);
    $('kalan').textContent = bicimle(kalan);

    const kutu = $('kalan-kutu');
    kutu.classList.remove('tamam', 'eksik', 'fazla');
    kutu.classList.add(durum);
    $('durum').textContent =
      durum === 'tamam' ? 'Tamam' : durum === 'eksik' ? 'Eksik ödeme' : 'Para üstü verilecek';

    // Kalanın döviz karşılıkları: her döviz satırında, kurun yanında gösterilir.
    // Para üstü durumunda eksi işaretli çıkar.
    const bos = odenecek === 0 && toplam === 0;
    ['STG', 'USD', 'EUR'].forEach((d) => {
      const adet = hesaplaKalanDoviz(kalan, satirlar.find((s) => s.doviz === d).kur);
      const alan = $('kalan-' + d);
      const yok = bos || !Number.isFinite(adet);
      alan.textContent = yok ? '—' : bicimle(adet, 2);
      alan.dataset.durum = yok ? '' : durum;
    });
  }

  // Açılışta kayıtlı kurları yerleştir
  const kurlar = kurlariYukle();
  ['STG', 'USD', 'EUR'].forEach((d) => { $('kur-' + d).value = kurlar[d] ?? ''; });

  // ---------------- TL banknot alt bölümü ----------------
  const kupurAlanlari = [...document.querySelectorAll('[data-kupur]')];

  // Girilen adetleri { 200: adet, 100: adet, ... } olarak okur
  function adetleriOku() {
    const adetler = {};
    // Adet tam sayı olmalı; "2,5" gibi yazımlar geçersiz sayılır (alan kırmızı olur)
    kupurAlanlari.forEach((el) => {
      const v = el.value.trim();
      adetler[el.dataset.kupur] = /^\d+$/.test(v) ? Number(v) : 0;
    });
    return adetler;
  }
  function banknotGirildiMi() {
    return kupurAlanlari.some((el) => el.value.trim() !== '') || $('coins').value.trim() !== '';
  }
  function banknotlariSil() {
    kupurAlanlari.forEach((el) => { el.value = ''; });
    $('coins').value = '';
  }

  // Adet değişince TL miktarını otomatik yaz
  function banknottanTlYaz() {
    const toplam = hesaplaBanknotToplam(adetleriOku(), sayiyaCevir($('coins').value));
    // Binlik noktası olmadan yazılır ("1014,00"); kasiyer düzeltirse yanlış okunmaz
    $('miktar-TL').value = banknotGirildiMi() ? toplam.toFixed(2).replace('.', ',') : '';
    $('banknot-ozet').textContent = banknotGirildiMi() ? '= ' + bicimle(toplam) + ' ₺' : '';
  }

  // Her tuşta anlık hesapla
  document.querySelectorAll('#gorunum-odeme input').forEach((el) => {
    el.addEventListener('input', () => {
      if (el.id.startsWith('kur-')) kurlariKaydet();
      if (el.dataset.kupur || el.id === 'coins') banknottanTlYaz();
      // TL miktarı elle yazılırsa eski adetler geçersiz olur, silinir
      if (el.id === 'miktar-TL' && banknotGirildiMi()) {
        banknotlariSil();
        $('banknot-ozet').textContent = '';
      }
      guncelle();
    });
  });

  // Temizle: tutarı, miktarları ve banknot adetlerini siler, kurları korur
  $('temizle').addEventListener('click', () => {
    $('odenecek').value = '';
    DOVIZLER.forEach((d) => { $('miktar-' + d).value = ''; });
    banknotlariSil();
    $('banknot-ozet').textContent = '';
    guncelle();
    $('odenecek').focus();
  });

  // ---------------- Termal fiş ----------------
  function fisHazirla() {
    const odenecek = sayiyaCevir($('odenecek').value);
    const s = (sol, sag, sinif = '') => `<div class="s ${sinif}"><span>${sol}</span><span>${sag}</span></div>`;
    const simge = { STG: '£', USD: '$', EUR: '€', TL: '₺' };
    let html = '';

    html += '<div class="orta marka-fis">SOLİBET</div>';
    html += '<div class="orta">ÖDEME DÖKÜMÜ</div>';
    html += '<div class="orta kucuk">' + new Date().toLocaleString('tr-TR') + '</div>';
    html += '<div class="kalin-cizgi"></div>';
    html += s('ÖDENECEK', bicimle(odenecek) + ' ₺', 'buyuk');
    html += '<div class="cizgi"></div>';

    let toplam = 0;
    DOVIZLER.forEach((d) => {
      const miktar = sayiyaCevir($('miktar-' + d).value);
      if (!miktar) return;
      const kur = d === 'TL' ? 1 : sayiyaCevir($('kur-' + d).value);
      const tl = hesaplaTlKarsiligi(miktar, kur);
      toplam += tl;
      if (d === 'TL') {
        html += s('TL', bicimle(tl) + ' ₺');
        // Banknot dökümü varsa satır satır yaz
        if (banknotGirildiMi()) {
          const adetler = adetleriOku();
          Object.keys(adetler).map(Number).sort((a, b) => b - a).forEach((k) => {
            if (adetler[k]) html += s(`${adetler[k]} x ${k} ₺`, bicimle(k * adetler[k]), 'girinti kucuk');
          });
          const coins = sayiyaCevir($('coins').value);
          if (coins) html += s('Bozuk para', bicimle(coins), 'girinti kucuk');
        }
      } else {
        html += s(`${d} ${bicimle(miktar)} ${simge[d]}`, bicimle(tl) + ' ₺');
        html += s(`Kur: ${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(kur)}`, '', 'girinti kucuk');
      }
    });

    const kalan = hesaplaKalan(odenecek, toplam);
    html += '<div class="cizgi"></div>';
    html += s('TOPLAM ÖDENEN', bicimle(toplam) + ' ₺', 'buyuk');
    const durum = kalanDurumu(kalan);
    if (durum === 'eksik') html += s('KALAN', bicimle(kalan) + ' ₺');
    else if (durum === 'fazla') html += s('PARA ÜSTÜ', bicimle(-kalan) + ' ₺');
    else if (Math.abs(kalan) >= 0.005) html += s('Yuvarlama farkı', bicimle(kalan) + ' ₺', 'kucuk');
    html += '<div class="kalin-cizgi"></div>';
    html += '<div class="imza">Müşteri İmza</div>';
    html += '<div class="orta kucuk">Bizi tercih ettiğiniz için teşekkürler</div>';

    $('fis').innerHTML = html;
  }

  // Fiş, yazdırma anında ekrandaki değerlerden hazırlanır (menu.js beforeprint)
  window.odemeFisHazirla = fisHazirla;

  $('yazdir').addEventListener('click', () => {
    fisHazirla();
    window.print();
  });

  guncelle();

  // İnternetsiz çalışma için service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
