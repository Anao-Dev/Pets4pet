-- ============================================================
--  PETS4PET PORTAL — schema.sql
--  Banco de dados MySQL / MariaDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS pets4pet
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pets4pet;

-- ─── TABELA: usuarios ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  nome          VARCHAR(120)     NOT NULL,
  sobrenome     VARCHAR(120)     NOT NULL,
  email         VARCHAR(180)     NOT NULL,
  senha_hash    VARCHAR(255)     NOT NULL,
  telefone      VARCHAR(20)          NULL DEFAULT NULL,
  tipo          ENUM('tutor','profissional','petshop') NOT NULL DEFAULT 'tutor',
  avatar_url    VARCHAR(500)         NULL DEFAULT NULL,
  ativo         TINYINT(1)       NOT NULL DEFAULT 1,
  email_verificado TINYINT(1)   NOT NULL DEFAULT 0,
  token_verificacao VARCHAR(64)      NULL DEFAULT NULL,
  criado_em     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email),
  INDEX idx_tipo (tipo),
  INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TABELA: sessoes (tokens JWT blacklist opcional) ──────
CREATE TABLE IF NOT EXISTS sessoes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  token      VARCHAR(512) NOT NULL,
  ip         VARCHAR(45)      NULL,
  user_agent TEXT             NULL,
  expira_em  DATETIME     NOT NULL,
  criado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_usuario (usuario_id),
  INDEX idx_token (token(64)),
  CONSTRAINT fk_sessao_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TABELA: logs_acesso ──────────────────────────────────
CREATE TABLE IF NOT EXISTS logs_acesso (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED     NULL,
  acao       VARCHAR(80)  NOT NULL,
  ip         VARCHAR(45)      NULL,
  detalhes   JSON             NULL,
  criado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_usuario (usuario_id),
  INDEX idx_acao (acao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;