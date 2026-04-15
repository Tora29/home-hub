-- レシピシードデータ（ローカル開発用）
-- 実行: wrangler d1 execute home-hub --local --file=drizzle/seeds/recipes.sql
-- INSERT OR REPLACE で冪等（何度実行しても同じ結果）
-- タイムスタンプは Unix 秒（Drizzle mode:'timestamp' に合わせる）

INSERT OR REPLACE INTO "Recipe" (
  "id", "userId", "name", "description",
  "imageUrl", "ingredients", "steps", "sourceUrl",
  "servings", "cookingTimeMinutes",
  "cookedCount", "lastCookedAt",
  "rating", "difficulty", "memo",
  "createdAt", "updatedAt"
) VALUES
(
  'seed-recipe-001',
  (SELECT id FROM "User" LIMIT 1),
  '肉じゃが',
  '定番の家庭料理。甘辛い味付けでご飯が進む煮物。',
  'https://images.example.com/recipes/nikujaga.jpg',
  '[{"name":"牛薄切り肉","amount":"200g"},{"name":"じゃがいも","amount":"3個"},{"name":"玉ねぎ","amount":"1個"},{"name":"にんじん","amount":"1本"},{"name":"しらたき","amount":"1袋"},{"name":"醤油","amount":"大さじ3"},{"name":"みりん","amount":"大さじ3"},{"name":"砂糖","amount":"大さじ2"},{"name":"だし汁","amount":"200ml"}]',
  '["じゃがいもは一口大に切り、水にさらす","玉ねぎはくし切り、にんじんは乱切りにする","鍋に油を熱し、牛肉を炒める","野菜を加えてさらに炒める","だし汁と調味料を加え、落し蓋をして中火で15分煮る","じゃがいもが柔らかくなったら完成"]',
  'https://example.com/recipes/nikujaga',
  4, 30,
  6, strftime('%s', '2026-04-09'),
  'excellent', 'easy', '甘さ控えめが好み。砂糖を少し減らすとちょうどいい。',
  strftime('%s', '2026-02-02'), strftime('%s', '2026-04-09')
),
(
  'seed-recipe-002',
  (SELECT id FROM "User" LIMIT 1),
  '豚の生姜焼き',
  '醤油とみりん、生姜の風味が食欲をそそる定番おかず。',
  'https://images.example.com/recipes/shogayaki.jpg',
  '[{"name":"豚ロース薄切り","amount":"300g"},{"name":"玉ねぎ","amount":"1/2個"},{"name":"醤油","amount":"大さじ2"},{"name":"みりん","amount":"大さじ2"},{"name":"酒","amount":"大さじ1"},{"name":"生姜（すりおろし）","amount":"小さじ2"},{"name":"サラダ油","amount":"適量"}]',
  '["豚肉に醤油・みりん・酒・生姜を合わせたタレをもみ込んで10分置く","玉ねぎは薄切りにする","フライパンに油を熱し、玉ねぎを炒める","玉ねぎが透き通ったら豚肉をタレごと加える","強火で炒め、タレが絡んだら完成"]',
  'https://example.com/recipes/shogayaki',
  2, 20,
  9, strftime('%s', '2026-04-12'),
  'excellent', 'easy', 'キャベツの千切りと一緒に盛り付けると見栄えがいい。',
  strftime('%s', '2026-02-08'), strftime('%s', '2026-04-12')
),
(
  'seed-recipe-003',
  (SELECT id FROM "User" LIMIT 1),
  '鶏むね肉のチキン南蛮',
  'タルタルソースがたっぷり。揚げた鶏肉に甘酢ダレをからめた宮崎名物。',
  'https://images.example.com/recipes/chicken-nanban.jpg',
  '[{"name":"鶏むね肉","amount":"1枚（300g）"},{"name":"卵","amount":"2個"},{"name":"薄力粉","amount":"適量"},{"name":"醤油","amount":"大さじ3"},{"name":"酢","amount":"大さじ3"},{"name":"砂糖","amount":"大さじ2"},{"name":"マヨネーズ","amount":"大さじ4"},{"name":"ゆで卵","amount":"1個"},{"name":"玉ねぎ（みじん切り）","amount":"大さじ2"},{"name":"ピクルス（みじん切り）","amount":"大さじ1"}]',
  '["鶏むね肉を一口大に切り、塩こしょうをする","薄力粉、溶き卵の順にまぶす","170℃の油でこんがり揚げる","醤油・酢・砂糖を合わせた甘酢ダレを作る","揚げた鶏肉をタレにくぐらせる","マヨネーズ・刻みゆで卵・玉ねぎ・ピクルスでタルタルソースを作る","盛り付けてタルタルソースをかける"]',
  'https://example.com/recipes/chicken-nanban',
  2, 40,
  4, strftime('%s', '2026-03-28'),
  'good', 'medium', 'むね肉を使うとヘルシー。揚げたてが一番おいしい。',
  strftime('%s', '2026-02-15'), strftime('%s', '2026-03-28')
),
(
  'seed-recipe-004',
  (SELECT id FROM "User" LIMIT 1),
  '麻婆豆腐',
  '花椒の痺れる辛さが癖になる本格中華。',
  'https://images.example.com/recipes/mapo-tofu.jpg',
  '[{"name":"木綿豆腐","amount":"1丁"},{"name":"豚ひき肉","amount":"150g"},{"name":"長ねぎ","amount":"1/2本"},{"name":"にんにく","amount":"1かけ"},{"name":"生姜","amount":"1かけ"},{"name":"豆板醤","amount":"大さじ1"},{"name":"甜麺醤","amount":"大さじ1"},{"name":"鶏がらスープ","amount":"150ml"},{"name":"醤油","amount":"大さじ1"},{"name":"花椒","amount":"小さじ1/2"},{"name":"水溶き片栗粉","amount":"適量"},{"name":"ごま油","amount":"適量"}]',
  '["豆腐は2cm角に切り、塩ゆでして水気を切る","にんにく・生姜・ねぎをみじん切りにする","フライパンにごま油を熱し、ひき肉を炒める","豆板醤・甜麺醤・にんにく・生姜を加えて炒める","鶏がらスープ・醤油を加えて煮立てる","豆腐を加えて3分煮る","水溶き片栗粉でとろみをつける","ねぎ・花椒・ごま油をかけて完成"]',
  'https://example.com/recipes/mapo-tofu',
  2, 25,
  5, strftime('%s', '2026-04-03'),
  'excellent', 'medium', '辛さは豆板醤の量で調整。花椒を多めに入れると本格的な痺れになる。',
  strftime('%s', '2026-02-18'), strftime('%s', '2026-04-03')
),
(
  'seed-recipe-005',
  (SELECT id FROM "User" LIMIT 1),
  '鮭のホイル焼き',
  '野菜と一緒に蒸し焼きにするシンプルで健康的な一品。洗い物も少ない。',
  'https://images.example.com/recipes/salmon-foil.jpg',
  '[{"name":"生鮭","amount":"2切れ"},{"name":"玉ねぎ","amount":"1/2個"},{"name":"えのきだけ","amount":"1/2袋"},{"name":"バター","amount":"10g"},{"name":"醤油","amount":"大さじ1"},{"name":"みりん","amount":"大さじ1"},{"name":"塩こしょう","amount":"適量"},{"name":"レモン","amount":"適量"}]',
  '["鮭に塩こしょうをふる","玉ねぎは薄切り、えのきはほぐす","アルミホイルに玉ねぎを敷き、鮭・えのきを乗せる","バター・醤油・みりんをかけてホイルを包む","トースターまたはフライパンで15分蒸し焼きにする","レモンを絞って召し上がれ"]',
  'https://example.com/recipes/salmon-foil-yaki',
  2, 20,
  7, strftime('%s', '2026-04-14'),
  'good', 'easy', 'トースターが便利。バターをポン酢に変えてもさっぱりしておいしい。',
  strftime('%s', '2026-02-25'), strftime('%s', '2026-04-14')
),
(
  'seed-recipe-006',
  (SELECT id FROM "User" LIMIT 1),
  'カレーライス',
  '週末に大量に作って作り置きできる定番カレー。2日目が特においしい。',
  'https://images.example.com/recipes/curry-rice.jpg',
  '[{"name":"鶏もも肉","amount":"300g"},{"name":"じゃがいも","amount":"3個"},{"name":"玉ねぎ","amount":"2個"},{"name":"にんじん","amount":"1本"},{"name":"カレールー","amount":"1箱"},{"name":"水","amount":"700ml"},{"name":"サラダ油","amount":"大さじ1"},{"name":"塩こしょう","amount":"適量"}]',
  '["鶏肉は一口大に切り、塩こしょうをする","じゃがいも・にんじんは乱切り、玉ねぎはくし切りにする","鍋に油を熱し、玉ねぎを飴色になるまで炒める","鶏肉・にんじんを加えて炒める","水を加えて沸騰したらアクを取り、15分煮る","じゃがいもを加えてさらに10分煮る","火を止めてルーを割り入れ、溶かす","弱火で10分煮て完成"]',
  'https://example.com/recipes/curry-rice',
  4, 50,
  12, strftime('%s', '2026-04-15'),
  'excellent', 'easy', '隠し味にチョコレートとコーヒーを少し入れるとコクが出る。',
  strftime('%s', '2026-02-01'), strftime('%s', '2026-04-15')
),
(
  'seed-recipe-007',
  (SELECT id FROM "User" LIMIT 1),
  'ほうれん草のお浸し',
  'シンプルな副菜。だしの旨みが引き立つ定番の和の一品。',
  NULL,
  '[{"name":"ほうれん草","amount":"1束"},{"name":"だし汁","amount":"大さじ3"},{"name":"醤油","amount":"大さじ1"},{"name":"みりん","amount":"大さじ1/2"},{"name":"かつお節","amount":"適量"}]',
  '["ほうれん草を塩を加えた熱湯で2分ゆでる","冷水にとり、しっかり水気を絞る","4cm長さに切る","だし汁・醤油・みりんを合わせた漬け汁に30分漬ける","器に盛り、かつお節を添える"]',
  'https://example.com/recipes/ohitashi',
  2, 15,
  2, NULL,
  NULL, 'easy', '副菜ローテーション確認用。lastCookedAt 未設定。',
  strftime('%s', '2026-03-03'), strftime('%s', '2026-03-03')
),
(
  'seed-recipe-008',
  (SELECT id FROM "User" LIMIT 1),
  'パスタ カルボナーラ',
  'シンプルな材料で作るクリーミーなカルボナーラ。生クリーム不使用でも濃厚に仕上がる。',
  'https://images.example.com/recipes/carbonara.jpg',
  '[{"name":"スパゲッティ","amount":"200g"},{"name":"ベーコン","amount":"80g"},{"name":"卵","amount":"2個"},{"name":"卵黄","amount":"1個"},{"name":"パルミジャーノレッジャーノ","amount":"30g"},{"name":"黒こしょう","amount":"たっぷり"},{"name":"塩","amount":"適量"},{"name":"オリーブオイル","amount":"大さじ1"}]',
  '["大きな鍋に湯を沸かし、塩を入れてパスタを茹でる","ベーコンは1cm幅に切り、オリーブオイルで炒める","卵・卵黄・チーズ・黒こしょうを混ぜてソースを作る","パスタが茹で上がる1分前にソースにパスタの茹で汁を少し加える","火を止めたフライパンにパスタを入れ、ソースをかけてよく和える","余熱で卵を固めすぎないよう素早く混ぜる","追いチーズ・黒こしょうをかけて完成"]',
  'https://example.com/recipes/carbonara',
  2, 20,
  1, strftime('%s', '2026-02-22'),
  'poor', 'hard', '卵が固まらないよう火加減が難しい。茹で汁で調整しながら素早く混ぜるのがコツ。',
  strftime('%s', '2026-03-12'), strftime('%s', '2026-03-12')
);
