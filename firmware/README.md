# Flick / Pico: skutečný stav držení

`flick-pico-main.py` patří na Pico jako `main.py`, společně s `flick_protocol.py`.
Používá původní zapojení GPIO a konfiguraci MGC3130. Původní `main.py` je zálohovaný na zařízení jako `main.before-dod-contact.py` a na řídicím Macu v `.runtime/pico-main-before-contact.py`.

Protokol posílá `contact` s booleovským `pressed` při změně dolních pěti bitů TouchInfo. Vzorky `sample` obsahují také `touching`. Tap ani dvojitý tap nezahajují nové držení. Chybějící XYZ neznamenají uvolnění dotyku.

Dekodér respektuje volitelná pole podle masky DataOutputConfigMask, místo pevných offsetů pro plný paket. Formát popisuje [Microchip GestIC Library, DS40001718E](https://ww1.microchip.com/downloads/en/DeviceDoc/40001718E.pdf).

Bridge poskytuje poslední surové zprávy a události lokálně na `/diagnostics` pro ověření dotyku bez záznamu zvuku.

Pico posílá jednou za sekundu `heartbeat`, i když se prst nehýbe. Můstek po třech sekundách bez zpráv hlásí odpojení a po pěti sekundách bez USB dat port znovu otevře. Firmware a můstek proto aktualizuj společně. Osmisekundový [watchdog](https://docs.micropython.org/en/latest/library/machine.WDT.html) restartuje Pico při zablokovaném I2C čtení nebo USB zápisu; v běžném provozu se obsluhuje při každém průchodu smyčkou.
