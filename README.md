# YarpenArt: Emphasis Roll

Moduł dodaje mechanikę **Rolling with Emphasis** do Foundry VTT. Rzut wykonuje 2k20 i zachowuje wynik bardziej oddalony od 10.

## Zgodność

- Foundry VTT 13, build 351
- dnd5e 5.3.3
- Dice Tray 3.5.5 (opcjonalnie)
- Dice So Nice (opcjonalnie)

## Funkcje

- Kafelek **EMPHASIS** w natywnym oknie rzutu dnd5e.
- Oddzielne ustawienia GM dla testów cech, umiejętności, narzędzi, rzutów obronnych, rzutów przeciw śmierci i ataków.
- Kafelek dwóch k20 w Dice Tray, który uwzględnia wpisany tam modyfikator liczbowy.
- Dwa sposoby rozstrzygania remisów:
  - przerzut obu kości (zasada podstawowa),
  - zachowanie wyższego wyniku (wariant).
- Natywne wiadomości rzutu dnd5e, dzięki czemu Dice So Nice animuje kości bez dodatkowej konfiguracji.
- Interfejs polski i angielski zgodny z językiem Foundry.

## Instalacja paczki ZIP

Paczka ma `module.json` w katalogu głównym i jest gotowa do importu jako własny moduł na The Forge. Przy instalacji lokalnej rozpakuj ją do:

`FoundryVTT/Data/modules/yarpenart-emphasis-roll`

Po uruchomieniu świata włącz **YarpenArt: Emphasis Roll** w Manage Modules.

## Ustawienia

Przejdź do:

`Configure Settings → Module Settings → YarpenArt: Emphasis Roll`

Rzuty przeciw śmierci są domyślnie wyłączone. Pozostałe obsługiwane kategorie oraz kafelek Dice Tray są domyślnie włączone.

## Repozytorium i wydania GitHub

1. Utwórz repozytorium `Emphasis-Roll` na koncie `yarpenart`.
2. W GitHub Desktop wybierz **Add an Existing Repository from your Hard Drive** i wskaż ten katalog.
3. Opublikuj repozytorium.
4. Przed wydaniem zmień `version` w `module.json` oraz `package.json`.
5. Utwórz i wypchnij tag, np. `v0.1.0`.

Workflow automatycznie uruchomi testy i doda do GitHub Release pliki `module.json` oraz `module.zip`.

Manifest URL:

`https://github.com/yarpenart/Emphasis-Roll/releases/latest/download/module.json`

## API do makr

Można wykonać samodzielny rzut z Emphasis z makra:

```js
game.modules.get("yarpenart-emphasis-roll").api.roll({ modifier: 5 });
```
