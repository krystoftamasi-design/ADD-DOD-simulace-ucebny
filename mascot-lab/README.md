# Maskot — podklady z originálního After Effects projektu

Zdroj: `digimon_file.aep`, stažený 2. 11. 2026. Originál v Downloads nebyl přepsán. Pracovní kopie je v `source/`.

## Náhled

Z kořene repozitáře použij `npm run animations`. Následující příkaz spouštěj ze složky `mascot-lab/`; původní pracovní cesta na tomto Macu může být zachovaná jako odkaz.

```sh
python3 -m http.server 8878 --bind 127.0.0.1 --directory web
```

Otevřít http://127.0.0.1:8878/. Úvodní stránka je knihovna devíti aktuálních animací ve třech kategoriích: přechody, interakce s návštěvníkem a zobrazení prací. Karty mají přehrání od začátku a zvětšení s pauzou a posuvníkem času. Kategorie lze filtrovat a tempo náhledů zpomalit. Práce jsou označené ukázkové SVG grafiky; vykresluje je stejný průvodce jako v učebně. Knihovna respektuje systémové omezení pohybu a vykresluje viditelné karty nejvýše 30× za sekundu.

Katalog a scénář vstupních stavů jsou v `web/animation-scenes.js`; rozmístění náhledů kreslí `web/gallery-renderer.js`. Symlinky `room-timeline.js`, `guide-renderer.js`, `spawn-renderer.js` a `mascot-canvas.js` přímo sdílejí vykreslování s kořenem tohoto repozitáře. Přehled načítá také původní siluetu z `web/assets/native-body.json`. Přelety tak používají skutečné předávání na hranách a popcorn, obrysy, oči i rychlé smrštění mají stejný průběh jako simulace. Ukázky běží z připravených stavů bez připojení k živému serveru a neovládají monitory ani mikrofon. Hover reset ukazuje skutečný práh 1,5 sekundy. Starší návrhy nepochopení a odletu z projekce byly z aktuálního přehledu odstraněny.

Po uložení těchto JavaScriptových souborů se renderery automaticky vymění přibližně do sekundy bez obnovení stránky. Zvětšený náhled si zachová čas i pauzu, takže lze ladit konkrétní okamžik animace. Horní lišta ukáže „Uloženo“; při chybě ponechá poslední funkční verzi a vypíše důvod. Oči po přemýšlení se upravují v `../mascot/mascot-canvas.js`, ve funkci `thinkingExpression`. Stejnou změnu převezme běžící místní 3D scéna a projektor. JSON podklady a samotné rozhraní vyžadují obnovení stránky.

Odhalení zachovává maskota na projekci: kuličky se během 0,95 s stáhnou do původního těla a po krátké přípravě maskot odletí k první práci. U prací navštěvuje různé rohy skutečné plochy obrázku, včetně portrétních formátů. Zastaví se, podívá se, mrkne a připraví se na další přelet přes navazující hrany. Doba letu roste se vzdáleností a sedm kuliček se různě opožďuje; po dosednutí se měkce spojí s tělem. Projekce zůstává po odletu prázdná. Náhled jedné práce má 14 s a více prací 24 s, aby bylo vidět několik návštěv. Trasu, rozjezd i zastávky sdílí přes `guide-renderer.js` se simulací a skutečnými monitory.

Hover reset nyní ukazuje celý průběh: zmrazení přeletu, vykulené oči a malé lokální bobtnání po dobu 1,5 sekundy, pak 0,85 sekundy rozprsknutí a volné kuličky. Model `reset-model.js` je sdílený se simulací i fyzickými displeji. Při skutečném gestu předčasné oddálení obnoví pozastavený pohyb.

Obě zvětšené ukázky přeletů zobrazují současný pohyb mezi pracemi: rozjezd, opožděné kuličky a dosednutí u rohu s pohledem a mrknutím. Časový výřez vychází přímo z `createWorkTour`, včetně délky letu a zastávky. Hover reset přebírá odpočet i délku rozprsknutí z `resetTimings`, takže se časování při úpravách nerozejde.

Původní porovnání zůstává na http://127.0.0.1:8878/comparison.html. Jeho pravá strana je procedurální: 42 samostatných elips s průběžně počítanou polohou, měřítkem a natočením. Vlevo se opakuje původní ukázka z AE. Porovnání používá lokálně uložený GSAP; nepotřebuje CDN ani účet. Následující ovladače patří tomuto porovnání:

- „Živost“ řídí amplitudu posunu, změny velikosti a natočení. Hodnota 0 zobrazí klidovou mřížku původních repeaterů.
- „Jiná varianta“ změní seed s přechodem 0,65 s při rychlosti 1×, bez skoku do nové pózy.
- „Rychlost“ mění rychlost průběžného času. Pauza ho zastaví; „Od začátku“ vrátí čas na nulu při zachování vybrané varianty.
- „Původní fáze AE“ přepne pravou stranu na dřívější napečený export pro porovnání. V tomto režimu je dostupný posuvník zdrojových snímků.
- Oči zachovávají původní geometrie a obdélníkové zavření. Procedurální režim mrká s nepravidelným rozestupem 3–9 s a přidává jemný pohyb pohledu.
- „Následovat kurzor“ je výchozí zapnuté: celý maskot vpravo včetně očí plynule následuje kurzor v černé ploše. U okrajů se omezí posun podle konzervativního obrysu při maximální živosti. Po opuštění plochy se vrátí na klidové místo a obnoví volný pohled. Funguje i při pozastaveném pohybu kuliček.

## Jak se počítají kuličky

`web/procedural-body.js` obsahuje samostatný model:

1. `circleLayout(body)` sestaví 6 × 7 pozic přímo z původních repeaterů, včetně offsetů a šikmých kroků.
2. `sampleCircle(circle, seconds, wiggle, seed, strength)` vrací polohu, dvě měřítka a rotaci jedné kuličky. Používá čas, nikoli pořadí zobrazených snímků.
3. `noise(time, seed)` je jednorozměrný gradientní šum s hladkou interpolací mezi náhodnými gradienty. Na hranici buňky nemá skok v poloze ani rychlosti. Každá kulička a každý parametr mají vlastní náhodný kanál a fázový posun.
4. `createProceduralBody(...)` vytvoří 42 SVG elips a průběžně mění jejich transformace. Nejdřív se vykreslí všechny bílé obrysy, pak všechny zelené výplně, aby uvnitř překryvů nevznikaly bílé prstence.

Zachovává se průměr 75 px, bílý tah 8 px před měřítkem vrstvy, měřítko vrstvy 134 %, původní souřadnice, barva #CDDC29 a rozsahy odvozené z Wiggle Transform. Frekvence vychází z 2 změn/s s malou nezávislou odchylkou tempa jednotlivých kuliček. Interní generátor AE nereimplementujeme přesně; cílem je stejný vzhled a charakter s novými průběhy.

Stejný seed a stejný čas vracejí stejné polohy nezávisle na FPS nebo pořadí vyhodnocení. Pro budoucí synchronizaci stačí přivést stejný čas a seed. Současný porovnávací náhled zatím používá místní čas prohlížeče.

## Důležité soubory

- `web/assets/mascot-base.svg`: použitelný vektorový podklad s pojmenovanými skupinami `body`, `eyes`, `left-eye`, `right-eye` a samostatnými zorničkami. Tělo je obkreslené z nativního renderu, není to původní procedurální geometrie.
- `web/procedural-body.js`: aktuální procedurální tělo; všechny kuličky jsou samostatně řiditelné a mají stabilní ID.
- `web/motion-player.js`: průběžný čas, ovládání náhledu, reference a oči. GSAP ticker pohání čas; GSAP tweeny zajišťují změnu živosti a ovládání pohledu.
- `web/cursor-follow.js`: obálka těla a omezení posunu na viditelnou černou plochu. Pro přesné sledování se kurzor převádí přes inverzní SVG matici, včetně volných okrajů při rozdílném poměru stran. Posouvá se společná skupina `mascot-actor`; levá reference má vlastní SVG mimo ni.
- `web/assets/mascot.json`: přehled barev, proporcí, opakování kruhů, parametrů Wiggle Transform, očí, časování mrknutí a původních pohledových klíčových snímků.
- `web/assets/motion.json`: 163 SVG fází těla odvozených z nativního renderu a původní vektorové oči v jednotlivých okamžicích. Obrysy mohou mít drobnou odchylku na antialiasovaných okrajích, čas a fáze pohybu jsou převzaté.
- `web/assets/reference/`: pro porovnání oříznuté referenční snímky s průhledností v polovičním rozlišení. Plné nativní PNG zůstávají v `exports/motion/reference/`. Předehřátá reference spotřebuje přibližně 61 MiB obrazové paměti; je to součást porovnávacího nástroje, nikoli nutný druhý přehrávač pro nasazení maskota.
- `exports/ae-project.json`: kompletní nativní extrakce dostupných vlastností všech 24 vrstev obou kompozic, včetně klíčových snímků, náběhů a prostorových tečen. Export proběhl bez zaznamenané chyby.
- `exports/aep-original.json`: nezávislá extrakce původního binárního souboru pomocí py-aep, včetně zapnutí/vypnutí skupin a kontrolního součtu originálu.
- `exports/*.png`: 18 nativních referenčních snímků obou kompozic.
- `exports/body/*.png`: 23 nativních snímků samotného těla, na průhledném pozadí.
- `exports/motion/body/` a `exports/motion/reference/`: dva úplné nativní exporty po 163 snímcích z oficiálního `aerender`, 1080 × 1350, 30 fps, PNG 8 bitů RGB + Alpha, Straight. Referenční snímek 21 i samostatné tělo byly porovnány s původním exportem v čase 0,7 s.
- `prepare-render-samples.py`, `pack-reference.py`, `build-motion.py`: sběr nativních výstupů, kompaktní reference a převod těla do vektorových fází. Pozice očí jsou interpolované z původního AEP pomocí py-aep. Obdélníky i alpha mattes vycházejí z původních vrstev.
- `extract-aep.py`, `extract-mascot.jsx`, `export-body.jsx`: reprodukovatelné extrakční skripty. Nativní skripty se spouštějí přes File → Scripts → Run Script File. Export těla používá dočasnou duplikovanou kompozici a vždy ji odstraní, originální vrstvy nemění.

## Zjištěné charakteristiky

Obě kompozice mají 1080 × 1350 px, 30 fps a délku 150 s. Pracovní úsek je pouze 163 snímků, tedy 5,433 s. Délka kompozice není délkou hotové animované smyčky.

- `bez_mrkani`: 6 vrstev. `s_mrkanim`: 18 vrstev.
- Aktivní tělo: `Shape Layer 12`. Skrytá alternativní varianta: `Shape Layer 1`; její jiná barva a nastavení se nemají zaměnit za aktuální design.
- Barva aktivního těla: RGB 205, 220, 41, tedy **#CDDC29**. Kontura bílá, zorničky černé.
- Základní kruh: 75 × 75 px. Kontura: 8 px před měřítkem vrstvy. Vrstva těla má měřítko 134 %, kontura je tedy v kompozici přibližně 10,72 px.
- Dva repeatery: 6 kopií s krokem [54, 10], 7 kopií s krokem [-11, 40], oba s offsetem −2. Výsledkem je 42 instancí kruhu.
- Wiggle Transform: 2 změny/s, korelace 0 %, seed 0, posun [38, −35], měřítko [−15, −15] %, rotace 106°. Jde o procedurální limity AE; nelze je bez převodu považovat za parametry sinusovky se shodným výsledkem.
- Středy očí: levé [449,925; 639,884], pravé [643,872; 639,884]. Bílé oko má průměr 90,86 px po měřítku rodiče. Zorničky jsou velké kruhy ořezané pomocí alfa matte, nikoli malé černé tečky.
- Mrknutí začíná snímkem 48 (1,6 s), krátké otevření je na 51, opětovné zavření na 53 a otevření na 56. Celý úsek má 8 snímků, přibližně 267 ms. Web přepíná stejné fáze. Zavřené oko je původní černý obdélník 94,815 × 17,383 px, nikoli splácnutá bílá elipsa.
- Původní pohledy obsahují animované pozice zorniček včetně prostorových tečen a vlastního časování. Jsou zachovány v JSON a přehrávány v náhledu. Ovládání kurzorem je navíc.

## Bodymovin 5.12.1

Stažený balík obsahuje Bodymovin. Jeho `jsx/helpers/shapeTypeResolver.jsx` podporuje elipsy, výplně, tahy a repeatery, ale nemá mapování pro `ADBE Vector Filter - Wiggler`. Aktivní tělo tento filtr používá, takže přímý export do Lottie/HTML by jej nemohl věrně reprodukovat. Plugin nebyl instalován do systému. SVG náhled nepoužívá jeho runtime.

Kvůli nativnímu exportu bylo se souhlasem uživatele dočasně zapnuto „Allow Scripts to Write Files and Access Network“. Po dokončení bylo v UI ověřeno vypnutí a nastavení potvrzeno.

Úplný následný export pohybu už proběhl přes oficiální `aerender` bez ovládání editoru a bez opětovného povolování skriptů. Pracoval s kopiemi v `/private/tmp/dod-mascot-render/`; původní soubor ani otevřený projekt neměnil. Pro tělo byla zapsána oddělená kopie `source/body-only.aep` se skrytými očními vrstvami. PNG šablona této instalace má název `_HIDDEN X-Factor 8`. Rozsah exportu je `-s 0 -e 162`. Při nové konverzi se nejdřív spustí `prepare-render-samples.py`, poté `pack-reference.py` a nakonec `build-motion.py`.

## Další práce kódem a ověření

Každá kulička už má vlastní polohu a transformaci. Nad základním šumem lze přidat cílené pohyby, například rozestoupení, ukazování nebo odlet konkrétní kuličky. Původní parametry zůstávají v JSON; nové chování je v čitelném JavaScriptu.

`npm test` ověřuje rozložení, návaznost hodnot a rychlosti na hranicích šumu, omezený rozsah i po dlouhé době, nezávislost na FPS, odlišnost po původních délkách klipů, nulovou živost a návaznost při změně varianty včetně opakovaného přepnutí během přechodu.

Orientační porovnání seed 0 v prvních 163 časových vzorcích: původní tělo má průměrnou šířku 581,5 px, výšku 524,2 px a plochu 206 564 px. Procedurální model má přibližně 571,1 px, 503,6 px a 207 536 px. Měření procedurálního obrysu používá rasterizaci polygonů, nikoli shodný antialiasing AE. Jde o kontrolu měřítka a plnosti těla, ne důkaz shodného pohybu.

Současný náhled je samostatný podklad. Zapojení do simulátoru a synchronizace mezi počítači zatím není jeho součástí.

## Závislosti a reprodukce

Python: `py-aep==0.18.2`, `vtracer==0.6.15`, `Pillow==11.3.0`. GSAP verze je pevně uložena v package-lock.json a jeho distribuovaný soubor ponechává licenční hlavičku. Použití se řídí GSAP Standard License: https://gsap.com/standard-license/.

`build-web-assets.py` skládá podklad z `web/assets/body.svg` a číselné geometrie očí z originálního AEP. Obkreslení samotného těla bylo vytvořeno pomocí vtracer z `exports/body/body-700.png`; není vydáváno za přesný přenos editovatelných AE tvarů.
