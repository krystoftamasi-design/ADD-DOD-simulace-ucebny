# Simulace učebny pro DOD

Interaktivní 3D model učebny s deseti počítači a animovaným maskotem.

**Veřejný náhled:** https://ucebna-dod-simulator.noobest.chatgpt.site

## Spuštění na počítači

Je potřeba Node.js 22 nebo novější.

```sh
npm ci
npm start
```

Otevři http://127.0.0.1:5173. Po instalaci závislostí aplikace funguje i bez internetu.
Server ukončíš pomocí Ctrl+C. Port můžeš změnit proměnnou DOD_SIM_PORT.

## Ovládání

- Tažením myší otáčej kamerou, kolečkem přibližuj.
- Tlačítka Od návštěvníka a Nadhled přepínají pohled.
- Vyber trasu přes všech 10 monitorů nebo dvojici 8 ↔ 7.
- Animaci lze pozastavit a měnit její rychlost.

## Rozmístění

Macy jsou 1, 2, 5, 8. PC jsou 3, 4, 6, 7, 9, 10.
PC stojí po dvojicích na spojených stolech 4–3, 7–6 a 10–9.
Mezi PC a Macy vede průchozí ulička. Krajní desky sahají téměř ke stěnám.
Vpředu před blokem PC jsou dvě spojené prázdné desky bez počítačů.
Nad pravou z těchto dvou desek visí stropní projektor, který promítá
výchozí uvítací obraz přímo na desku stolu.
Rozměry a rozestupy jsou orientační, podle nákresu a fotografické reference.

## Sestavení a nasazení

```sh
npm run build
```

Adresář dist/ obsahuje kompletní statický web včetně Three.js.
Lze ho nasadit na statický hosting. Veřejný náhled výše je nyní hostovaný
samostatně přes Sites; samotný push do GitHubu jej automaticky neaktualizuje.

Zdroj scény a animace je v src/app.js, rozhraní v index.html a src/style.css.
Knihovna Three.js má licenci MIT; její licenční soubor je součástí sestaveného webu.

Simulátor zobrazuje animaci místně v jednom prohlížeči. Přechody mezi vzdálenými
monitory používají prolínání. Nejde o řízení skutečných PC ani měření sítě.
