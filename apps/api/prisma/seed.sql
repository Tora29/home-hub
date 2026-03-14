-- ユーザー（夫・妻）
-- パスワード: password（PBKDF2-SHA256 ハッシュ形式: {salt}:{hash}）
-- 開発用途のため固定 salt を使用
INSERT OR IGNORE INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
VALUES
  ('user_husband', '夫',   'husband@example.com', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user_wife',    '妻',   'wife@example.com',    1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- account（email + password 認証）
-- password: password
INSERT OR IGNORE INTO "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
VALUES
  ('acc_husband', 'husband@example.com', 'credential', 'user_husband', '0102030405060708090a0b0c0d0e0f10:edcc81643686f4e956b14698b0d2460877a2fdc111c51fc514f7d1af547803d3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('acc_wife',    'wife@example.com',    'credential', 'user_wife',    '0102030405060708090a0b0c0d0e0f10:edcc81643686f4e956b14698b0d2460877a2fdc111c51fc514f7d1af547803d3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 初期タグ
INSERT OR IGNORE INTO "tag" ("id", "name") VALUES
  ('tag_meat',    '肉'),
  ('tag_fish',    '魚'),
  ('tag_veggie',  '野菜'),
  ('tag_salty',   'しょっぱい'),
  ('tag_light',   'さっぱり'),
  ('tag_rich',    'こってり'),
  ('tag_spicy',   '辛い'),
  ('tag_japanese','和食'),
  ('tag_western', '洋食'),
  ('tag_chinese', '中華');
