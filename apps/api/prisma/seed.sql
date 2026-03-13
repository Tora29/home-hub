-- ユーザー（夫・妻）
-- パスワード: password123 の bcrypt ハッシュ（$2a$10$...）
-- 開発用途のため固定値を使用
INSERT OR IGNORE INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
VALUES
  ('user_husband', '夫',   'husband@example.com', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user_wife',    '妻',   'wife@example.com',    1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- account（email + password 認証）
-- password: password123
INSERT OR IGNORE INTO "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
VALUES
  ('acc_husband', 'husband@example.com', 'credential', 'user_husband', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('acc_wife',    'wife@example.com',    'credential', 'user_wife',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

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
