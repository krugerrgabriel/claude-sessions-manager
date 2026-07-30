## 📋 Wähle, wie du kopierst, und aktualisiere ohne Terminal

Der Kopieren-Button setzt nicht mehr voraus, dass du einen Shell-Befehl willst,
und der Update-Button reicht dir nicht mehr bloß einen zum Einfügen.

### Neuerungen

#### 📋 Auswahl des Kopierformats

Ein neuer Schalter im Header bestimmt, was der Kopieren-Button in deine
Zwischenablage legt. Drei Optionen, und die Wahl bleibt erhalten:

- **Terminal-Befehl** legt `claude --resume <id>` ab, zum Einfügen in eine Shell
  bei geschlossenem Claude Code.
- **Befehl in Claude** legt `/resume <id>` ab, zum Einfügen in ein bereits
  laufendes Claude Code.
- **Jedes Mal fragen** öffnet bei jedem Kopieren eine Auswahl und zeigt den
  echten Befehl dieser Unterhaltung.

Voreingestellt ist der Terminal-Befehl, es ändert sich also nichts, bis du es
willst.

#### ⚡ Update mit einem Klick

Der Update-Button wendet das Update jetzt an, statt einen Befehl zu kopieren.
Ein Klick, er pullt, tauscht die Dateien, die Seite lädt in der neuen Version
neu. Kein Terminal, kein `sudo`.

Wenn eine Version `install.sh` selbst ändert, kann sich auch die
Apache-Konfiguration geändert haben, und dafür braucht es root. Das Update hält
dann an, und ein Modal erklärt, was los ist, mit dem Befehl zum Kopieren. Dasselbe
Modal erscheint, wenn dein Klon nicht committete Arbeit enthält, denn deine
Änderungen werden nie verworfen.

#### 🔒 Nur localhost

**Das Dashboard war ohne jede Authentifizierung aus deinem lokalen Netz
erreichbar.** Jeder im selben WLAN konnte Name, Vorschau, Projektpfad und Branch
aller Unterhaltungen lesen und Session-Dateien löschen. Es liefert jetzt nur noch
auf localhost aus. **Erst das erneute Ausführen des Installers wendet das an.**

### 🐛 Fehlerbehebungen

- **Das Verschieben zwischen Projekten konnte eine Unterhaltung verlieren.**
  Claude Code macht aus jedem nicht-alphanumerischen Zeichen eines Pfades einen
  Bindestrich, nicht nur aus den Trennzeichen, das Backend ersetzte aber nur die
  Trennzeichen. In Projekte mit `_`, `.`, Leerzeichen oder Akzent im Pfad
  verschobene Unterhaltungen ließen sich nicht mehr fortsetzen.
- **Eine kaputte `metadata.json` löschte stillschweigend alle Namen, Notizen und
  Favoriten.** Die API verweigert den Schreibvorgang jetzt und sagt es, die Datei
  bleibt unangetastet.
- **Ein Projektname mit Regex-Zeichen führte zu einer leeren Seite.**
- **Karten sprangen beim Kopieren**, weil die Session-ID in dem Zustand
  ausgeblendet wurde.

### ✨ Feinschliff

- **Eigene Dropdowns** statt der nativen Selects für Kopierformat, Sortierung und
  Sprache, mit vollständiger Tastaturbedienung und konstanter Breite.
- **`backdrop-filter` ist raus.** Es zeichnete den fixierten Header bei jedem
  Scroll-Frame neu, für eine Unschärfe, die niemand wollte.
- **Die Session-ID wird vollständig angezeigt**, statt fester 8 Zeichen.
- **Dokumentation in allen 7 Sprachen nachgezogen.**
