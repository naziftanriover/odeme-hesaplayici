// =====================================================================
// Klavye ile gezinme
//   Enter        → bir sonraki kutu (son kutudan sonra "Fiş Yazdır" düğmesi)
//   Shift+Enter  → bir önceki kutu
//   ↓ / ↑        → alttaki / üstteki kutu (aynı sütunda)
//   → / ←        → yazının sonundaysa sağdaki, başındaysa soldaki kutu
// Enter/ok ile kutuya geçince içindeki yazı seçilir; yeni rakam eskisinin üstüne yazılır.
// =====================================================================
(function () {
  // Açık olan ekrandaki, görünür kutular (sayfadaki sırasıyla)
  function kutular() {
    const ekran = document.querySelector('.gorunum:not([hidden])');
    if (!ekran) return [];
    // Kapalı bölümlerin (TL banknot, Bonus) içindeki kutular atlanır
    return [...ekran.querySelectorAll('input, select')].filter((el) =>
      !el.disabled && !el.closest('details:not([open])') && el.getClientRects().length > 0);
  }

  function odakla(el) {
    if (!el) return;
    el.focus();
    if (el.tagName === 'INPUT' && typeof el.select === 'function') el.select();
  }

  // Ekranda hemen altta/üstte, yatayda en yakın kutuyu bulur
  function dikeyKomsu(el, yon) {
    const r = el.getBoundingClientRect();
    const ortaX = r.left + r.width / 2;
    let enIyi = null, enIyiPuan = Infinity;
    for (const k of kutular()) {
      if (k === el) continue;
      const kr = k.getBoundingClientRect();
      const dy = yon > 0 ? kr.top - r.bottom : r.top - kr.bottom;
      if (dy < -2) continue; // yanlış yönde
      const dx = Math.abs(kr.left + kr.width / 2 - ortaX);
      const puan = dy * 3 + dx; // önce satır yakınlığı, sonra sütun
      if (puan < enIyiPuan) { enIyiPuan = puan; enIyi = k; }
    }
    return enIyi;
  }

  // Yazının tamamı seçiliyse (kutuya yeni geçilmişse) ok tuşu hemen kutu değiştirir
  function hepsiSecili(el) {
    return el.selectionStart === 0 && el.selectionEnd === el.value.length;
  }
  function yazininBasinda(el) {
    try { return el.tagName !== 'INPUT' || hepsiSecili(el) || (el.selectionStart === 0 && el.selectionEnd === 0); } catch { return true; }
  }
  function yazininSonunda(el) {
    try { return el.tagName !== 'INPUT' || hepsiSecili(el) || el.selectionStart === el.value.length; } catch { return true; }
  }

  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement) || !el.matches('.gorunum input, .gorunum select')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const liste = kutular();
    const i = liste.indexOf(el);
    if (i < 0) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) return odakla(liste[i - 1]);
      if (liste[i + 1]) return odakla(liste[i + 1]);
      // Son kutudan sonra ana düğmeye (Fiş Yazdır) geç
      const dugme = el.closest('.gorunum').querySelector('.yazdir');
      if (dugme) dugme.focus();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const hedef = dikeyKomsu(el, e.key === 'ArrowDown' ? 1 : -1);
      if (hedef) { e.preventDefault(); odakla(hedef); }
      return;
    }
    if (e.key === 'ArrowRight' && yazininSonunda(el) && liste[i + 1]) {
      e.preventDefault(); odakla(liste[i + 1]);
      return;
    }
    if (e.key === 'ArrowLeft' && yazininBasinda(el) && liste[i - 1]) {
      e.preventDefault(); odakla(liste[i - 1]);
    }
  });
})();
