# Aktuální tagy a známky

Dokumentace ověřena podle `categories.json`, `pravidla-vyberu-tagu.json`, `server.mjs` a `catalog.mjs` dne 3. listopadu 2026.

## Podporované požadavky návštěvníka

- Kategorické tagy níže označuje zaměření práce a lze vybrat nejvýše dva.
- „Nejlepší“ (`quality: best`) vybírá práce sestupně od A+ a A přes B, C, D a E až po F, dokud nenaplní počet výsledků; zahrnuje také formulace nejkvalitnější, top a nejpovedenější.
- „Nejhorší“ (`quality: worst`) hledá známky v pořadí F, E, D, C, B, A a A+ a zahrnuje také formulace nejméně povedené a propadlé.
- Školní nebo kalendářní rok funguje jako další filtr a lze jej kombinovat s oborem i kvalitou.
- Tev1 může vrátit požadavek bez oborového tagu podle prahu hlavní kategorie níže a rok či kvalita fungují také samostatně.

V kódu jsou oborové tagy uložené v `categories.json`, kvalita v samostatném poli `quality` a roky v poli `years`; dohromady tvoří podporované způsoby výběru práce.

## Kategorické tagy

- UX design
- design informací
- 3D / VR / AR
- motion design / video
- vizuální styl
- typografie
- ilustrace
- experiment
- aplikace
- web

Schválené popisy tagů jsou uvedené níže a aplikace je načítá z `categories.json`.

Známka je samostatný údaj, nikoli tag, a ve správě lze nastavit A+, A, B, C, D, E nebo F.

## Jak tvořit a upravovat tagy

Tag označuje podstatné zaměření práce nebo výslovný zájem návštěvníka a jeho definice musí umožnit rozlišit jej od sousedních kategorií podle běžné řeči.

| Pole v `categories.json` | Co do něj patří |
| --- | --- |
| `id` | Jedinečný stabilní technický identifikátor, který se při pouhém přejmenování nemění kvůli návaznosti na uložená data a hodnocení. |
| `name` | Krátký srozumitelný název oboru bez spojování odlišných kategorií jen kvůli pohodlí. |
| `description` | Jedna stručná kladná věta vysvětlující, co je podstatou kategorie a podle čeho ji poznat. |
| `examples` | Několik běžných příkladů zachycujících různé podoby oboru, nikoli seznam konkrétních testovacích vět určený k jejich zapamatování. |
| `boundary` | Stručné vymezení, co ještě nestačí, s čím se kategorie zaměňuje a kdy je oprávněná kombinace s jiným tagem. |

- V definici popisuj skutečný obsah požadavku nebo práce a nepřidávej kategorii jen proto, že by se mohla v daném typu projektu objevit.
- U blízkých kategorií musí jejich hranice navzájem souhlasit a samotné použití softwarového nástroje, zveřejnění na internetu či běžné použití písma neoznačuje zaměření práce.
- Stejná definice platí pro označování prací i interpretaci návštěvnických vět, ale návštěvník nemusí znát odborný název a může obor popsat vlastními slovy.
- Výslovně odmítnutý obor se nepřidává a nejasnou větu je při lidském hodnocení vhodné označit jako nejednoznačnou místo domýšlení dalších zájmů.
- Definice nezahrnuje číselné prahy, známky ani roky, protože pravidla výběru a další filtry jsou samostatné údaje popsané v tomto dokumentu.

### Rozlišení aplikací, webu a UX na příkladech

Následující příklady vysvětlují zamýšlené označení podle definic a nejsou zárukou konkrétní odpovědi modelu.

| Požadavek | Zamýšlené oborové tagy | Důvod |
| --- | --- | --- |
| „Nějakou aplikaci do telefonu.“ | aplikace | Jde o produkt pro zařízení bez dalšího požadavku na UX. |
| „Ukaž mi webové stránky.“ | web | Webová prezentace sama neznamená samostatnou aplikaci ani UX. |
| „Aplikaci, která běží jen v prohlížeči.“ | web | Prohlížečové aplikace podle místního vymezení patří pod web. |
| „Jak testujete použitelnost?“ | UX design | Požadavek neuvádí konkrétní typ produktu. |
| „Web, kde jste zlepšovali použitelnost.“ | web + UX design | Oba zájmy jsou uvedené přímo. |
| „Mobilní aplikaci a jak se ovládá.“ | aplikace + UX design | Požadavek spojuje typ produktu s jeho používáním. |
| „Nejlepší práci z roku 2024.“ | žádný oborový tag | Jde o kvalitu a rok, které se vyhodnocují samostatně. |
| „Kde je šatna?“ | žádný oborový tag | Jde o dotaz mimo nabídku studentských prací. |

- Prázdný oborový výběr je platný výsledek podle pravidel níže a sám o sobě neznamená technickou chybu.
- Když požadavek opravdu obsahuje více oborů než dovoluje aplikace, při hodnocení zaznamenej toto omezení a nevydávej vynucenou dvojici za jedinou správnou odpověď.

### Postup změny a ověření

1. Uprav definici v `categories.json`, ověř soulad hranic souvisejících tagů a současně aktualizuj jejich popisy v tomto hlavním dokumentu.
2. Při změně významu zachovej historické zdroje i výsledky a nová očekávání ulož odděleně s vysvětlením, co se změnilo.
3. Připrav krátké návštěvnické příklady pro samostatný tag, oprávněnou dvojici, blízkou zaměnitelnou kategorii a případ bez oborového tagu podle [postupu syntetického testování](../model-a-testovani/synteticky-test.md).
4. Definice nejprve vyhodnoť na vývojových příkladech a ověřovací sadu použij až po zafixování nastavení bez následného ladění podle jejího výsledku.
5. Změnu definice a změnu prahů měř odděleně, pokud chceš určit příčinu zlepšení či zhoršení, a při souběžných změnách toto omezení výslovně zapiš.
6. Restartuj příslušný server, obnov stránku a ověř `/api/categories`, nabídku ve správě, ukládání tagů i definice ve slepém hodnocení.
7. Výsledky a procenta zaznamenej podle postupu testování do `VYVOJ-TEV.md` a lidská označení uchovávej podle [dokumentace hodnocení](../model-a-testovani/Reinforcement.md) odděleně od syntetických návrhů.

- Přidání nového tagu samo nepřiřadí tag existujícím pracím a změna významu neověří starší přiřazení, takže nové přiřazování vyžaduje samostatnou kontrolu podle [zdrojů dat](SJEDNOCENA-DATA.md).

## Logika více tagů a výběru práce

Tev1 seřadí tagy s odpovědí „ano“ podle skóre a vybere první jako hlavní při skóre alespoň 0,5; pokud žádný odpovídající tag tohoto prahu nedosáhne, nevybere žádný tag a druhý přidá pouze při odpovědi „ano“ a skóre alespoň 0,5 podle `pravidla-vyberu-tagu.json`.

Práh hlavního tagu je v poli `primaryThreshold` a pravidla mají verzi `rozliseni-web-aplikace-ux-v6`; skóre přesně 0,5 s odpovědí „ano“ umožní výběr hlavního tagu a po změně konfigurace je nutný restart serveru.

Při shodném skóre rozhoduje pořadí kategorií v `categories.json` a skóre není ověřenou pravděpodobností správnosti.

## Volné téma při nerozpoznaném oboru

- Server z významových slov vstupní věty sestaví nabídku, pokud Tev1 nevybere hlavní oborový tag nebo je místním spouštěčem zapnuté hledání tématu s tagem, a pošle ji Tev1 v samostatné otázce na jedno téma nebo možnost `none`.
- Při vybraném slově server hledá textovou shodu v názvech, jménech autorů, dostupných popisech a asociovaných slovech; zadaný rok a rozpoznaná kvalita zůstávají filtry tohoto hledání.
- Při odpovědi `none` server nedosazuje jiné slovo. Pokud návštěvník zadal rok nebo kvalitu, hledá jen podle těchto podmínek; jinak požádá o upřesnění.
- Požadavek na kvalitu platí jen při souhlasu odpovědi Tev1 a výskytu odpovídajícího výrazu v textu; výslovné „nejlepší“ zkouší společně A+ a A a potom postupně B až F a zachovává další zadané filtry.
- Kontrola výrazů je omezená na uvedené formulace a jejich některé tvary, takže synonymum mimo seznam nemusí rozpoznat a správné pochopení záporu stále závisí na modelu.
- Při požadavku „nějakou práci o Zlíně“ model chybně vybral nejhorší a žádné téma, takže dříve následoval výběr známky F; důvod této volby model neposkytl.
- Integrační test simuluje chybnou odpověď `worst`, ověřuje její odmítnutí a respektování odpovědi bez tématu.

- Pokud Tev1 nevybere obor, dostane samostatnou otázku, která z významových slov návštěvníka vybírá jedno hlavní téma či vlastnost práce nebo možnost žádné téma.
- Slova se připravují z textu požadavku bez běžných obecných slov a čísel a model si nemůže domýšlet nové téma mimo nabídnutá slova.
- Katalog pro vybrané slovo hledá shodu v názvech, jménech autorů, dostupných výňatcích popisů a asociovaných klíčových slovech (`asociace-praci.json`), ignoruje diakritiku, porovnává přibližné základy českých slov po odstranění vybraných koncovek a u delších slov používá také shodu prvních šesti písmen.
- Výběr zachovává požadovaný rok, známku a viditelný obrázek; při výslovném požadavku „nejlepší“ zkouší společně známky A+ a A a potom postupně B, C, D, E a F; návštěvník uvidí, pokud bylo nutné sestoupit pod A. Bez preference kvality prohledává všechny známky a bez shody práci nenahrazuje jinou.
- Několik nepravidelných tvarů je řešeno zvlášť, ale nejde o úplné skloňování ani lemmatizaci, podobný základ může spojit nesouvisející slova a shoda včetně asociací nemusí znamenat, že je téma pro práci podstatné.
- Při spuštění místním spouštěčem se po výběru oborových tagů zkouší také hledání tématu mezi pracemi s těmito tagy; pokud téma nenajde odpovídající práci, výběr se tiše vrátí k tagům a zachová rok a kvalitu. Při `DOD_TOPIC_WITH_TAGS=0` zůstává původní postup a ostatní chatovací modely toto hledání nepoužívají.
- Pokud žádné významové slovo nezbývá, průvodce žádá upřesnění nebo vybírá podle samostatného roku či kvality a skutečná relevance vyžaduje ověření s návštěvníky.

## Tester rozhodování

- `/tester-rozhodovani` posílá větu na stejné `/api/classify`, které používá hlavní stránka; výsledek tagů, roku, kvality, nabídky témat, textového hledání i práce proto pochází z téže živé logiky. U požadavku na nejlepší tester ukáže sestupné pořadí známek i známku nalezené práce.
- Tester zobrazuje všech až deset vrácených prací s náhledy, autory, roky a známkami, hlavní tagy a jejich skóre, vybranou větev, slova nabídnutá modelu (zvýrazní zvolené), skutečný hledaný výraz a uplatněné filtry; úplný požadavek a odpovědi jsou dostupné v rozbalovacím detailu.
- Tester je diagnostický pohled nad odpovědí API, nikoli druhá implementace výběru. Při změně logiky aktualizuj tento výklad spolu s kódem a ověř, že popisky odpovídají vráceným polím.

## Jiné tagy

Rok, nejlepší a nejhorší doplňují hlavní kategorický tag nebo fungují samostatně, pokud Tev1 nevybral žádný obor.

Model také rozpoznává požadavek na **nejlepší** práce (postupně A+, A, B, C, D, E a F) nebo **nejhorší** (od F směrem k A+). Bez této preference prohledáváme všechny známky. Jiné modely zatím vybírají nejvýše jeden tag a kvalitu nerozpoznávají.

Rok rozpoznává aplikace z čísla v dotazu: **2025/2026** vybere daný školní rok, zatímco **2025** zahrne roky 2024/2025 i 2025/2026. Zkrácené „roku 25“ znamená kalendářní rok 2025 a používá stejný výběr dvou školních let. Výrazy jako „loni“ zatím nepodporujeme.

### Pořadí výběru

Při výslovném požadavku na nejlepší práci se známka hledá v tomto pořadí a ostatní zadané podmínky zůstávají zachované:

1. Oba tagy se známkou A+ nebo A.
2. Pokud taková práce není, oba tagy postupně se známkou B, C, D, E a F.
3. Pokud kombinace tagů nevrátí práci v žádné známce, hlavní tag se známkou A+ nebo A a potom B až F; na vynechání druhého tagu průvodce upozorní.

U požadavku na nejlepší bez druhého tagu se stejné pořadí použije pro hlavní tag; při hledání podle volného tématu nebo pouze roku a kvality se zachová téma či rok a zkouší se stejné pořadí známek. Bez preference známky se hledají všechny známky. Požadavek na nejhorší hledá při stejných podmínkách nejprve F, potom E, D, C, B, A a A+; u dvojice nejprve projde všechny známky pro oba tagy a teprve potom zkusí hlavní tag. Zadaný rok zůstává zachovaný ve všech krocích. Bez tagu, roku a preference kvality aplikace požádá o upřesnění a nevybere práci; neplatná odpověď modelu je chyba.

Práce musí mít alespoň jeden viditelný obrázek. Při každém způsobu hledání aplikace prohledá celý způsobilý katalog a vybere a zobrazí až 10 různých odpovídajících prací v pořadí známek A+, A, B, C, D, E a F; práce se stejnou známkou se vybírají náhodně; API je vrací v poli `projects` a první také v `project`. Při požadavku na nejlepší se zobrazí až deset odpovídajících prací postupně podle známky A+, A, B, C, D, E a F; po vyčerpání lepší známky doplní následující. Pokud má aplikace na výběr mezi pracemi s nejlepší dostupnou známkou, první práci nezopakuje po předchozím výběru. Pokud nic nevyhovuje, oznámí to.

Indexy tagů, roků a známek se obnovují po uložení změn. Nastavení prahu je v `pravidla-vyberu-tagu.json`, zpracování dotazu v `server.mjs` a výběr práce v `catalog.mjs`. Zajímaví absolventi zatím nejsou součástí výběru.

## Popisy tagů

Definice používané modelem jsou v `categories.json` a následující přehled odpovídá jejich aktuálnímu znění.

### UX design

- **Popis:** Návrh a ověřování toho, jak lidé produkt nebo službu používají: jejich potřeby, srozumitelnost, snadné ovládání a přístupnost.
- **Příklady:** Uživatelský výzkum, rozhovory s uživateli, testování použitelnosti, zjednodušení ovládání, návrh uživatelských průchodů nebo přístupnosti.
- **Hranice:** Vyber při výslovném zájmu o potřeby uživatelů, ovládání, použitelnost, UX nebo přístupnost. Samotná aplikace, web, logo ani hezký vzhled obrazovek UX neznamenají. UX neznamená automaticky aplikaci ani web a může řešit i fyzickou službu. Další tag přidej pouze podle toho, co návštěvník opravdu požaduje.

### aplikace

- **Popis:** Návrh nebo tvorba samostatné aplikace pro mobil, tablet, počítač nebo nositelné zařízení.
- **Příklady:** Mobilní aplikace pro Android nebo iOS, aplikace pro tablet, desktopový program, softwarový plugin nebo aplikace pro chytré hodinky.
- **Hranice:** Weby, microsite, portály a aplikace fungující pouze v prohlížeči patří do tagu web; interaktivita, animace ani herní prvky webu samy o sobě nejsou podkladem pro tag aplikace a zmínka o nástroji použitém při tvorbě také nestačí.

### web

- **Popis:** Návrh nebo tvorba webových stránek a obsahu určeného pro prohlížeč: webové prezentace, portfolia, internetového obchodu nebo webového portálu.
- **Příklady:** Webové stránky školy, osobní portfolio na webu, web festivalu, internetový obchod nebo výslovně webová aplikace.
- **Hranice:** Mobilní nebo desktopová aplikace bez webové části nestačí; grafika pouze zveřejněná na internetu není návrhem webu a UX přidej jen při doloženém zaměření na potřeby uživatelů nebo použitelnost.

### design informací

- **Popis:** Návrh způsobu, jak uspořádat a srozumitelně předat informace, data nebo pokyny.
- **Příklady:** Infografika, datová vizualizace, mapa, orientační systém nebo přehledné vysvětlení složitého tématu.
- **Hranice:** Běžný text, navigace nebo seznam údajů v práci sám o sobě nestačí, pokud jejich srozumitelné zpracování není podstatnou součástí návrhu.

### 3D / VR / AR

- **Popis:** Práce založená na trojrozměrné tvorbě, virtuální realitě nebo rozšířené realitě.
- **Příklady:** 3D model nebo prostředí, prostorová vizualizace, virtuální prohlídka nebo aplikace s rozšířenou realitou.
- **Hranice:** Samotný prostorový vzhled dvourozměrné grafiky nestačí, pokud práce skutečně nevyužívá 3D, VR nebo AR.

### motion design / video

- **Popis:** Práce, v níž je podstatnou součástí pohyb, animace nebo audiovizuální zpracování.
- **Příklady:** Animovaná grafika, titulková sekvence, krátký film, videoesej nebo pohybová prezentace vizuálního stylu.
- **Hranice:** Samotné video zaznamenávající či propagující jinou práci nestačí, pokud není pohyb nebo audiovizuální tvorba součástí jejího návrhu.

### vizuální styl

- **Popis:** Návrh ucelené vizuální identity nebo jednotného grafického vzhledu značky, události, instituce či projektu.
- **Příklady:** Logo a jeho použití, vizuální identita festivalu, grafický systém nebo soubor sjednocených propagačních materiálů.
- **Hranice:** Každá práce má nějaký vzhled, ale tento tag patří těm, které vizuální podobu nebo identitu záměrně navrhují jako podstatnou část výsledku.

### typografie

- **Popis:** Práce, v níž je podstatným tématem tvorba, úprava nebo výrazné výtvarné zpracování písma a sazby.
- **Příklady:** Návrh písma, typografický plakát, experiment s písmem nebo publikace zaměřená na typografickou sazbu.
- **Hranice:** Běžné použití či výběr existujícího písma sám o sobě nestačí, pokud typografie není významným předmětem návrhu.

### ilustrace

- **Popis:** Práce, v níž jsou podstatnou součástí autorské obrazové motivy vytvořené k vyjádření myšlenky, příběhu nebo tématu.
- **Příklady:** Knižní ilustrace, autorské kresby, ilustrace postav nebo ilustrovaný vizuální příběh.
- **Hranice:** Použití fotografie, jednoduché ikony nebo převzatého obrázku samo o sobě nestačí, pokud práce není založená na ilustraci.

### experiment

- **Popis:** Práce, jejímž významným cílem je zkoumat neobvyklý postup, médium, technologii nebo způsob vyjádření.
- **Příklady:** Výzkum netradičního materiálu, generativní vizuální experiment nebo zkoumání nového způsobu interakce.
- **Hranice:** Tag může zahrnovat i neobvyklé zpracování tématu nebo nápadité využití technologie, pokud je z práce patrný objevný či experimentální přístup.

Výše jsou definice z `categories.json` používané i při správě prací; zvláštní pokyny pro interpretaci návštěvnických vět, včetně „ujetého“ a „special“, popisuje [zadání modelu](../model-a-testovani/zadani-tev1-pruvodce.md).

### Co ukázala lidská hodnocení

Lidské opravy v `opravy-rozhodnuti.jsonl` a `opravy-rozhodnuti-nove.jsonl` potvrzují, že „nějaký experiment s typografií“, experimentální typografie a experimentální 3D mají nést tag experiment spolu s příslušným oborem. „Něco ujetýho“ i „nějaké special“ byly opraveny na experiment. U ilustrace byla oprava „demonstrace“ a „práce o Zlíně“ bez ilustrace a samotná vizuální identita také ilustraci nepotvrdila. To podporuje požadavek na výslovně zmíněnou kresbu či vlastní obrazové motivy.

Tato lidská data jsou malá sada opravených příkladů, nikoli reprezentativní test. Soubor `lidska-hodnoceni.jsonl` obsahuje 19 záznamů, ale žádný jednoznačně hodnocený příklad experimentu nebo ilustrace; uvedené podněty proto vycházejí z 9 starších a 6 nových oprav. Skóre modelu v těchto záznamech pocházejí z předchozího promptu a po změně definic je nelze vydávat za nové měření. Další syntetické ověření 100 vět je oddělený podklad a jeho neshody samy o sobě nemění tato pravidla.




## Návrhy k dalšímu zvážení

- **Studentský život a akce:** Obsah například z vítání prváků zazněl v [zápisu hovoru](../projekt/DOD-26-zapis-z-hovoru.md), ale jeho podoba jako tagu zatím není domluvená.
- **Zajímaví absolventi:** Tag pro projekty nebo profily spojené s výraznými absolventy je také v seznamu nápadů.

Tyto návrhy zatím nejsou mezi používanými tagy aplikace.


## Rozšíření o aplikace a web

- Samostatné tagy `applications` (aplikace) a `web` (web) byly přidány 2. listopadu 2026 a jsou dostupné v průvodci, správě i novém testu navrhování tagů.
- Kategorie `UX design` zachovává technické ID `web-ui-ux` kvůli historii, ale původní uložený název `web / UI / UX design` je staré široké označení a automaticky se nepovažuje za UX design.
- Starší přiřazení společného tagu nebyla automaticky rozdělena a nemusí znamenat ověřené UX zaměření práce.
- Nové tagy se pracím přiřazují ve správě nebo po ruční kontrole návrhů a bez přiřazených prací nemusí jejich výběr vrátit žádnou práci.
- Původní metadata, uložené opravy, zálohy a staré testovací sady zůstávají zachované a jejich výsledky vznikly s tehdejším seznamem kategorií.
- Po změně `categories.json` restartuj server a obnov stránku, aby se načetly nové definice.

### Stav a ověření rozšíření

- Po schválení verze Codex dne 2. listopadu 2026 obsahuje účinný katalog 378 prací s tagem web, 71 s aplikacemi a 129 s UX designem; počty jsou stavem při nasazení, nikoli automaticky obnovovanými údaji.
- Pro naplnění nových tagů otevři `/admin`, vyhledej odpovídající práci, vyber tag podle jejího obsahu a ulož změny.
- Přiřazení se ukládá odděleně do `upravy-praci.json` a pravidla výběru způsobilé práce jsou uvedena výše.
- Integrační test `server.test.mjs` ověřil dostupnost kategorií přes API a jejich vrácení při simulované odpovědi modelu a `catalog.test.mjs` ověřil ukládání i opětovné načtení tagů.
- První integrační testy prošly mimo sandbox kvůli blokování localhostu chybou `EACCES` a následná měření skutečného Tev1, jejich tehdejší definice a omezení jsou zaznamenané v `VYVOJ-TEV.md` v kořenu projektu.

- UX design byl 2. listopadu 2026 vymezen jako práce s potřebami uživatelů a použitelností, takže může doplňovat web i aplikaci a neoznačuje pouze vzhled UI.

- Uživatel schválil rozdělení původní skupiny podle verze Codex a podrobnosti uchování starších verzí jsou ve [zpětném tagování](../model-a-testovani/Zpětné%20tagování.md#schválení-a-nasazení-verze-codex).

- Ověření 3. listopadu 2026 pokrývá v odděleném testovacím katalogu příklady „horách“ / „hora“ a „zvířaty“ / „zvíře“, omezení roku a známky i negativní případ „hrady“ / „hradby“; skutečná relevance na širší sadě ani u návštěvníků zatím nebyla změřena.

- Hledání tématu s tagem je vývojová verze; víceslovné výrazy a zápory nejsou obecně spolehlivé a textová shoda nezaručuje významovou relevanci.

- Při hledání námětu se pro vybraný vizuální styl z nabídky odstraňují i tvary slova „vizuál“, takže například u vizuálu festivalu zůstává jako možné téma festival.

- „Nejstarší“, „nejnovější“ a „nové“ procházejí odpovídající školní roky od nejstaršího nahoru nebo u „nejnovější“ a „nové“ od nejnovějšího dolů a doplňují práce až do deseti; v každém roce se uplatní také požadovaná kvalita.
- Výslovně uvedený rok omezuje dostupné školní roky; neplatné či chybějící školní roky se do řazení nezahrnují, opačné současné požadavky na stáří pořadí neurčí.

- Při současném požadavku „nejnovější“ nebo „nejstarší“ a „nejlepší“ se roky procházejí zvoleným směrem a zařazují se výhradně práce se známkou A+ nebo A; když nejsou, nižší známka se nepoužije.

- Když vybraný hledaný výraz odpovídá jménu autora a další slovo požadavku se shoduje se stejným autorem, hledání použije obě části jména; při více možných kombinacích ponechá původní výraz.
- Porovnání jmen ignoruje diakritiku a používá přibližné základy včetně tvarů příjmení na „-i“ a „-iho“; krátká jména pod čtyři znaky a nepravidelné tvary nemusí rozpoznat.
