# Hodnocení výběru tagů

- Samostatné okno `/slepe-hodnoceni` umožňuje označit větu bez zobrazení modelové odpovědi a syntetického návrhu, které server zpřístupní až po uložení lidského hodnocení.
- Volba „Zobrazit jen neshody“ vybírá případy, kde se uložený výběr modelu liší od syntetického návrhu, ale samotné tagy zůstávají skryté do uložení a již ohodnocené věty se přeskočí.
- U nových měření textového hledání filtr zahrnuje i neshodu způsobu hledání a po uložení tagů lze vidět hledaný výraz a nalezenou práci nebo informaci, že žádná nalezena nebyla.
- Nová hodnocení a vlastní věty s jedním nebo dvěma tagy se ukládají do `lidska-hodnoceni.jsonl` a nejednoznačné příklady se nezapočítávají jako potvrzená shoda či chyba; provozní postup a omezení popisuje kořenový `README.md`.

Člověk položí otázku, označí nesprávně vybrané tagy, zvolí správné tagy a uloží celý záznam, který se má následně předat AI modulu k návrhu úpravy zadání.

Automatické předání AI modulu a úprava zadání zatím nejsou implementované; uložené záznamy jsou podkladem pro pozdější vyhodnocení.

Člověk potvrdí nebo opraví výběr tagů a společně se syntetickými příklady se tyto údaje použijí k ručnímu návrhu úpravy zadání pro Tev1.

Původní úspěšnost se zaznamená a upravené zadání se otestuje na nových větách, aby bylo vidět, jak model vybírá jeden a dva tagy.

Výsledky na různých sadách nejsou přímým důkazem zlepšení a syntetická správná označení potřebují lidskou kontrolu.


- Po rozhodnutí modelu lze kliknout na „Tag sedí“ a potvrdit výsledek nebo pomocí „Tag je špatně“ vybrat jeden či dva správné tagy.
- Když model vybral jeden správný tag, tlačítko „Chybí druhý tag“ umožní doplnit druhý a uložit oba jako očekávaný výsledek.
- Stejná potvrzovací a opravná volba je dostupná také v `/tester-rozhodovani`; obě rozhraní odesílají záznam přes `/api/category-feedback` a používají shodnou validaci.
- Panel opravy je v hlavním průvodci i testeru vidět stále; tlačítka se aktivují po dokončení rozpoznání a zůstávají dostupná i při hledání volného tématu, kdy model nevybral oborový tag.
- Při opravě lze zvolit „Žádný oborový tag“; uloží se `correctId: "unknown"` a prázdné `correctIds`, které znamenají, že věta nemá mít oborový tag.
- Záznam z testeru stejně jako z hlavní stránky slouží pouze k pozdějšímu vyhodnocení; nemění model, zadání, pravidla ani tagy uložené u prací.
- Nová potvrzení a opravy se připojují jako samostatné řádky JSON do `DOD_DATA_DIR/opravy-rozhodnuti-nove.jsonl`, který vznikne při prvním uložení; bez připojeného datového adresáře vznikne v místní složce průvodce.
- Dřívější `opravy-rozhodnuti.jsonl` zůstává archivem starších záznamů; aplikace jej automaticky nepřepisuje ani do něj nová hodnocení nepřidává. Pro ručně určený cíl lze nastavit `DOD_FEEDBACK_FILE`.
- Místní spouštěč pro nový sběr nastavuje `DOD_FEEDBACK_FILE` na `DOD_DATA_DIR/opravy-rozhodnuti-sber-2026-11-03.jsonl`, pokud není proměnná již nastavena; soubor vznikne při prvním potvrzení nebo opravě z testeru či průvodce.
- Pole `verdict` rozlišuje potvrzení `confirmed` a opravu `corrected`, přičemž starší záznamy bez tohoto pole jsou opravy.
- Záznam obsahuje původní větu (`text`), název modelu (`model`), vybraný tag (`selectedId`), správný tag (`correctId`) a čas v UTC (`timestamp`).
- Pole `selectedIds` obsahuje jeden či dva vybrané tagy nebo prázdné pole při `unknown`; `correctIds` obsahuje očekávané tagy nebo prázdné pole, když člověk potvrdil či opravil výběr na žádný oborový tag.
- Pole `selectedId` a `correctId` zachovávají první vybraný a první správný tag kvůli návaznosti na starší záznamy, přičemž `selectedId` může být také `unknown`.
- Starší záznamy nemusí pole `selectedIds` a `correctIds` obsahovat a jejich jednotlivá ID zůstávají beze změny.
- Oprava může změnit jeden tag na dvojici, dvojici na jeden tag nebo nahradit jeden či oba členy dvojice.
- Nové záznamy obsahují také dostupný přesný požadavek modelu včetně tehdejších definic tagů, použitý endpoint, čas serveru, skóre možností, confidence a počty tokenů.
- Nová hodnocení zachovávají i dostupné odpovědi samostatných otázek k jednotlivým kategoriím.
- Nedostupné metriky se ukládají jako `null`, starší záznamy je nemusí obsahovat a skóre ani confidence nejsou ověřenou pravděpodobností správnosti.
- Z uložených skóre lze později porovnat pořadí správného a vybraného tagu, rozdíl jejich skóre a opakující se záměny kategorií.
- Vyhodnocení zahrnuje jen ručně označené příklady, a proto nevypovídá o přesnosti všech požadavků.
- Hodnota `unknown` v `selectedId` označuje požadavek, pro který model nevybral žádný tag; v `correctId` označuje lidsky potvrzený nebo opravený výběr bez oborového tagu.
- Když model nevybere žádný tag, průvodce zobrazí upozornění a umožní výsledek opravit tlačítkem „Tag je špatně“.
- ID, názvy a definice tagů pocházejí ze souboru `categories.json`, který je vhodné uchovat společně s opravami.
- Soubor oprav je testovací podklad pro pozdější předání a ruční vyhodnocení při úpravě pravidel nebo zadání modelu.
- Uložené opravy samy nemění model, jeho zadání, pravidla ani tagy prací.
- Historický i nový soubor oprav jsou lokální data; zálohuj je odděleně společně s `categories.json`. Nový soubor je v datové složce `DOD_DATA_DIR` a Git jej nezahrnuje.
- Ukládání oprav pro jeden ani dva tagy nebylo dosud ověřeno úplným průchodem v prohlížeči.

- Následné vyhodnocení uložených oprav může posloužit jako podklad pro návrh změn popisů tagů, hranic skóre nebo zadání modelu po lidské kontrole.
- Současná pravidla výběru dvou tagů jsou popsána v `dokumentace/data-a-tagy/aktualni-tagy-a-znamky.md`.

## Ruční a syntetická data

- **Human data:** Starší ručně označené požadavky zůstávají v `opravy-rozhodnuti.jsonl`; nové potvrzené a opravené požadavky se odděleně ukládají do `DOD_DATA_DIR/opravy-rozhodnuti-nove.jsonl` a jejich označení pochází od člověka.
- **Syntetická data:** Uměle vytvořené dotazy s navrženými očekávanými tagy jsou v `synteticke-dotazy.json` a jejich označení vyžaduje lidskou kontrolu.
- Výsledky syntetických testů jsou uložené zvlášť v souborech `vysledky-syntetickych-dotazu*.json` a postup je popsán v `dokumentace/model-a-testovani/synteticky-test.md`.
- Ruční a syntetické záznamy zůstávají oddělené, aby při vyhodnocení bylo zřejmé, odkud příklady a jejich označení pocházejí.
- Ani jeden zdroj dat automaticky nemění model, definice tagů nebo pravidla výběru.

- Nový sběr od 4. listopadu 2026 ukládá při vyhodnocení v testeru i průvodci automatický záznam `automatic` do `opravy-rozhodnuti-sber-2026-11-04-novy.jsonl`, včetně názvu modelu a `requestId`; automatický záznam není lidské potvrzení.
- Případné následné potvrzení či oprava má stejné `requestId`; při vyhodnocování použij poslední ruční záznam a bez něj považuj výsledek pouze za neopravený, nikoli ověřený člověkem.
