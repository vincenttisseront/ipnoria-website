-- Outils d'administration : réponses types, jours sans démonstration, bandeau public, clôture des sessions.

CREATE TABLE reply_templates (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      text        NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  body       text        NOT NULL CHECK (char_length(body) BETWEEN 2 AND 10000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE booking_closures (
  day        date        PRIMARY KEY,
  note       text        NOT NULL DEFAULT '' CHECK (char_length(note) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_announcement (
  id         smallint    PRIMARY KEY CHECK (id = 1),
  body_fr    text        NOT NULL DEFAULT '' CHECK (char_length(body_fr) <= 280),
  body_en    text        NOT NULL DEFAULT '' CHECK (char_length(body_en) <= 280),
  ends_on    date,
  enabled    boolean     NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site_announcement (id) VALUES (1);

-- Incrémenté pour invalider les sessions déjà ouvertes de cette adresse. 0 = aucune clôture.
CREATE TABLE admin_session_epoch (
  email text     PRIMARY KEY CHECK (position('@' in email) > 1),
  epoch integer  NOT NULL DEFAULT 0 CHECK (epoch >= 0)
);
