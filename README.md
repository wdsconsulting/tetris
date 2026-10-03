# Tetris

Een browsergame zonder buildstap of externe dependencies.

## Lokaal spelen

Open `index.html` in een browser, of serveer de map lokaal:

```bash
python3 -m http.server 8000
```

Open vervolgens http://localhost:8000.

## Besturing

- Pijlen links/rechts: bewegen
- Pijl omlaag: sneller laten vallen
- Pijl omhoog of spatiebalk: draaien
- P: pauzeren
- Esc of M: menu openen

## Publicatie

Elke push naar `main` publiceert de statische site via GitHub Pages. De workflow staat in `.github/workflows/pages.yml`.
