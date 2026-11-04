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

Na stole je zmenšený model Flicku a Pico s barevným propojením a kabelem za stůl. V úvodu plavou kuličky mezi monitory i po projekci. Přibližování prstu je stahuje k projekci, dotyk zapne poslouchání a po oddálení se znovu rozptýlí. Pohyb myši nad projekcí umožňuje náhled přitahování i bez senzoru.

Trasu a rychlost maskota lze měnit, animaci pozastavit. Při přenosu navazuje levá hrana monitoru na pravou a naopak. **Množení kuliček** přidává na monitorech kuličky podle blízkosti prstu, až téměř pokryjí plochu zelenou.

Při odhalení prací se kuličky na monitorech rychle smrští. Na projekci se během 0,95 sekundy stáhnou do původního těla maskota; obličej zůstává na místě. Po krátké přípravě maskot přelétá přes společné hrany k rohům skutečně zobrazených obrázků. Doba přeletu roste se vzdáleností, rozjezd i brzdění jsou plynulé. Sedm kuliček má různá zpoždění 75–230 ms a po přistání se během 280 ms spojí s tělem; sdílejí jeho neprůhlednou výplň a obrys. U obrázku se maskot zastaví, podívá se směrem dovnitř, mrkne a připraví se na další odlet. Po prvním odletu zůstává projekce prázdná. Rohy i pořadí se mění; společný čas a seed drží fyzické monitory a 3D náhled synchronizované. Jediný obrázek navštěvuje na různých rozích. Průběh je v `classroom/guide-renderer.js` (`createWorkTour`, `sampleWorkTour`).

Hover reset při Z ≤ 66 % nyní nejprve zastaví maskota, vykulí oči a lokálně přidá několik kuliček. Po nepřerušeném podržení 1,5 sekundy následuje rozprsknutí do všech obrazovek trvající 0,85 sekundy a návrat do stavu před spawnem. Předčasné oddálení obnoví původní přelet. Sdílené časování a průběh jsou v `mascot/reset-model.js`, rozpoznání a řízení gesta v `classroom/hover-reset.mjs`.

V místním 3D modelu otevře **Ovládání → Jak rozhodl Tev1** průvodce v překryvném okně rovnou s rozbaleným rozhodovacím panelem. Panel automaticky ukazuje skutečné výsledky požadavků z diktování a jejich skóre. Okno zavřeš křížkem nebo Esc; po opětovném otevření si zachová stav.

## Přiřazení obrazovek

Práce na monitorech, ve 3D i v přehledu animací používají výstavní rozložení z PR #3: velká fotografie bez ořezu, černé pozadí, Neue Machina a název, autor a rok dole vlevo; popis je vpravo ve dvou sloupcích. Známka se ve výstavním zobrazení nevypisuje. Sdílený Canvas renderer je `mascot/work-presentation.js`; původní samostatná stránka zůstává v `pruvodce/vystava.*`. Šipky, klávesy ←/→ a kolečko nad fotografií přepínají viditelné fotografie dané práce, včetně synchronizace s 3D. Kolečko nad spodními údaji posouvá dlouhý text. Čtenářský náhled jednoho monitoru je na `http://127.0.0.1:8000/?preview=1`; jeho navigace neovládá fyzické displeje.

**Čísla na obrazovkách** zapnou identifikaci. Rozmístění se ukládá lokálně do `classroom/layout.json`; soubor s identifikátory zařízení a adresami není součástí GitHubu ani publikovaného webu. Existující přiřazení uchovej při aktualizaci.

Stav serveru: GET http://127.0.0.1:8000/api/status. Lokální POST `/api/control` přijímá například `{"action":"mapping","mapping":{"1":3,"2":4}}`, kde klíč je identifikační číslo a hodnota pozice ve 3D schématu. Další příkazy jsou `play`, `pause`, `identify`, `speed`, `route`, `experiment` a `reload`. Řízení je povoleno pouze z tohoto počítače. Synchronizace používá společné hodiny WebSocket a přeskakuje nepřipojené monitory.

Macy jsou pozice 1, 2, 5, 8. PC jsou 3, 4, 6, 7, 9, 10, po dvojicích na spojených stolech. Mezi PC a Macy je ulička. Vpředu před PC jsou dvě prázdné desky, nad pravou je projektor. Rozměry jsou orientační podle nákresu a fotografií.

## Vývoj a nasazení

Přehled animací a podklady původního maskota jsou součástí repozitáře v `mascot-lab/`. Přehled spustíš z kořene příkazem `npm run animations` na http://127.0.0.1:8878/. Sdílené soubory jsou propojené relativními odkazy uvnitř repozitáře; k běhu nejsou potřeba vedlejší pracovní složky. `npm test` zahrnuje také testy přehledu a průvodce. Zdrojové AEP, referenční rendery a exportní nástroje jsou v `mascot-lab/`; místní Python prostředí, závislosti a instalační balíčky se do Gitu neukládají.

```sh
npm start
npm test
npm run build
```

Vývojový náhled je na http://127.0.0.1:5173/. `dist/` obsahuje samostatný statický web včetně Three.js a jeho licence MIT. Zdroj scény je `src/app.js`, projekce `src/projector.js`, rozhraní `index.html` a `src/style.css`. Sdílená animace monitorů je `classroom/timeline.js`, synchronizace `classroom/sync.js`, server `classroom/server.mjs`. USB bridge je `scripts/flick_bridge.py`.

Sdílené animace se po uložení JavaScriptu načtou automaticky přibližně do sekundy: `mascot/mascot-canvas.js` obsahuje oči a výraz přemýšlení (`thinkingExpression`), `mascot/spawn-renderer.js` shlukování a `classroom/guide-renderer.js` přemýšlení a odhalování prací. Živé úpravy fungují v místní 3D scéně, projekci, monitorech i knihovně http://127.0.0.1:8878/. Stránka se neobnovuje, takže zachová mikrofon, fullscreen i pozici a pauzu v knihovně. Při chybě zůstane poslední funkční renderer; po opravě a uložení se změna načte znovu. Knihovna zobrazuje stav načtení v horní liště. Nově přidané načítání vyžaduje jednorázové obnovení dříve otevřených stránek. Změny serveru a rozhraní nadále vyžadují restart nebo obnovení stránky; JSON podklady se načítají při otevření.

Veřejná HTTPS verze běží jako samostatný náhled, neotevírá řídicí WebSocket do lokální sítě. Flick lze zkusit připojit tlačítkem; pokud prohlížeč přístup k lokálnímu bridge nepovolí, otevři místní adresu 8765. Samotný push do GitHubu veřejný web neaktualizuje; publikuje se samostatně přes Sites.

## Průvodce studentskými pracemi

Samostatný průvodce včetně správy, slepého hodnocení a testeru rozhodování je v podsložce [`pruvodce/`](pruvodce/README.md); studentská data a obrázky nejsou součástí repozitáře.

### Hlasové příkazy v učebně

Na řídicím Macu otevři `http://127.0.0.1:8765/` a jednou klikni **Povolit mikrofon**. Přilož prst na destičku Flicku a drž ho tam při mluvení. Dotyk spustí nahrávání a zvednutí prstu nebo ztráta kontaktu ho ukončí podle skutečného bitu dotyku z Pica, nezávisle na 3D souřadnicích. Zachycená řeč se potom přepíše přes Whisper a Tev1 vybere odpovídající práci. Při držení prstu nahrávání neukončuje samotné ticho; zůstává bezpečnostní limit 20 sekund. Průvodce vrátí nejvýše 10 různých prací seřazených podle známky. Každý připojený a přiřazený počítač dostane jednu jinou práci; při menším počtu počítačů se zobrazí odpovídající část výsledků. Stejná přiřazení ukazuje 3D model. Připojení, odpojení nebo změna pozice počítače rozložení aktualizuje. Přepínač **Simulovat všechny počítače** umožňuje náhled až na deseti virtuálních monitorech. Další dotyky během přepisu a výběru aktuální požadavek nepřerušují. Bez Flicku použij **Mluvit teď**, které skončí po tichu, nebo **Zadat požadavek textem**. Server ukončí poslouchání i tehdy, když okno s mikrofonem přestane odpovídat.

Zvuk zpracovává místní `whisper-cli` přes FFmpeg; dočasná nahrávka se po přepisu smaže. Nahrává pouze jedno povolené řídicí okno. Po obnovení stránky znovu zapni mikrofon. Zpracování řeči a filtrování běží na řídicím počítači, monitory dostávají výsledek přes stávající WebSocket.

Je potřeba běžící Ollama s modelem `tev1:latest` nebo `tev1:4b`, FFmpeg, `whisper-cli` a vícejazyčný model **Whisper large-v3** ve formátu GGML (`ggml-large-v3.bin`). Zkopíruj `classroom/local-session.example.json` do `classroom/local-session.json` a nastav absolutní cesty. `dataDir` má stejnou strukturu jako `DOD_DATA_DIR` v dokumentaci průvodce. Místo souboru lze použít proměnné `DOD_DATA_DIR` a `DOD_WHISPER_MODEL`. Cesty k programům na jiném počítači nastav přes `DOD_FFMPEG` a `DOD_WHISPER`; výchozí jsou `/opt/homebrew/bin/ffmpeg` a `/opt/homebrew/bin/whisper-cli`. Lokální nastavení Git ignoruje, stejně jako přiřazení obrazovek.

Spouštěč učebny automaticky otevře místní službu průvodce na portu 18187. Diagnostika je na `http://127.0.0.1:8000/api/voice/status`. Starý katalog z Downloads spojuje web, UI a UX do jednoho tagu; pokud přesnější kategorie nenajde práci, použije se tato širší skupina a rozhraní to uvede.

Společný vzhled a procedurální pohyb jsou v `mascot/`. Stejný renderer používají obrazovky i 3D projekce; změna základního chování se tak promítá do obou. Pro publikování statického webu sestav `dist/` příkazem `npm run build`; místní úpravy animací sestavení ani restart nepotřebují.

Program Pica pro spolehlivé držení je v `firmware/`; vyžaduje oba soubory podle `firmware/README.md`. Starší program posílá pouze události a polohu a musí používat méně přesný odhad kontaktu.
