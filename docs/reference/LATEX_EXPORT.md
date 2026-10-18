# LaTeX Export

Technical reference for the **Copy as LaTeX** feature ([issue #165](https://github.com/chessviewer-org/chess-viewer/issues/165)).

---

## Table of Contents

- [Overview](#overview)
- [Supported Packages](#supported-packages)
- [Installing TeX](#installing-tex)
- [Output Modes](#output-modes)
- [Option Mapping](#option-mapping)
- [Validation and Safety](#validation-and-safety)
- [API](#api)
- [Entry Points](#entry-points)
- [File Reference](#file-reference)

---

## Overview

The LaTeX exporter turns the current position into ready-to-paste markup for the two chess packages most commonly used in books, bulletins, and academic papers. Nothing is rendered or compiled in the browser — the output is plain text copied to the clipboard.

- Two packages: `skak` and `chessboard`
- Board orientation (flip) is carried into the markup
- Coordinate visibility is carried into the markup
- Snippet or full compilable document
- Four diagram sizes: `tiny`, `small`, `normal`, `large` (10/15/20/30 pt per square)
- Side-to-move marker on or off (`chessboard` only)
- Out of scope for this release: move lists, PDF generation, `xskak`, `chessfss`

---

## Supported Packages

### skak

```latex
\usepackage{skak}
\fenboard{rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1}
\showboard
```

`\showinverseboard` replaces `\showboard` for a flipped board, and `\notationoff` precedes the diagram when coordinates are hidden, followed by `\notationon` afterwards — skak's switch is global, so this keeps later diagrams in the same document unaffected.

### chessboard

```latex
\usepackage{chessboard}
\chessboard[setfen=rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1]
```

Extra keys are added only when they deviate from the package defaults, and the command switches to a multi-line key list as soon as there is more than one key:

```latex
\chessboard[
  setfen=rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1,
  inverse=true,
  label=false
]
```

---

## Installing TeX

The exported markup needs a TeX distribution that includes `skak` and `chessboard`. A minimal installation is not enough, because both packages load helpers from larger collections:

| Package      | Also needs                                                   |
| ------------ | ------------------------------------------------------------ |
| `skak`       | `lambda.sty` (TeX Live package `lambda-lists`)               |
| `chessboard` | `xifthen.sty` and `pgf` (TeX Live packages `xifthen`, `pgf`) |

Both compile with `pdflatex` and can be loaded side by side in one document.

### No installation

[Overleaf](https://www.overleaf.com) ships both packages. Create a project, paste the full-document output and compile.

### Linux

Pick the family your distribution is based on:

**Debian, Ubuntu, Linux Mint and other Debian derivatives**

```bash
sudo apt install texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-pictures texlive-games texlive-plain-generic
```

**Fedora, RHEL, Rocky Linux, AlmaLinux and other Fedora derivatives**

```bash
sudo dnf install texlive-scheme-basic texlive-skak texlive-chessboard texlive-lambda-lists texlive-xifthen texlive-pgf
```

**Arch Linux, Manjaro, EndeavourOS and other Arch derivatives**

```bash
sudo pacman -S texlive-basic texlive-latex texlive-latexrecommended texlive-latexextra texlive-pictures texlive-games texlive-plaingeneric
```

If disk space is not a concern, each family also offers everything in one step: `texlive-full` on Debian, `texlive-scheme-full` on Fedora and the `texlive` package group on Arch (`sudo pacman -S texlive`).

Any distribution can use the upstream installer from [tug.org/texlive](https://tug.org/texlive/), then:

```bash
sudo tlmgr install skak chessboard
```

`tlmgr` resolves `lambda-lists`, `xifthen` and `pgf` on its own.

### Windows

Install [MiKTeX](https://miktex.org/download), which downloads missing packages the first time a document needs them:

```powershell
winget install MiKTeX.MiKTeX
```

Choose **Always install missing packages on-the-fly** during setup (or later under MiKTeX Console → Settings), then compile as usual. Alternatively install TeX Live with the `install-tl-windows.exe` installer from [tug.org/texlive](https://tug.org/texlive/) and run `tlmgr install skak chessboard`.

### macOS

Install [MacTeX](https://tug.org/mactex/) with Homebrew. The full distribution already contains both packages:

```bash
brew install --cask mactex-no-gui
```

For a smaller download, install BasicTeX and add the two packages. Open a new terminal afterwards so `pdflatex` is on the `PATH`:

```bash
brew install --cask basictex
sudo tlmgr update --self
sudo tlmgr install skak chessboard
```

### Check the installation

```bash
kpsewhich skak.sty chessboard.sty
```

Both paths must be printed. If one is missing, install the package from the list above. A missing helper shows up while compiling as `File 'lambda.sty' not found` (skak) or `File 'xifthen.sty' not found` (chessboard).

---

## Output Modes

| Mode       | Result                                                        |
| ---------- | ------------------------------------------------------------- |
| `snippet`  | `\usepackage{…}` line plus the diagram commands (default)     |
| `document` | `\documentclass{article}` … `\end{document}` — compiles as-is |

---

## Option Mapping

| Board state            | skak                           | chessboard           |
| ---------------------- | ------------------------------ | -------------------- |
| Default orientation    | `\showboard`                   | —                    |
| Flipped                | `\showinverseboard`            | `inverse=true`       |
| Coordinates visible    | —                              | —                    |
| Coordinates hidden     | `\notationoff` … `\notationon` | `label=false`        |
| Size other than normal | `\smallboard` … `\normalboard` | `boardfontsize=15pt` |
| Side-to-move hidden    | — (needs PostScript)           | `showmover=false`    |

---

## Validation and Safety

The FEN is the only caller-controlled value that reaches the output, so it passes three gates before it is written into a LaTeX command:

1. `normalizeFEN` — trims, completes a placement-only FEN, and throws on structural damage
2. `validateFENDetailed` and `MAX_FEN_LENGTH` — full six-field validation and length ceiling
3. An allowlist — `/^[A-Za-z0-9/ -]+$/`

The allowlist is what keeps `\`, `{`, `}`, `%`, and `$` out of the markup, so a hostile FEN cannot close the argument and inject `\input` or `\write18`. Rejected input throws `LaTeX export failed: <reason>`; nothing is ever escaped and emitted anyway.

---

## API

```ts
import { generateBoardLatex } from '@chessviewer-org/chess-viewer';

const latex = generateBoardLatex({
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  latexPackage: 'chessboard',
  flipped: true,
  showCoords: false,
  mode: 'snippet'
});
```

| Field          | Type                                       | Default     |
| -------------- | ------------------------------------------ | ----------- |
| `fen`          | `string`                                   | required    |
| `latexPackage` | `'skak' \| 'chessboard'`                   | `'skak'`    |
| `flipped`      | `boolean`                                  | `false`     |
| `showCoords`   | `boolean`                                  | `true`      |
| `mode`         | `'snippet' \| 'document'`                  | `'snippet'` |
| `boardSize`    | `'tiny' \| 'small' \| 'normal' \| 'large'` | `'normal'`  |
| `showMover`    | `boolean`                                  | `true`      |

Also exported: `LATEX_PACKAGES`, `LATEX_PACKAGE_META`, `LATEX_BOARD_SIZES`, `LATEX_BOARD_SIZE_PT`, `isLatexPackage` and `isLatexBoardSize`. The clipboard write reuses the existing `useCopyToClipboard` hook.

---

## Entry Points

- **Board editor** — `Copy as LaTeX` in the command bar opens the dialog for the current position
- **Advanced FEN** — `Copy as LaTeX` under the board preview covers the selected position of the batch

Both pass the live board orientation and coordinate setting into the dialog.

---

## File Reference

| File                                                                   | Role                             |
| ---------------------------------------------------------------------- | -------------------------------- |
| `@chessviewer-org/chess-viewer` (`src/latex.ts`)                       | Markup generation and validation |
| `src/components/features/Latex/LatexExportDialog.tsx`                  | Package/mode picker and preview  |
| `src/components/interactions/Editor/components/CommandBar.tsx`         | Editor entry point               |
| `src/pages/AdvancedFENInputPage/components/InteractiveBoardColumn.tsx` | Advanced FEN entry point         |
| `@chessviewer-org/chess-viewer` (`src/latex.test.ts`)                  | Unit tests                       |
