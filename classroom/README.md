# Obrazovky učebny

Z kořene projektu spusť `npm run classroom`; společně spustí USB bridge na 8765 a síťový server na 8000. Samostatně lze použít `DOD_ANIMATE=1 DOD_PROXIMITY=1 node classroom/server.mjs`.

Obrazovky používají http://dod.local:8000/ nebo IP vypsanou serverem. 3D řídicí schéma je na http://127.0.0.1:8765/. Canvas 2D funguje i na starších Macích. Sdílený timeline a hodiny přes WebSocket udržují přenos maskota mezi odpovídajícími hranami.

Přiřazení monitorů je v lokálním `layout.json` (ignorovaném Gitem). Režim čísel a množení podle Flicku se ovládá v panelu 3D schématu. Příkazy POST /api/control smí posílat jen tento počítač. `{"action":"reload"}` obnoví připojené stránky. Přiblížení prstu řídí 0–192 kuliček, po ztrátě polohy efekt během 350 ms ustoupí.

Testy jsou součástí `npm test`. Pro náhled zobrazovací stránky bez registrace dalšího fyzického monitoru použij `/?preview=1`.
