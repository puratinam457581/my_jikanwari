# 時間割管理アプリ

大学の週間時間割・出欠・課題・単位取得状況をまとめて管理する PWA。
iPhone のホーム画面に追加して、アプリのように使うことを想定している。

- **自前のサーバーを持たない。** データの保存・同期には Firebase(無料の Sparkプラン)を使う
- **完全無料。** 有料プランへの切り替えは行わない方針
- **Googleアカウントでサインイン。** iPhoneとPCなど複数端末から同じデータを見られる
- **オフラインでも動く。** 電波が無くても閲覧・登録・編集ができ、繋がったときに自動で同期する

仕様の正典は [spec.md](spec.md)、見た目の正典は [ui-design-spec.md](ui-design-spec.md)。
開発時のルールは [CLAUDE.md](CLAUDE.md)。

---

## 開発

```bash
npm install     # 依存パッケージを入れる(最初の1回)
npm run dev     # 開発サーバー。表示されたURLをブラウザで開く
npm run build   # 本番用にビルド(dist/ ができる)
npm run preview # ビルド結果を確認する。PWAの動作確認はこちら
npm run icons   # アプリアイコンのPNGを作り直す
```

同じ Wi-Fi の iPhone から開発サーバーを見るときは、`npm run dev` が表示する
**Network:** のURL(`http://192.168.…`)を使う。

> **注意:** 開発サーバーは `http://` のため、**Service Worker と通知は動かない**。
> これらはブラウザの決まりで HTTPS か localhost でしか動作しない。
> オフライン動作と通知の確認は、公開してから実機で行うこと。

### Firebaseの接続設定(初回のみ)

このアプリは Firebase(Authentication + Cloud Firestore、無料の Sparkプラン)を使う。
開発するには `.env.example` を `.env.local` にコピーし、Firebase Console の
「プロジェクトの設定」に出ている値を埋める(この値は秘密情報ではない)。

```bash
cp .env.example .env.local   # 値を埋めてから使う
```

さらに、以下の2つも一度だけ設定しておく必要がある。

1. **Firestoreのセキュリティルール** — Firebase Console → Firestore Database →
   ルール タブに `firestore.rules` の内容を貼り付けて **公開する**。
   貼り付けただけでは反映されないので、公開ボタンを押したことを確認する
2. **Authenticationの承認済みドメイン** — Firebase Console → Authentication →
   Settings → 承認済みドメイン に、開発・公開に使うドメインを追加する
   (`localhost` は最初から入っている)

---

## 公開する

`vite.config.js` の `base` を `'./'`(相対パス)にしてあるので、
**どちらの公開先でも設定を変えずにそのまま動く。**

### A. GitHub Pages

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) を用意済み。
`main` に push すれば自動でビルドして公開される。

1. GitHub でリポジトリを作る(**Public にすること**。後述)
2. `git remote add origin <リポジトリのURL>` → `git push -u origin main`
3. リポジトリの **Settings → Pages → Build and deployment → Source** を
   **GitHub Actions** に変更する
4. リポジトリの **Settings → Secrets and variables → Actions → Variables タブ**
   で、`.env.local` と同じ6つの値を **Repository variables** として登録する
   (`VITE_FIREBASE_API_KEY` など。秘密情報ではないので Secrets ではなく
   Variables でよい)
5. Firebase Console → Authentication → Settings → 承認済みドメイン に、
   公開URLのドメイン(`<ユーザー名>.github.io`)を追加する
6. **Actions** タブで処理が終わるのを待つ。
   公開URLは `https://<ユーザー名>.github.io/<リポジトリ名>/`

> **Public にする理由:** プライベートリポジトリで GitHub Pages を使うには
> 有料プランが必要なため。Public でも公開されるのはアプリのコードだけで、
> 入力した時間割データは自分の端末の中にしか無く、外からは見えない。

### B. Cloudflare Pages

プライベートリポジトリのまま無料で公開したい場合はこちら。

1. GitHub にリポジトリを push する(Private で可)
2. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** でリポジトリを選ぶ
3. ビルド設定
   - フレームワークプリセット: **Vite**
   - ビルドコマンド: `npm run build`
   - 出力ディレクトリ: `dist`
4. 公開URLは `https://<プロジェクト名>.pages.dev/`

---

## iPhone での導入

1. Safari で公開URLを開く
2. 下部の共有ボタン → **「ホーム画面に追加」**
3. 追加されたアイコンから起動する
4. **マイページ → 通知の設定 → 「通知を許可する」**

**手順3が必須。** Safari のタブで開いたままでは通知が使えない(iOS の制約)。

### 通知について

iOS には「アプリを閉じている間に、決まった時刻で通知を鳴らす」仕組みが無い。
それには通知を配信するサーバーが必要で、このアプリは無料・サーバーなしの方針のため
用意していない。そのため通知はこの2つのタイミングで出る。

- アプリを開いている間に、その時刻になったとき
- アプリを開いた瞬間に、開いていない間に出るはずだった分をまとめて

見逃した通知は「マイページ → 通知の設定 → 最近のお知らせ」に必ず残る。

> **朝7時に鳴らしたい場合:** iPhone標準の「ショートカット」アプリで、
> 毎朝7:00にこのアプリを開くオートメーションを作ると、
> 起動時のまとめ出しが働いて実質その時刻に通知が出る(無料)。

---

## バックアップ(重要)

データは Firestore(クラウド)に保存され、サインインした端末どうしで自動的に同期する。
ただし Firestore はあくまでオンラインの保存先であり、アカウントを作り直した場合や
万一のデータ消失に備えて、JSONバックアップの仕組みは引き続き用意している。

**マイページ → バックアップ** から JSON を書き出し、iCloud Drive などに置いておくこと。
マイページのバックアップ行に、前回書き出しからの経過日数が出る。

取り込みは2種類。

| 方法 | 動作 |
|---|---|
| 全置換して復元 | 今のデータを全部消してファイルの内容に置き換える。復元用 |
| マージして追加 | 今のデータを残し、ファイルにしか無いものだけ足す |

---

## 構成

```
src/
  db/          Firestore の読み書き(画面の都合を持たない)
  firebase/    Firebaseの初期化・サインイン状態の管理
  screens/     画面。index.js が「名前 → 画面」の対応表
  components/  画面をまたいで使う部品
  navigation/  タブ・重ね表示・モーダルの状態管理(ルーターは使わない)
  notify/      通知を出す条件の判定と実行
  pwa/         Service Worker の登録と更新の知らせ
  theme/       ダーク / ライトの切り替え
  utils/       日付・色・画像書き出しなどの計算
  index.css    テーマの色・フォント・共通クラスの定義
scripts/
  generate-icons.mjs   アプリアイコンのPNGを生成する
public/
  fonts/       同梱フォント(外部から読まないのでオフラインでも表示できる)
  icons/       アプリアイコン
```

### 使っているパッケージ

| パッケージ | ライセンス | 用途 |
|---|---|---|
| react / react-dom | MIT | 画面の組み立て |
| firebase | Apache-2.0 | Authentication(Googleサインイン)・Cloud Firestore |
| idb | ISC | 旧IndexedDB版の名残(参照用に残置。本番では未使用) |
| lucide-react | ISC | アイコン |
| vite / @vitejs/plugin-react | MIT | ビルド |
| tailwindcss / @tailwindcss/vite | MIT | スタイル |
| vite-plugin-pwa | MIT | manifest と Service Worker の生成 |
| fake-indexeddb | Apache-2.0 | 開発時のテスト用(製品には含まれない) |

いずれも無料で、実行時に外部サービスへ通信しない。
フォントは Rajdhani / Share Tech Mono(SIL OFL)を `public/fonts/` に同梱している。
