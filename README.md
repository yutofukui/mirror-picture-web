# Mirror / Picture

「顔を近づけるほど鏡、離れるほど写真になる」体験をつくる静的Webアプリです。説明文を排し、身体の動きだけで挙動を理解できる無言の体験を目指しています。

フロントエンドのみで完結しており、顔検出にはMediaPipe Face Landmarkerを使用しています。

## 起動方法

バックエンド不要の静的ファイル構成です。どのローカルサーバーを使ってもすぐに動作を確認できます。

### 方法1: npm / Vite 等を使う場合（Node.js環境がある場合）
```bash
# プロジェクトルートで以下を実行し、表示されたURL（http://localhost:xxxx）にアクセス
npx serve .
# または
npx http-server .
```

### 方法2: Python環境がある場合
```bash
# プロジェクトルートで以下を実行し、http://localhost:8000 にアクセス
python -m http.server 8000
```

## GitHub Pagesに載せる方法

ビルドは不要なため、そのままリポジトリのメインブランチ（`main`など）にPushし、GitHub Pagesの機能で公開できます。

1. このフォルダの中身をGitHubの新しいリポジトリにPushします。
2. リポジトリの `Settings` > `Pages` を開きます。
3. `Build and deployment` の Source を `Deploy from a branch` に設定します。
4. Branch を `main` （または利用しているブランチ）、フォルダを `/(root)` に設定してSaveします。
5. 数分待つと、`https://<username>.github.io/<repository-name>/` のURLで公開されます。

## HTTPSが必要な理由

このWebアプリでは端末のカメラを利用するため、ブラウザのセキュリティ上の制約から `getUserMedia` API を呼び出します。
`getUserMedia` は、**HTTPS接続（または `localhost`）でのみ**許可されています。
そのため、GitHub Pages等で公開する際には自動的にHTTPSが適用される環境を使う必要があります。HTTPで公開するとカメラが起動せずにエラーとなります。

## 対応ブラウザの目安

- **iOS / iPadOS**: Safari (iOS 15以降推奨), Chrome
- **Android**: Chrome
- **PC / Mac**: Chrome (推奨), Safari, Edge, Firefox

※カメラ権限の取得ダイアログで「許可」を選択してください。
※処理負荷軽減のためWebAssemblyおよびGPUデリゲートを使用しています。極端に古い端末では描画フレームレートが低下する可能性があります。

## Debug モードの使い方

通常の利用時には一切のラベル表示がありませんが、顔サイズのスコアや内部状態などの数値をチェックしたい場合は、URLの末尾に `?debug=1` を付与してアクセスしてください。

- **URL例**: `http://localhost:8000/?debug=1`
- **表示内容**:
  - `State`: 現在のステータス (`NEAR` = 鏡, `TRANSITION` = 写真への移行中, `FAR` = 写真のみ)
  - `Ratio`: 画面に対する顔の大きさの正規化スコア（平滑化済み）
  - `Alpha`: 現在の静止画（写真レイヤー）の不透明度 (0.000 〜 1.000)
