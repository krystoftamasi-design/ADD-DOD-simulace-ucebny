# Co průvodce posílá modelu Tev1

Popis odpovídá `server.mjs` a `pravidla-vyberu-tagu.json` k 2. listopadu 2026.

- Server odesílá vybraný model a oříznutý text návštěvníka v poli `state` na rozhraní Ollamy `/v1/systemone`.
- Nezávislé otázky pro každou kategorii `tag_<ID>` typu `choice` nabízí odpovědi `ano` a `ne` a obsahuje název, popis, příklady a hranice z `categories.json`.
- Instrukce vyžadují jasný požadavek na daný obor a výslovně odmítnuté kategorie označují `ne`.
- Experiment zahrnuje výslovný experiment s jiným oborem nebo tématem a hovorový zájem o něco ujetého či speciálního; běžné obory a témata jej samy neznamenají. Ilustrace vyžaduje doložený zájem o kresbu nebo autorské obrazové motivy a nepředpokládá se ze samotného tématu, identity, webu ani animace.
- Otázka `quality` nabízí `best` pro nejlepší, nejkvalitnější, top a nejpovedenější práce, `worst` pro nejhorší, nejméně povedené a propadlé práce a `none` pro výběr bez preference. Použití odpovědi po kontrole textu a její omezení popisují [aktuální pravidla výběru](../data-a-tagy/aktualni-tagy-a-znamky.md#volné-téma-při-nerozpoznaném-oboru).
- Server vyžaduje platné odpovědi a číselné skóre `probabilities.ano` u všech oborových otázek.
- Hlavní kategorii server vybírá nebo ponechá výběr prázdný podle pravidel hlavního dokumentu tagů.
- Při nevybrané hlavní kategorii posílá server samostatnou otázku `topic` pro výběr jednoho klíčového slova (tématu či vlastnosti práce) z nabízených slov požadavku nebo možnosti `none`.
- Zadání tématu uvádí město či místo jako možné téma práce a rozlišuje je od organizačních a jiných nesouvisejících dotazů pro den otevřených dveří.
- Historické úvodní posouzení zájmu bylo odstraněno po chybném odmítání běžných požadavků na webové práce a rozlišování nesouvisejících dotazů zůstává nespolehlivé.
- Při jednotlivém ověření po odstranění síta Tev1 rozpoznal web, ilustraci a 3D, ale u věty „Ukaž mi nějaké webové práce“ přidal vedle webu také nepožadovanou ilustraci.
- Pokud model zvolí `none`, server nepoužije žádné z nabízených slov a další výběr závisí na rozpoznaném roku a kvalitě.
- Rok server rozpoznává z čísla v textu po odpovědi modelu a neposílá pro něj samostatnou otázku.
- Ostatní chatovací modely přes `/api/chat` vracejí jediný platný `categoryId` a kvalitu nerozpoznávají.
- Definice kategorií se načítají při spuštění serveru a po jejich změně je nutný restart.
- Model nedostává katalog prací, obrázky, známky jednotlivých prací ani uložené opravy rozhodnutí.

Prahy, počet vybraných tagů a výběr práce podle kvality a roku určuje hlavní dokument [aktuální tagy a známky](../data-a-tagy/aktualni-tagy-a-znamky.md).

- Při výběru tématu diagnostika uchovává `topicRequest` a `topicResponse` a celkový čas zahrnuje i tento dodatečný dotaz.
