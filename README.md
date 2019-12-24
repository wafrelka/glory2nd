# Glory 2nd

## 設定

|メタ変数|意味|
|---|---|
|`${glory_path}`|このソフトウェアをインストールするディレクトリ|
|`${config_path}`|設定ファイルのパス|
|`${rsync_dest}`|最終的にデータや HTML ファイルなどが `rsync` される宛先ディレクトリ|

1. リポジトリをクローンする &mdash; `git clone <this_repository> ${glory_path}`
1. 設定ファイルを書く &mdash; `vim ${config_path}`
    - `#` で始まる行と空行は無視される.
    - あとはサンプル `config.txt.sample` を頼りに雰囲気で設定する
1. crontab の設定をいじる &mdash; `crontab -e`
    - `${glory_path}/glory.sh ${config_path} ${rsync_dest}` を適切な間隔で実行するように設定する．
    - 実行ユーザーの権限に注意する
        - glory を (`sudo` つきで) 実行できるか？
        - 設定ファイルやレコードファイルを読み書きできるか？
        - `rsync` できるか？

## 各実行ファイルの説明

### `bin/glory_count.py`

usage: `./bin/glory_count.py <path/to/thesis.tex>...`

`glory_count.py` は引数として与えられた tex ファイルそれぞれについてワード数をカウントして標準出力に吐き出す．

オリジナルの Glory (2018年以前に使われていたもの) とは以下の点で差異がある．

- `eabstract` もワード数カウントから除外する
- `input` や `include` の引数に `.tex` がついていないときに自動補完する
- `input` や `include` の引数に絶対パスを許容する

### `bin/glory_record.py`

usage: `./bin/glory_record.py <path/to/config.txt>`

`glory_record.py` は設定ファイルを読み込み，指定された tex ファイルのワード数を計算してデータを更新し，その結果 (いままでの全記録・設定ファイル中の締切設定を含む) を JSON 形式で標準出力に吐き出す．

内部では `glory_count.py` で定義された関数を利用している．

他のユーザーが所有するファイルについてワード数カウントを行うには適切な権限が必要となることに注意．

### `glory.sh`

usage: `./glory.sh <path/to/config.txt> <path:/to/rsync/destination>`

`glory.sh` は以下の作業を行う．

1. `./bin/glory_record.py <path/to/config.txt>` を `sudo` で実行する
1. `glory_record.py` の結果および `html/*` を一時ディレクトリにコピーする
1. 一時ディレクトリの中身を `rsync` で `<path:/to/rsync/destination>` に送る．

他のユーザーが所有するファイルについて適切にワード数カウントを行うために，ワークアラウンドとして `bin/glory_record.py` を root 権限で実行するようにしている．

このために `sudoers` ファイルを適切に設定して `glory.sh` の実行ユーザーが `sudo` で root 権限を得られるようにしておく必要がある．
`bin/glory_record.py` の実行時のみ `sudo` できるようにすると多少はマシ．
