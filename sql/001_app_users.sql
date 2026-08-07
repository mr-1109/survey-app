-- =============================================================================
--  सर्वेक्षण ऐप — user accounts, sessions, and the scope ladder
--  Target: MariaDB 10.11 (nndb)
--
--  Run once, in order. Nothing here touches EROLL_NN055 or SURVEY_DATA.
--
--  Note on charset: the nndb default is latin1_swedish_ci, so every table and
--  text column below declares utf8mb4 explicitly. Without it Hindi names are
--  silently mangled on write.
-- =============================================================================

-- -----------------------------------------------------------------------------
--  1. APP_USERS — identity, credentials, and authority
-- -----------------------------------------------------------------------------
CREATE TABLE `APP_USERS` (
  `ID`             BIGINT(20)   NOT NULL AUTO_INCREMENT,

  -- Stable short code written into SURVEY_DATA.SURVEY_BY (varchar(32)), so a
  -- survey stays traceable to its surveyor even after a rename.
  `USER_CODE`      VARCHAR(32)  NOT NULL,

  -- ---- personal details -----------------------------------------------------
  `FULL_NAME`      VARCHAR(120) NOT NULL,
  `FATHER_NAME`    VARCHAR(120) DEFAULT NULL,
  `GENDER`         ENUM('M','F','O') DEFAULT NULL,
  `DOB`            DATE         DEFAULT NULL,
  `MOBILE`         VARCHAR(15)  NOT NULL COMMENT 'Login ID',
  `ALT_MOBILE`     VARCHAR(15)  DEFAULT NULL,
  `EMAIL`          VARCHAR(120) DEFAULT NULL,
  `ADDRESS`        VARCHAR(255) DEFAULT NULL,
  `DESIGNATION`    VARCHAR(80)  DEFAULT NULL COMMENT 'Free-text label shown in the UI',
  `PHOTO_URL`      VARCHAR(255) DEFAULT NULL,

  -- ---- credentials ----------------------------------------------------------
  -- scrypt(password, SALT, keylen=64) hex = 128 chars; SALT is 16 random bytes
  -- as hex = 32 chars. Sized larger so a move to argon2id needs no migration.
  `PASSWORD_HASH`  VARCHAR(255) NOT NULL,
  `SALT`           VARCHAR(64)  NOT NULL,
  `PASSWORD_ALGO`  VARCHAR(20)  NOT NULL DEFAULT 'scrypt',
  `MUST_RESET_PWD` TINYINT(1)   NOT NULL DEFAULT 0,
  `LAST_LOGIN_AT`  DATETIME     DEFAULT NULL,
  `FAILED_LOGINS`  SMALLINT(6)  NOT NULL DEFAULT 0,
  `LOCKED_UNTIL`   DATETIME     DEFAULT NULL COMMENT 'Set by the app after repeated failures',

  -- ---- role -----------------------------------------------------------------
  `ROLE`           ENUM('super_admin','admin','booth_incharge','karyakarta')
                   NOT NULL DEFAULT 'karyakarta',

  -- Derived, never stored independently, so it cannot contradict ROLE.
  `IS_SUPER`       TINYINT(1) AS (`ROLE` = 'super_admin') VIRTUAL,

  `IS_ACTIVE`      TINYINT(1)   NOT NULL DEFAULT 1,

  -- ---- scope ------------------------------------------------------------
  -- Lives in APP_USER_SCOPE, not here: a level may hold several values, and a
  -- user may hold several independent grants. No rows there = unrestricted.

  -- ---- audit ----------------------------------------------------------------
  `CREATED_BY`     BIGINT(20)   DEFAULT NULL COMMENT 'NULL only for the root user',
  `CREATED_AT`     TIMESTAMP    NOT NULL DEFAULT current_timestamp(),
  `UPDATED_AT`     TIMESTAMP    NULL DEFAULT current_timestamp()
                                ON UPDATE current_timestamp(),

  PRIMARY KEY (`ID`),
  UNIQUE KEY `uk_mobile`    (`MOBILE`),
  UNIQUE KEY `uk_user_code` (`USER_CODE`),
  KEY `idx_created_by` (`CREATED_BY`),
  KEY `idx_active`     (`IS_ACTIVE`),

  CONSTRAINT `fk_users_creator`
    FOREIGN KEY (`CREATED_BY`) REFERENCES `APP_USERS` (`ID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
--  1b. APP_USER_SCOPE — the scope ladder, as a list of grants
--
--  One row per (user, grant, level, value). A GRANT_NO groups values into one
--  path down the ladder; within a grant, levels are ANDed and the values at a
--  level are ORed. Separate grants are ORed with each other.
--
--  Two grants are not the same as one grant holding both sets of values:
--    grant 1 = {ward 38, bhag 1}, grant 2 = {ward 40, bhag 5}
--      → भाग 1 of वार्ड 38, and भाग 5 of वार्ड 40. Nothing else.
--    one grant = {ward [38,40], bhag [1,5]}
--      → all four combinations, including भाग 5 of वार्ड 38.
--
--  A user with no rows here is unrestricted.
-- -----------------------------------------------------------------------------
CREATE TABLE `APP_USER_SCOPE` (
  `USER_ID`  BIGINT(20) NOT NULL,
  `GRANT_NO` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 1,
  `LEVEL`    ENUM('sambhag','district','lok_sabha','assembly','tehsil','city','ward','bhag')
             NOT NULL,
  `VALUE`    VARCHAR(64) NOT NULL,
  PRIMARY KEY (`USER_ID`,`GRANT_NO`,`LEVEL`,`VALUE`),
  KEY `idx_level_value` (`LEVEL`,`VALUE`),
  CONSTRAINT `fk_scope_user`
    FOREIGN KEY (`USER_ID`) REFERENCES `APP_USERS` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
--  2. APP_SESSIONS — server-side login sessions
--
--  Scope is resolved from this table on every request, never from anything the
--  browser sends. Only the SHA-256 of the cookie is stored, so a database leak
--  does not hand over usable sessions.
-- -----------------------------------------------------------------------------
CREATE TABLE `APP_SESSIONS` (
  `TOKEN_HASH` CHAR(64)     NOT NULL COMMENT 'SHA-256 hex of the session token',
  `USER_ID`    BIGINT(20)   NOT NULL,
  `EXPIRES_AT` DATETIME     NOT NULL,
  `IP`         VARCHAR(45)  DEFAULT NULL COMMENT 'IPv6-sized',
  `USER_AGENT` VARCHAR(255) DEFAULT NULL,
  `CREATED_AT` TIMESTAMP    NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`TOKEN_HASH`),
  KEY `idx_user`    (`USER_ID`),
  KEY `idx_expires` (`EXPIRES_AT`),
  CONSTRAINT `fk_sessions_user`
    FOREIGN KEY (`USER_ID`) REFERENCES `APP_USERS` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
--  3. APP_USER_AUDIT — who changed whose scope, and when
-- -----------------------------------------------------------------------------
CREATE TABLE `APP_USER_AUDIT` (
  `ID`         BIGINT(20)  NOT NULL AUTO_INCREMENT,
  `USER_ID`    BIGINT(20)  NOT NULL COMMENT 'Row that changed',
  `ACTOR_ID`   BIGINT(20)  DEFAULT NULL COMMENT 'Who changed it',
  `ACTION`     VARCHAR(20) NOT NULL
               COMMENT 'create | update | scope_change | password_reset | deactivate | delete',
  `OLD_VALUE`  LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
               DEFAULT NULL CHECK (json_valid(`OLD_VALUE`)),
  `NEW_VALUE`  LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
               DEFAULT NULL CHECK (json_valid(`NEW_VALUE`)),
  `CREATED_AT` TIMESTAMP   NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `idx_user`  (`USER_ID`),
  KEY `idx_actor` (`ACTOR_ID`),
  KEY `idx_when`  (`CREATED_AT`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
--  4. Scope-escalation guard
--
--  The rule the app enforces (src/server/scope.js, materialiseScope): every
--  grant assigned to a new user must fit inside ONE of the creator's grants,
--  and levels left blank inherit the creator's values.
--
--  A row-level trigger cannot see a whole grant — rows arrive one at a time —
--  so it enforces the strictly weaker invariant that still blocks the blatant
--  case: no user may hold a value at a level that their creator does not also
--  hold at that level. That stops "creator has wards 38,40 -> child gets 45".
--  It cannot stop a child mixing halves of two different creator grants, which
--  is why the API check above remains the real gate, not a convenience.
-- -----------------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER `TRG_APP_USER_SCOPE_BI` BEFORE INSERT ON `APP_USER_SCOPE`
FOR EACH ROW
BEGIN
  DECLARE v_creator BIGINT;
  DECLARE v_creator_role VARCHAR(20);
  DECLARE v_bound INT;
  DECLARE v_match INT;

  SELECT `CREATED_BY` INTO v_creator FROM `APP_USERS` WHERE `ID` = NEW.`USER_ID`;

  IF v_creator IS NOT NULL THEN
    SELECT `ROLE` INTO v_creator_role FROM `APP_USERS` WHERE `ID` = v_creator;

    -- A super admin may grant anything.
    IF v_creator_role <> 'super_admin' THEN
      SELECT COUNT(*) INTO v_bound
        FROM `APP_USER_SCOPE`
        WHERE `USER_ID` = v_creator AND `LEVEL` = NEW.`LEVEL`;

      -- Only levels the creator actually restricts can bind the child.
      IF v_bound > 0 THEN
        SELECT COUNT(*) INTO v_match
          FROM `APP_USER_SCOPE`
          WHERE `USER_ID` = v_creator
            AND `LEVEL`   = NEW.`LEVEL`
            AND `VALUE`   = NEW.`VALUE`;

        IF v_match = 0 THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Scope escalation: value is outside the creator scope at this level';
        END IF;
      END IF;
    END IF;
  END IF;
END$$

-- Without this, a row could be inserted correctly and edited wider afterwards.
CREATE TRIGGER `TRG_APP_USER_SCOPE_BU` BEFORE UPDATE ON `APP_USER_SCOPE`
FOR EACH ROW
BEGIN
  DECLARE v_creator BIGINT;
  DECLARE v_creator_role VARCHAR(20);
  DECLARE v_bound INT;
  DECLARE v_match INT;

  SELECT `CREATED_BY` INTO v_creator FROM `APP_USERS` WHERE `ID` = NEW.`USER_ID`;

  IF v_creator IS NOT NULL THEN
    SELECT `ROLE` INTO v_creator_role FROM `APP_USERS` WHERE `ID` = v_creator;

    IF v_creator_role <> 'super_admin' THEN
      SELECT COUNT(*) INTO v_bound
        FROM `APP_USER_SCOPE`
        WHERE `USER_ID` = v_creator AND `LEVEL` = NEW.`LEVEL`;

      IF v_bound > 0 THEN
        SELECT COUNT(*) INTO v_match
          FROM `APP_USER_SCOPE`
          WHERE `USER_ID` = v_creator
            AND `LEVEL`   = NEW.`LEVEL`
            AND `VALUE`   = NEW.`VALUE`;

        IF v_match = 0 THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Scope escalation: value is outside the creator scope at this level';
        END IF;
      END IF;
    END IF;
  END IF;
END$$

-- A non-super user must never be able to mint a super admin.
CREATE TRIGGER `TRG_APP_USERS_ROLE_BI` BEFORE INSERT ON `APP_USERS`
FOR EACH ROW
BEGIN
  DECLARE v_creator_role VARCHAR(20);

  IF NEW.`CREATED_BY` IS NOT NULL AND NEW.`ROLE` = 'super_admin' THEN
    SELECT `ROLE` INTO v_creator_role FROM `APP_USERS` WHERE `ID` = NEW.`CREATED_BY`;
    IF v_creator_role <> 'super_admin' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only a super admin can create a super admin';
    END IF;
  END IF;
END$$

DELIMITER ;


-- -----------------------------------------------------------------------------
--  5. Root user
--
--  Carried over from the local SQLite accounts table so the existing password
--  keeps working — same scrypt hash and salt, so nothing needs resetting.
--  Everyone else descends from this row through CREATED_BY.
-- -----------------------------------------------------------------------------
INSERT INTO `APP_USERS`
  (`USER_CODE`, `FULL_NAME`, `MOBILE`, `PASSWORD_HASH`, `SALT`, `PASSWORD_ALGO`,
   `ROLE`, `IS_ACTIVE`, `CREATED_BY`)
VALUES
  ('SUPERADMIN', 'रमेश मीणा', '9876543210',
   'b18c53a8f8ca4cc7a556bac16773abd8f53682c5aae9d07024b3ba918b26858d97efc5c5565fd6932631f1ce04878c9ed7dfc49c4da4fbf8a7c72581594db3d5',
   'b0df091f8a68472d4f8197a84819fa8f',
   'scrypt', 'super_admin', 1, NULL);
