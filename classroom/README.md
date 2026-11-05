# Obrazovky učebny

Z kořene projektu spusť `npm run classroom`; společně spustí USB bridge na 8765 a síťový server na 8000. Samostatně lze použít `DOD_ANIMATE=1 DOD_PROXIMITY=1 node classroom/server.mjs`.

Obrazovky používají http://dod.local:8000/ nebo IP vypsanou serverem. 3D řídicí schéma je na http://127.0.0.1:8765/. Canvas 2D funguje i na starších Macích. Sdílený timeline a hodiny přes WebSocket udržují přenos maskota mezi odpovídajícími hranami.

Klávesa **B** v místní knihovně animací, 3D nebo projekci zapíná a vypíná editor textů projekce. Rámeček přetáhni myší, velikost změň za pravý dolní roh nebo posuvníkem. Našeptávání a „Poslouchám“ mají nezávislé nastavení. Po dokončení tažení se uloží do lokálního `classroom/projection-text.json` a přes společný stav se projeví na připojených stránkách. Editor během psaní do textového pole klávesu B nepřebírá. Nastavení platí i po restartu; „Výchozí umístění“ obnoví menší výchozí našeptávání.

Pod mikrofonem jsou mini tlačítka pro ruční ukázky: bublinky, spawn, poslech bez nahrávání, přepis, přemýšlení, nepochopení, chyba, jedna práce, kategorie, náhodné práce a plovoucí maskot. Ukázky sdílejí stav s připojenými displeji; 3D při nich dočasně ukáže i nepřipojené monitory. Práce se losují ze skutečného katalogu bez volání Tev1, skryté obrázky se nepoužijí. Tlačítko ↻ Flick vrátí ovládání destičce. Stav ukázky přetrvá do další volby, zatímco odhalení prací používá běžné čekání na načtení obrázků a společný čas.

Přiřazení monitorů je v lokálním `layout.json` (ignorovaném Gitem). Režim čísel a množení podle Flicku se ovládá v panelu 3D schématu. Příkazy POST /api/control smí posílat jen tento počítač. `{"action":"reload"}` obnoví připojené stránky. Přiblížení prstu řídí 0–192 kuliček, po ztrátě polohy efekt během 350 ms ustoupí.

Testy jsou součástí `npm test`. Pro náhled zobrazovací stránky bez registrace dalšího fyzického monitoru použij `/?preview=1`.

Shlukování podle prstu používá společné tlumené dotahování z `mascot/spawn-model.js`. Nový cíl zachová aktuální polohu i rychlost, takže rychlé změny XYZ znovu nerozjíždějí pohyb z nuly. `spawnSettings.followResponseMs` je časová konstanta 80 ms (přibližně 95 % změny za 380 ms). Výpočet vychází ze sdíleného času a funguje shodně při různých FPS; dotyk a uvolnění mikrofonu se nefiltrují. Stejný model používá ruční posuvník v knihovně animací.

Živé úpravy animací kontrolují každých 750 ms pouze malý identifikátor `/api/animation-version`. Soubory rendererů a jejich závislostí se stáhnou znovu až po změně; čas animace, vykreslování, mikrofon i WebSocket spojení zůstávají při úpravě zachované. Na statickém serveru bez tohoto endpointu funguje původní kontrola souborů. Síťový server na 8000 navíc pro soubory a obrázky používá ETag s povinným ověřením aktuálnosti: opakovaný nezměněný obsah vrátí 304 bez těla. Obrázky se nezmenšují ani znovu nekomprimují, dynamické API a údaje Flicku zůstávají bez cache.

## Více prací

Výstavní vzhled vychází z `pruvodce/vystava.css` z PR #3. Obrázek vyplní prostor nad spodními údaji bez ořezu; název, autor a rok používají Neue Machina, popis je ve dvou sloupcích. Canvas renderer `mascot/work-presentation.js` sdílí monitory, 3D i knihovna animací. Přepnutí fotografie šipkami, klávesnicí nebo kolečkem nad obrázkem posílá `work-image`; server přijímá změnu jen pro přiřazený monitor v aktuální prezentaci. `guide.imageIndices` drží volbu podle stanice i ID práce. Náhled `?preview=1` zůstává oddělený a nezapisuje do stavu fyzických monitorů. Dlouhé texty lze posouvat kolečkem nad spodním blokem.

Stav `guide.projects` obsahuje až 10 různých prací a `guide.assignments` jejich aktuální přiřazení `{station, project}`. Rozložení bere všechny připojené přiřazené displeje bez ohledu na zvolenou trasu maskota. Jedna práce se v daném rozložení neopakuje. 3D model i fyzické displeje používají stejný renderer a serverová přiřazení.

Podržení ruky bez dotyku při Z ≤ 66 % zastaví maskota na místě. Během odpočtu 1,5 sekundy vykulí oči a lehce bobtná pouze jeho tělo. Při předčasném oddálení nebo dotyku se odpočet zruší a přelet pokračuje z pozastaveného času. Po dosažení limitu se maskot za 0,85 sekundy rozprskne do všech monitorů; práce se skryjí a kuličky plynule navážou na výchozí volné bublinky. Dokud ruka zůstává nad destičkou, znovu se neshromažďují; oddálení nad 72 %, odstranění ruky nebo nový dotyk gesto uvolní. Během nahrávání se hover reset nespustí. Funguje také při ukázce zobrazených prací.

Tvar složeného maskota používá `mascot/native-body.json`: oddělené vektorové masky siluety a zelené výplně ze 163 původních nativních AE renderů. Přehrávají se tam a zpět, aby konec zdrojového úseku neskákal na začátek. Při shromažďování se volné kuličky plynule spojí s původním tělem; oči a společné průchody obrysu a výplně zůstávají samostatné. Data lze obnovit příkazem `mascot-lab/.venv/bin/python scripts/build-native-body.py mascot-lab/exports/motion/body`.

Na adrese `/projector` stiskni klávesu **B** a přetáhni čtyři body do rohů promítané plochy. Opětovným stiskem **B** ovládání skryješ. **Hotovo** body skryje, **Obnovit** vrátí původní obdélník. Nastavení zůstává uložené v daném prohlížeči i po obnovení stránky.
