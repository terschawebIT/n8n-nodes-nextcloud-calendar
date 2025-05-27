# Modul-Struktur für NextcloudCalendar

Diese neue Struktur zerlegt die großen Dateien in kleinere, leichter zu wartende Module.

## Event-Module

```
descriptions/
  ├── event/
  │   ├── common.ts          # Gemeinsame Operationen und Felder
  │   ├── create.ts          # Felder für Terminerstellen 
  │   ├── search.ts          # Felder für Terminsuche
  │   ├── update.ts          # Felder für Terminaktualisierung
  │   ├── attendees.ts       # Wiederverwendbare Teilnehmer-Definition
  │   ├── settings.ts        # Nextcloud-spezifische Einstellungen
  │   └── index.ts           # Exportiert alle Event-Module
  │
  ├── calendar/
  │   ├── common.ts          # Gemeinsame Kalender-Operationen und Felder
  │   ├── create.ts          # Felder für Kalendererstellung
  │   ├── settings.ts        # Kalender-Einstellungen
  │   └── index.ts           # Exportiert alle Kalender-Module
  │
  └── index.ts               # Hauptexport aller Modul-Beschreibungen
```

## Vorteile

1. **Bessere Organisation**: Jede Datei hat eine klare Verantwortlichkeit
2. **Einfachere Wartung**: Kleinere Dateien sind leichter zu verstehen und zu ändern
3. **Bessere Wiederverwendbarkeit**: Module können in verschiedenen Kontexten verwendet werden
4. **Reduzierte Dateigröße**: Jedes Modul ist kleiner und schneller zu laden

## Migration

Um zu dieser Struktur zu migrieren:

1. Erstelle die neue Ordnerstruktur
2. Extrahiere die gemeinsamen Elemente in separate Dateien
3. Extrahiere die spezifischen Operationen in eigene Dateien
4. Erstelle Index-Dateien, die alles zusammenfassen
5. Aktualisiere die Hauptdateien, um diese neue Struktur zu verwenden 