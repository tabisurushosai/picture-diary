# picture-diary (えにっき) 仕様書 v1_0
## ゴール
今日あったことを絵文字とひとことで記録し、日付ごとに見返せる絵日記Chrome拡張。ことばが少なくても出来事を残せる、ふりかえり・コミュニケーション支援。
## 絶対制約
外部API・通信なし/chrome.storage.localのみ/権限storageのみ/MV3・TS・Vite/UIはpopup内で完結。医療・診断をうたわない。
## 機能
今日のエントリ作成(絵文字を複数選ぶ+ひとこと)/日付ごとに保存・一覧表示/過去エントリの閲覧・編集・削除/起動時復元/i18n ja-en/無料は直近7日分、Premium($3買い切り7日トライアル)で無制限保存+絵文字パック追加+月表示。
## 完了条件
npm run build成功・dist生成・_locales ja/en・icons16/48/128・release/picture-diary.zip生成。
