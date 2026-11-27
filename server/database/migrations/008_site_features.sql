-- Éléments publics activés ou masqués depuis l'administration (contact, démonstration, démo, alertes).
CREATE TABLE site_features (
  key         text        PRIMARY KEY CHECK (char_length(key) BETWEEN 1 AND 40 AND key ~ '^[a-z][a-z0-9_]*$'),
  enabled     boolean     NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);
