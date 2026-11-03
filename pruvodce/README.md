# Průvodce studentskými pracemi

Samostatná kopie průvodce obsahuje hlavní stránku, správu, slepé hodnocení a tester rozhodování; samotné práce, jejich obrázky, historické návrhy a uložená lidská hodnocení nejsou součástí repozitáře.

## Spuštění

Je potřeba Node.js 20+ a pro rozhodování místní Ollama se staženým modelem Tev1.

```sh
cd pruvodce
node server.mjs
```

Otevři `http://127.0.0.1:3000/`; pokud port už používá jiný server, nastav `PORT`, například v PowerShellu `$env:PORT=3017`.

Bez připojeného katalogu se aplikace spustí s prázdnou správou, takže lze používat rozhraní a testovat rozhodování, ale nelze zobrazovat ani upravovat studentské práce.

## Místní data prací

Chceš-li práce používat, nastav `DOD_DATA_DIR` na místní složku původního průvodce obsahující `prace/showcase-digital-komplet/metadata.json` a `prace/showcase-digital-komplet/obrazky/`, volitelně také `popisy-praci.json`, `asociace-praci.json`, `projekty-sjednocene.json` a `upravy-praci.json`.

```powershell
$env:DOD_DATA_DIR = 'C:\cesta\k\puvodnimu-pruvodci'
$env:PORT = 3017
node server.mjs
```

```sh
DOD_DATA_DIR=/cesta/k/puvodnimu-pruvodci PORT=3017 node server.mjs
```

Průvodce data čte přímo z této složky; úpravy ve správě zapisuje do jejího `upravy-praci.json` a předchozí stav do `zalohy-uprav/`, proto použij kopii podkladů, pokud nechceš měnit původní úpravy.

Slepé hodnocení načte historické syntetické výsledky z připojené složky `DOD_DATA_DIR`, pokud tam jsou; bez nich je hodnocení uložených případů prázdné, ale vlastní věty lze zadávat; záznamy `lidska-hodnoceni.jsonl` a `opravy-rozhodnuti.jsonl` zůstávají lokální a Git je ignoruje.

- `/` — průvodce a jeho manažer.
- `/admin` — správa připojených prací.
- `/slepe-hodnoceni` — slepé hodnocení a vlastní věty.
- `/tester-rozhodovani` — rozklad požadavku do kroků stejným API.
- `/test-tagu` — test navrhování tagů pracím.

Server je určen pouze pro lokální počítač a sdílí model Ollama; tester používá stejná pravidla a stejný požadavek `/api/classify` jako hlavní stránka.

## Ověření

Integrační test bez přístupu k Ollamě spustíš příkazem `node --test pruvodce/server.test.mjs` z kořene repozitáře.
