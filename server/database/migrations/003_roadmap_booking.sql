-- Votes de la feuille de route : une voix par élément et par adresse e-mail, comptée seulement après confirmation.
-- L'adresse n'est pas conservée : seulement une empreinte à clé (HMAC) qui sert à dédoublonner.
CREATE TABLE roadmap_votes (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item         text        NOT NULL CHECK (char_length(item) <= 40),
  email_hash   text        NOT NULL,
  token_hash   text,
  locale       text        NOT NULL CHECK (locale IN ('fr', 'en')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  ip_hash      text        NOT NULL,
  UNIQUE (item, email_hash)
);
CREATE INDEX roadmap_votes_token_idx ON roadmap_votes (token_hash);

-- Rendez-vous de démonstration. Un créneau ne peut être pris qu'une fois tant que le rendez-vous n'est pas annulé.
CREATE TABLE bookings (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL,
  name         text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email        text        NOT NULL CHECK (char_length(email) <= 254),
  company      text        NOT NULL DEFAULT '' CHECK (char_length(company) <= 120),
  notes        text        NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  locale       text        NOT NULL CHECK (locale IN ('fr', 'en')),
  token_hash   text        NOT NULL,
  status       text        NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  reminded_at  timestamptz,
  ip_hash      text        NOT NULL
);
CREATE UNIQUE INDEX bookings_slot_taken ON bookings (starts_at) WHERE status = 'confirmed';
CREATE INDEX bookings_token_idx ON bookings (token_hash);
