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

Slepé hodnocení načte historické syntetické výsledky z připojené složky `DOD_DATA_DIR`, pokud tam jsou; bez nich je hodnocení uložených případů prázdné, ale vlastní věty lze zadávat. Nová lidská hodnocení se ukládají do `lidska-hodnoceni.jsonl` a nové opravy tagů do `opravy-rozhodnuti-nove.jsonl` v připojené složce `DOD_DATA_DIR` (bez ní do místní složky průvodce). Historický `opravy-rozhodnuti.jsonl` zůstává beze změny. Lokální záznamy Git ignoruje.

Místní spouštěč používá pro aktuální sběr nový soubor podle [postupu ukládání oprav](dokumentace/model-a-testovani/Reinforcement.md).

- `/` — průvodce a jeho manažer.
- `/vystava` — samostatná obrazovka jedné práce, jejíž ovládání a zdroje popisuje část [Výstavní obrazovka](#výstavní-obrazovka).
- `/admin` — správa připojených prací.
- `/slepe-hodnoceni` — slepé hodnocení a vlastní věty.
- `/tester-rozhodovani` — rozklad požadavku do kroků stejným API.
- `/test-tagu` — test navrhování tagů pracím.

Server je určen pouze pro lokální počítač a sdílí model Ollama; tester používá stejná pravidla a stejný požadavek `/api/classify` jako hlavní stránka.

## Výstavní obrazovka

- Po spuštění pracovní kopie otevři `http://127.0.0.1:3017/vystava`.
- Bez ID se zobrazí první práce z katalogu s alespoň jednou viditelnou fotografií; neznámé ID má stejný výsledek.
- Konkrétní práci otevře parametr `?id=ID_PRÁCE`.
- Obrazovka je samostatná: aktuální výběr z hlavního průvodce se do ní zatím automaticky nepředává.
- Název, autor, rok, popis a galerie pocházejí z připojeného katalogu `/api/projects`, který propojuje původní metadata s popisy a ručními úpravami podle místních zdrojů dat.
- Zobrazené fotografie respektují skrytí nastavené ve správě a server je poskytuje z připojené datové složky přes `/media/`.
- Fotografie se zobrazí až po načtení a bez ořezu; při chybě načtení obrazovka zobrazí upozornění.
- Mezi fotografiemi lze přecházet bočními tlačítky, šipkami na klávesnici nebo kolečkem myši a touchpadem nad fotografií; po poslední následuje první a automatické přepínání je vypnuté.
- Název, autor a rok jsou dole vlevo a popis se na širší obrazovce dělí do dvou sloupců; dlouhý obsah je možné posouvat v textovém bloku.
- Rozložení a ovládání tvoří `vystava.html`, `vystava.css` a `vystava.js`; zelené přepínače jsou vykresleny v CSS podle dodaného `vystava-dot.png`.
- Výstava používá přiložené písmo Neue Machina.

## Ověření

Integrační test bez přístupu k Ollamě spustíš příkazem `node --test pruvodce/server.test.mjs` z kořene repozitáře.

## Dokumentace

Dokumentace popisuje tagy, zadání modelu a ukládání oprav.

## Aktivní pracovní verze

Tato Git kopie je určená pro další úpravy průvodce a na tomto počítači se spouští souborem `spustit-lokalne.cmd` na adrese `http://127.0.0.1:3017/`.

Spouštěč automaticky použije původní datovou složku `26/`, pokud ji najde vedle této Git kopie, jinak je možné nastavit `DOD_DATA_DIR` ručně; úpravy práce ve správě zapisují do připojené datové složky.

Původní server na portu 3000 je označen jako stará verze a zůstává zdrojem dat; pracovní pravidla platí pro místní kopii.
