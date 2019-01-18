# Glory 2nd

## 設定

1. `git clone ${this_repository} ${glory_path}`
    - `${glory_path}` は適当な場所で良い
1. `vim ${glory_path}/config.txt`
    - `#` で始まる行と空行は無視される．あとはサンプルを頼りに雰囲気で設定する．
1. `vim ${glory_path}/glory-cron.sh`
    - `$GLORY_DEST_USER` および `$GLORY_DEST_DIR` を適切なものに変更する．
1. `crontab -e`
    - `${glory_path}/glory-cron.sh` を適切な間隔で実行するように設定する．
    - 実行ユーザーは以下の条件が揃っていれば OK
        - `${glory_path}` への書き込み権限を有すること
        - `${GLORY_DEST_USER}:${GLORY_DEST_DIR}` への書き込み権限を有すること
        - `sudo python2 ...` を root 権限で実行できること

## `glory-cron.sh` の動作

1. `${glory_path}/bin/glory_record.py` を root 権限で実行する
    1. `${glory_path}/data/records.txt` に原本データを保存する
    1. `${glory_path}/data/records.txt` をもとに `data/records.json` を生成する
1. `${glory_path}/data/records.json`, `${glory_path}/html/glory-online.{html,css,js}` を `scp` により `${GLORY_DEST_USER}:${GLORY_DEST_DIR}` にコピーする