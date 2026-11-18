# TriBee дүрийг Намсан тоглоомд оруулах

Тоглоом (`/namsan`) гишүүний TriBee профайл дээрх дүрийг хоёр аргаар хүлээн авна. Дүр нь TriBee-ийн каталогоор (`tribee-buddy.js`-ийн `OPT`) яг адилхан зурагдана.

## 1. Холбоосоор (хамгийн энгийн)
TriBee-ийн профайл хуудсанд "Сөүл 3D-д тоглох" товч нэмнэ:

```js
// TriBee тал: tribee-buddy.js ачаалагдсаны дараа
const GAME = 'https://<тоглоомын-хаяг>/namsan';
function playSeoul() {
  const s = window.TribeeBuddy.state;
  const data = { look: s.look, name: s.name || '', energy: s.energy };
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  window.open(GAME + '#tribee=' + b64, '_blank');
}
```

## 2. iframe-ээр (TriBee дотор тоглох)
```html
<iframe id="seoul" src="https://<тоглоомын-хаяг>/namsan" allow="microphone; autoplay" style="width:100%;height:80vh;border:0"></iframe>
<script>
addEventListener('message', e => {
  if (e.data && e.data.type === 'seoul3d-ready') {
    const s = window.TribeeBuddy.state;
    e.source.postMessage({ type: 'tribee-buddy', look: s.look, name: s.name || '', energy: s.energy }, e.origin);
  }
});
</script>
```
Тоглоом зөвхөн `tribee.pages.dev`, `tribee.ub.mn` эх сурвалжаас ирсэн мессежийг хүлээн авна.
