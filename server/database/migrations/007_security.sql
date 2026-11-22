-- Sécurité : preuves de travail déjà utilisées (anti-rejeu), journal des actions d'administration,
-- remerciements publics aux personnes ayant signalé une vulnérabilité.
CREATE TABLE pow_used (
  challenge  text        PRIMARY KEY,
  expires_at timestamptz NOT NULL
);

CREATE TABLE admin_audit (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_email text        NOT NULL,
  action      text        NOT NULL CHECK (char_length(action) <= 60),
  target_type text        NOT NULL CHECK (char_length(target_type) <= 40),
  target_id   text,
  details     jsonb       NOT NULL DEFAULT '{}',
  ip_hash     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_created_idx ON admin_audit (created_at DESC);

CREATE TABLE security_acknowledgments (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  url         text        CHECK (url ~ '^https://' AND char_length(url) <= 200),
  summary     jsonb       NOT NULL DEFAULT '{}',
  reported_on date        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
