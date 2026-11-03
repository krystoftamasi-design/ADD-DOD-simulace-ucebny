# Simulace učebny pro DOD

3D schéma učebny, živá projekce na stůl a synchronizovaná animace maskota na skutečných obrazovkách.

**Veřejný náhled:** https://ucebna-dod-simulator.noobest.chatgpt.site

## Spuštění celé učebny

Na řídicím Macu je potřeba Node.js 22+ a Python 3. Při prvním spuštění nainstaluj závislosti:

```sh
npm ci
npm run build
npm run classroom
```

Příště stačí dvojklik na **Spustit učebnu.command**. Okno Terminálu nech otevřené; Ctrl+C ukončí servery, které spouštěč sám nastartoval. Již běžící servery znovu nespouští.

- Řídicí 3D scéna: http://127.0.0.1:8765/
- Obrazovky v téže síti: http://dod.local:8000/ nebo číselná adresa vypsaná při spuštění.
- Adresa sítě se zjišťuje při startu. Volitelně ji lze určit přes DOD_ADDRESS; po změně sítě spouštěč restartuj.
- Připoj Pico s Flickem přes USB. Bridge zpracovává jeho existující JSON zprávy a nemění firmware. Bez USB běží náhled dál; po připojení se senzor automaticky najde.
- Na starých Macích se zobrazuje pouze lehká animace Canvas 2D bez WebGL. 3D scéna běží na řídicím Macu.

## Ovládání a projekce

Ovládání je ve výsuvném okně. Tažením otáčej kamerou, kolečkem přibližuj. Přepínat lze pohled návštěvníka, nadhled a detail projekčního stolu. Kliknutí na promítanou plochu nebo **Zvětšit projekci** otevře rovný živý náhled přes celé okno. Zpět se vrátíš přes Esc nebo ×.

Na stole je zmenšený model Flicku a Pico s barevným propojením a kabelem za stůl. Přibližování prstu přitahuje kuličky v projekci. Dotyk zapne stav „Naslouchám“; po oddálení prstu se za 0,6 sekundy vypne. Jde o vizuální simulaci mikrofonu, zvuk se nenahrává. Pohyb myši nad projekcí umožňuje náhled přitahování i bez senzoru.

Trasu a rychlost maskota lze měnit, animaci pozastavit. Při přenosu navazuje levá hrana monitoru na pravou a naopak. **Množení kuliček** přidává na monitorech kuličky podle blízkosti prstu, až téměř pokryjí plochu zelenou.

## Přiřazení obrazovek

**Čísla na obrazovkách** zapnou identifikaci. Rozmístění se ukládá lokálně do `classroom/layout.json`; soubor s identifikátory zařízení a adresami není součástí GitHubu ani publikovaného webu. Existující přiřazení uchovej při aktualizaci.

Stav serveru: GET http://127.0.0.1:8000/api/status. Lokální POST `/api/control` přijímá například `{"action":"mapping","mapping":{"1":3,"2":4}}`, kde klíč je identifikační číslo a hodnota pozice ve 3D schématu. Další příkazy jsou `play`, `pause`, `identify`, `speed`, `route`, `experiment` a `reload`. Řízení je povoleno pouze z tohoto počítače. Synchronizace používá společné hodiny WebSocket a přeskakuje nepřipojené monitory.

Macy jsou pozice 1, 2, 5, 8. PC jsou 3, 4, 6, 7, 9, 10, po dvojicích na spojených stolech. Mezi PC a Macy je ulička. Vpředu před PC jsou dvě prázdné desky, nad pravou je projektor. Rozměry jsou orientační podle nákresu a fotografií.

## Vývoj a nasazení

```sh
npm start
npm test
npm run build
```

Vývojový náhled je na http://127.0.0.1:5173/. `dist/` obsahuje samostatný statický web včetně Three.js a jeho licence MIT. Zdroj scény je `src/app.js`, projekce `src/projector.js`, rozhraní `index.html` a `src/style.css`. Sdílená animace monitorů je `classroom/timeline.js`, synchronizace `classroom/sync.js`, server `classroom/server.mjs`. USB bridge je `scripts/flick_bridge.py`.

Veřejná HTTPS verze běží jako samostatný náhled, neotevírá řídicí WebSocket do lokální sítě. Flick lze zkusit připojit tlačítkem; pokud prohlížeč přístup k lokálnímu bridge nepovolí, otevři místní adresu 8765. Samotný push do GitHubu veřejný web neaktualizuje; publikuje se samostatně přes Sites.

## Průvodce studentskými pracemi

Samostatný průvodce včetně správy, slepého hodnocení a testeru rozhodování je v podsložce [`pruvodce/`](pruvodce/README.md); studentská data a obrázky nejsou součástí repozitáře.
