## ✨ Was sich geändert hat, ohne das Dashboard zu verlassen

Bisher waren die Notizen zu jeder Version nur auf GitHub zu lesen. Jetzt stehen
sie in der Seitenleiste, in deiner Sprache.

### Neu

#### 📖 Schaltfläche für Neuigkeiten

Eine Schaltfläche am Fuß der Seitenleiste öffnet die Notizen zur installierten
Version. Der Text wird mit der Anwendung ausgeliefert, eine Datei je Sprache,
also erscheint er in der gewählten Sprache und funktioniert ganz ohne Netz.

Beim ersten Öffnen des Dashboards nach einer Aktualisierung macht die
Schaltfläche auf sich aufmerksam, beim nächsten Neuladen wird sie
zurückhaltender, und sobald du gelesen hast, ist sie wieder unauffällig.

### 🐛 Fehlerbehebungen

- **Nach einer Aktualisierung konnte das Dashboard ohne Gestaltung erscheinen.**
  Der Browser verwendete weiter das CSS der vorherigen Version, und nur ein
  erzwungenes Neuladen holte das neue. Die Aktualisierung versieht Stylesheet
  und Skript jetzt mit der Versionsnummer, also mit einer Adresse, die kein
  Zwischenspeicher je gesehen hat.

### ✨ Feinschliff

- **Die Aktualisierung verlangt seltener nach dem Terminal.** Früher hielt sie
  bei jeder Änderung an `install.sh` an, auch bei solchen, die nur Dateien
  kopieren. Jetzt hält sie nur an, wenn sich die Apache-Konfiguration selbst
  geändert hat, denn das ist der Teil, der wirklich root braucht.
- **Die Versionshinweise reisen mit der Aktualisierung mit**, sodass die Notizen
  zur nächsten Version schon auf der Platte liegen, wenn du sie lesen willst.
