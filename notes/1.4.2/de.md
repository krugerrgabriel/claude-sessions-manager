## 🔄 Eine Aktualisierung, die auch aktualisiert aussieht

Die vorige Version hat verhindert, dass das Dashboard nach einem Klick auf
Aktualisieren mit alten Dateien zurückkommt. Diese schließt den anderen Weg,
und gibt einer frischen Installation ihre eigenen Notizen.

### 🐛 Fehlerbehebungen

- **Das Dashboard konnte immer noch mit dem Stylesheet der vorigen Version
  starten.** Ein Klick auf Aktualisieren lädt die Seite neu, und das genügte.
  Vom Terminal aus aktualisieren und dann einfach zum Tab zurückkehren genügte
  nicht: nichts wurde neu validiert, und der Browser lieferte, was er schon
  hatte, und so erscheint eine neue Version ganz ohne Gestaltung. Apache
  markiert `index.html` und die Sprachwörterbücher jetzt als erneut zu
  validieren, und Stylesheet und Skript tragen die Version in ihrer Adresse,
  sodass eine Aktualisierung nie halb alt und halb neu ist.

### ✨ Feinschliff

- **Eine frische Installation bringt die Versionshinweise mit.** Die
  Schaltfläche für Neuigkeiten liest sie von der Platte, in der gewählten
  Sprache, statt auf Englisch von GitHub auszuweichen.
- **Der Installer aktiviert `mod_headers`**, und die Konfiguration
  funktioniert auch ohne das Modul, nur eben ohne erneute Validierung.
