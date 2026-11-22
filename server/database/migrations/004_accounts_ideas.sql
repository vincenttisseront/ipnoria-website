-- Comptes utilisateurs du site (distincts de l'administration, qui passe par le SSO de l'équipe)
-- et demandes de fonctionnalités. Aucun secret n'est stocké en clair : mots de passe en Argon2id,
-- jetons de session et liens e-mail en SHA-256, codes de secours en SHA-256, secret TOTP chiffré (AES-256-GCM).

CREATE TABLE users (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email             text        NOT NULL CHECK (char_length(email) <= 254),
  email_verified_at timestamptz,
  password_hash     text,                       -- vide pour un compte créé par GitHub ou par clé d'accès seule
  display_name      text        NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 60),
  organization      text        CHECK (char_length(organization) <= 120),
  locale            text        NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr', 'en')),
  notify_status     boolean     NOT NULL DEFAULT true,   -- e-mail quand une idée suivie change de statut
  notify_comments   boolean     NOT NULL DEFAULT true,   -- e-mail quand on commente une de mes idées
  totp_secret_enc   text,                       -- secret TOTP chiffré ; non nul = TOTP actif
  totp_pending_enc  text,                       -- secret en cours d'activation
  totp_last_step    bigint,                     -- dernier pas TOTP accepté (rejeu interdit)
  github_id         text UNIQUE,
  failed_logins     integer     NOT NULL DEFAULT 0,
  locked_until      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_idx ON users (lower(email));

CREATE TABLE user_sessions (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash     text        NOT NULL UNIQUE,
  mfa_pending    boolean     NOT NULL DEFAULT false,   -- mot de passe accepté, second facteur attendu
  reauth_at      timestamptz NOT NULL DEFAULT now(),   -- dernière preuve d'identité (actions sensibles)
  device         text        NOT NULL DEFAULT '' CHECK (char_length(device) <= 120),
  device_hash    text        NOT NULL DEFAULT '',
  ip_hash        text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL
);
CREATE INDEX user_sessions_user_idx ON user_sessions (user_id);

-- Liens envoyés par e-mail : vérification, réinitialisation, changement d'adresse. Usage unique.
CREATE TABLE user_tokens (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose     text        NOT NULL CHECK (purpose IN ('verify', 'reset', 'email')),
  token_hash  text        NOT NULL UNIQUE,
  data        text,                                   -- nouvelle adresse pour 'email'
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_tokens_user_idx ON user_tokens (user_id, purpose);

CREATE TABLE user_recovery_codes (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code_hash  text        NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_recovery_codes_user_idx ON user_recovery_codes (user_id);

CREATE TABLE user_passkeys (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  credential_id text        NOT NULL UNIQUE,          -- base64url
  public_key    text        NOT NULL,                 -- base64url (COSE)
  counter       bigint      NOT NULL DEFAULT 0,
  transports    text        NOT NULL DEFAULT '',
  name          text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);
CREATE INDEX user_passkeys_user_idx ON user_passkeys (user_id);

-- Défis WebAuthn en cours (5 minutes), liés à un cookie de navigateur
CREATE TABLE webauthn_challenges (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  flow_hash   text        NOT NULL UNIQUE,
  challenge   text        NOT NULL,
  user_id     bigint      REFERENCES users (id) ON DELETE CASCADE,
  kind        text        NOT NULL CHECK (kind IN ('register', 'login')),
  expires_at  timestamptz NOT NULL
);

-- Journal de sécurité visible par l'utilisateur (connexions, changements de mot de passe, MFA…)
CREATE TABLE user_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind       text        NOT NULL CHECK (char_length(kind) <= 40),
  device     text        NOT NULL DEFAULT '',
  ip_hash    text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_events_user_idx ON user_events (user_id, created_at DESC);

-- Demandes de fonctionnalités. Titre et texte par langue : une idée proposée par un utilisateur
-- n'a que sa langue ; celles de l'équipe peuvent avoir les deux.
CREATE TABLE ideas (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key           text UNIQUE,                          -- identifiant stable des idées de l'équipe
  title         jsonb       NOT NULL,                 -- {"fr": "...", "en": "..."}
  body          jsonb       NOT NULL,
  locale        text        NOT NULL CHECK (locale IN ('fr', 'en')),
  status        text        NOT NULL DEFAULT 'proposed'
                CHECK (status IN ('proposed', 'review', 'planned', 'progress', 'shipped', 'declined', 'duplicate')),
  duplicate_of  bigint      REFERENCES ideas (id) ON DELETE SET NULL,
  author_id     bigint      REFERENCES users (id) ON DELETE SET NULL,
  hidden        boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ideas_status_idx ON ideas (status) WHERE NOT hidden;

CREATE TABLE idea_votes (
  idea_id    bigint      NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
  user_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);
CREATE INDEX idea_votes_user_idx ON idea_votes (user_id);

CREATE TABLE idea_comments (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idea_id    bigint      NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
  user_id    bigint      REFERENCES users (id) ON DELETE SET NULL,
  team       boolean     NOT NULL DEFAULT false,      -- réponse de l'équipe (depuis l'administration)
  body       text        NOT NULL CHECK (char_length(body) BETWEEN 2 AND 3000),
  hidden     boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at  timestamptz
);
CREATE INDEX idea_comments_idea_idx ON idea_comments (idea_id, created_at);

-- Historique des statuts, avec la note de l'équipe envoyée aux votants
CREATE TABLE idea_status_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idea_id    bigint      NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
  status     text        NOT NULL,
  note       text        CHECK (char_length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idea_status_events_idea_idx ON idea_status_events (idea_id, created_at);

-- Le vote par e-mail sans compte est remplacé par le vote des comptes
DROP TABLE roadmap_votes;
