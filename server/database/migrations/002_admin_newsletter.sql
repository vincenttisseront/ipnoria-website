-- Réponses depuis l'espace d'administration
ALTER TABLE contact_messages
  ADD COLUMN replied_at timestamptz,
  ADD COLUMN reply_body text CHECK (reply_body IS NULL OR char_length(reply_body) <= 10000);

-- Lettre d'information / alertes de version, en double opt-in. Le jeton n'est conservé que sous forme d'empreinte SHA-256.
CREATE TABLE newsletter_subscribers (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email           text        NOT NULL UNIQUE CHECK (char_length(email) <= 254),
  locale          text        NOT NULL CHECK (locale IN ('fr', 'en')),
  token_hash      text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz,
  ip_hash         text        NOT NULL
);
CREATE INDEX newsletter_subscribers_token_idx ON newsletter_subscribers (token_hash);

-- Petits états persistants (dernière version annoncée, etc.)
CREATE TABLE site_state (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
