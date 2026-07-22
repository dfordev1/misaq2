# Mithaq QBank — Application Diagrams

Interactive question bank for Real-Life Mithaq Paradigm scenarios. Each question shows a **neutral diagram plate** (no answer revealed in the image) and four multiple-choice options with immediate feedback.

## Generate data and plates

From the repository root:

```bash
python scripts/build_qbank.py
```

This reads `scripts/applications_catalog.py` and writes:

- `qbank/questions.json` — all questions with shuffled options
- `qbank/plates/Q###.svg` — neutral scenario diagrams for the quiz UI
- `diagrams/qbank_plates/Q###.svg` — mirror copy for the diagrams tree

## Run locally

Serve the `qbank/` folder (required for `fetch` of `questions.json`):

```bash
python -m http.server 8766 --directory qbank
```

Open [http://127.0.0.1:8766/](http://127.0.0.1:8766/)

## Features

- **Start All** / **Random 20** / **Random 50** / **Pick Domain**
- Diagram + stem + four clickable options (A–D)
- Green/red feedback after selection; explanation with principle and locus
- Progress bar, score, keyboard shortcuts (`1`–`4`, `A`–`D`, `N` for next)
- End screen with percentage and review list for missed items

Works offline once generated — all assets use relative paths.
