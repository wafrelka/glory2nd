# Glory 2nd

## 設定

|メタ変数|意味|
|---|---|
|`${glory_path}`|このソフトウェアをインストールするディレクトリ|
|`${config_path}`|設定ファイルのパス|
|`${rsync_dest}`|最終的にデータや HTML ファイルなどが `rsync` される宛先ディレクトリ|

1. リポジトリをクローンする --- `git clone <this_repository> ${glory_path}`
1. 設定ファイルを書く --- `vim ${config_path}`
    - `#` で始まる行と空行は無視される.
    - あとはサンプル `config.txt.sample` を頼りに雰囲気で設定する
1. crontab の設定をいじる --- `crontab -e`
    - `${glory_path}/glory-cron.sh ${config_path} ${rsync_dest}` を適切な間隔で実行するように設定する．
    - 実行ユーザーの権限に注意する
        - glory を (`sudo` つきで) 実行できるか
        - 設定ファイルやレコードファイルを読み書きできるか
        - `rsync` できるか

## `bin/glory_record.py`

usage: `./bin/glory_record.py <path/to/config.txt>`

`glory_record.py` は設定ファイルを読み込み，指定された tex ファイルのワード数を計算してデータを更新し，その結果 (いままでの全記録・設定ファイル中の締切設定を含む) を JSON 形式で標準出力に吐き出す．

他のユーザーの所有するファイルについてワード数カウントを行うため root 権限が必要になる．

本当は `sudo` を使わずに済ませたかったが……

`${glory_path}/bin/glory_record.py` の実行時のみ `sudo` できるようにすると多少はマシ．

## `glory.sh`

usage: `./glory.sh <path/to/config.txt> <path:/to/rsync_destination>`

`./bin/glory_record.py <path/to/config.txt>` を実行したあと， `glory_record.py` の結果および `html/*` を `rsync` で `</path:/to/rsync_destination>` に送る．
