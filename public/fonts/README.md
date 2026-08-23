# 同梱フォントについて

外部サーバー(Google Fonts)から読み込むと、オフライン時に表示が崩れるため、
フォントファイルをこのフォルダに同梱している(CLAUDE.md 絶対制約4「オフラインで完全動作」)。

| ファイル | フォント | ライセンス |
|---|---|---|
| rajdhani-500/600/700.woff2 | Rajdhani | SIL Open Font License 1.1 |
| share-tech-mono-400.woff2  | Share Tech Mono | SIL Open Font License 1.1 |

- SIL OFL 1.1 は無料で商用利用・再配布・組み込みが可能なライセンス。費用は一切発生しない。
- 収録しているのは **latin(英数字)サブセットのみ**。
  これらの書体は日本語のグリフを持たないため、日本語は index.css のフォールバック指定により
  システムの日本語フォントで表示される。
- 入手元: https://fonts.google.com/ (Rajdhani / Share Tech Mono)
