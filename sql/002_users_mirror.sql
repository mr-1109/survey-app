-- Mirror of the local SQLite user tables (data/app.db) in nndb.
--
-- Same table names, same column names, same nullability and defaults. Types are
-- the MariaDB equivalents of SQLite's storage classes:
--   INTEGER (64-bit)        -> BIGINT
--   INTEGER used as boolean -> TINYINT(1)
--   TEXT                    -> VARCHAR(n); indexed columns must be bounded, and
--                              every value here is short and fixed in shape
--   TEXT datetime('now')    -> DATETIME DEFAULT current_timestamp()
--   sessions.expires_at     -> BIGINT, still epoch milliseconds
--
-- SQLite's partial index `UNIQUE (mobile) WHERE mobile IS NOT NULL` needs no
-- counterpart: MariaDB already lets a UNIQUE key hold repeated NULLs.

CREATE TABLE IF NOT EXISTS `users` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(120) NOT NULL,
  `mobile`     VARCHAR(15)  DEFAULT NULL COMMENT 'Login id when an account exists',
  `role`       VARCHAR(32)  NOT NULL DEFAULT 'karyakarta'
               COMMENT 'karyakarta | booth_incharge | admin',
  `active`     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '0 = रोकें, cannot log in',
  `created_by` BIGINT       DEFAULT NULL
               COMMENT 'accounts.id of the creator — not users.id, so the super admin counts',
  `created_at` DATETIME     NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_mobile` (`mobile`),
  KEY `idx_users_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- क्षेत्राधिकार. One row per value, per level, per grant.
-- Same grant_no  = AND across levels, OR across values within a level.
-- Different grant_no = whole ladders ORed, which is what stops
-- भाग 1 of वार्ड 38 + भाग 5 of वार्ड 40 from also granting भाग 5 of वार्ड 38.
-- No row for a level = no limit there. No rows at all = unrestricted.
CREATE TABLE IF NOT EXISTS `user_scope` (
  `user_id`  BIGINT      NOT NULL,
  `grant_no` INT         NOT NULL DEFAULT 1,
  `level`    VARCHAR(16) NOT NULL
             COMMENT 'sambhag|district|lok_sabha|assembly|tehsil|city|ward|bhag',
  `value`    VARCHAR(64) NOT NULL,
  PRIMARY KEY (`user_id`,`grant_no`,`level`,`value`),
  KEY `idx_user_scope_user` (`user_id`),
  CONSTRAINT `fk_user_scope_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credentials. A user only gets a row here once a password is set.
CREATE TABLE IF NOT EXISTS `accounts` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `phone`         VARCHAR(15)  NOT NULL COMMENT 'Matches users.mobile',
  `password_hash` VARCHAR(128) NOT NULL COMMENT 'scrypt, 64 bytes as hex',
  `salt`          VARCHAR(32)  NOT NULL COMMENT '16 random bytes as hex',
  `is_super`      TINYINT(1)   NOT NULL DEFAULT 0
                  COMMENT 'Bootstrap account — unrestricted, carries no scope',
  `created_at`    DATETIME     NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_accounts_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login sessions. Only the SHA-256 of the cookie token is kept, so a dump of
-- this table hands over no usable cookies.
CREATE TABLE IF NOT EXISTS `sessions` (
  `token_hash` CHAR(64) NOT NULL COMMENT 'SHA-256 hex of the session token',
  `account_id` BIGINT   NOT NULL,
  `expires_at` BIGINT   NOT NULL COMMENT 'Epoch milliseconds',
  `created_at` DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`token_hash`),
  KEY `idx_sessions_account` (`account_id`),
  CONSTRAINT `fk_sessions_account`
    FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
