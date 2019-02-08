# Glory 2nd

## 設定

|メタ変数|意味|
|---|---|
|`${glory_path}`|このソフトウェアをインストールするディレクトリ|
|`${config_path}`|設定ファイルのパス|
|`${data_dir}`|記録したデータを保存するディレクトリ|
|`${scp_dest}`|最終的にデータや HTML ファイルなどが `scp` される宛先ディレクトリ|

1. `git clone <this_repository> ${glory_path}`
1. `vim ${config_path}`
    - `#` で始まる行と空行は無視される．あとはサンプル `config.txt.sample` を頼りに雰囲気で設定する．
1. `crontab -e`
    - `${glory_path}/glory-cron.sh ${config_path} ${data_dir} ${scp_dest}` を適切な間隔で実行するように設定する．
    - 実行ユーザーは以下の条件が揃っていれば OK
        - `${glory_path}` 以下の read 権限を有すること
        - `${config_path}` の read 権限を有すること
        - `${data_dir}` の read/write 権限を有すること
        - `${scp_dest}` の write 権限を有すること
        - `sudo ${glory_path}/bin/glory_record.py ...` により `glory_record.py` を root 権限で実行できること

## `glory_record.py`

`glory_record.py` は他のユーザーの所有するファイルについてワード数カウントを行うため root 権限が必要になる．

本当は `sudo` を使わずに済ませたかったが……

`${glory_path}/bin/glory_record.py` の実行時のみ `sudo` できるようにすると多少はマシ．

## `glory-cron.sh` の動作

1. `sudo ${glory_path}/bin/glory_record.py` を実行する
    1. `${data_dir}/records.txt` に原本データを保存する
    1. `${data_dir}/records.txt` をもとに `${data_dir}/records.json` を生成する
1. `${data_dir}/records.json`, `${glory_path}/html/glory-online.{html,css,js}` を `scp` により `${scp_dest}` 以下にコピーする
