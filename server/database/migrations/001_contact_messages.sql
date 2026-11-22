-- Messages reçus par le formulaire de contact. Aucune adresse IP en clair : seulement une empreinte salée (ip_hash).
CREATE TABLE contact_messages (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  locale      text        NOT NULL CHECK (locale IN ('fr', 'en')),
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email       text        NOT NULL CHECK (char_length(email) <= 254),
  company     text        NOT NULL DEFAULT '' CHECK (char_length(company) <= 120),
  topic       text        NOT NULL CHECK (topic IN ('demo', 'question', 'feedback', 'partnership', 'other')),
  message     text        NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  consent_at  timestamptz NOT NULL,
  ip_hash     text        NOT NULL,
  user_agent  text        NOT NULL DEFAULT '' CHECK (char_length(user_agent) <= 300),
  notified_at timestamptz,
  handled_at  timestamptz
);

CREATE INDEX contact_messages_created_at_idx ON contact_messages (created_at);
CREATE INDEX contact_messages_ip_hash_idx ON contact_messages (ip_hash, created_at);
