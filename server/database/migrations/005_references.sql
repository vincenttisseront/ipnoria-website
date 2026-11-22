-- Références clients publiques (« Ils utilisent Ipnoria »). Une référence ne peut être publiée qu'avec
-- l'autorisation écrite du client (qui l'a donnée, quand) : le logo et le témoignage engagent son image.
CREATE TABLE customer_references (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug           text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 60),
  name           text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  sector         text        NOT NULL CHECK (sector IN ('pme', 'collectivite', 'enseignement', 'sante', 'industrie', 'services', 'association', 'autre')),
  size           jsonb       NOT NULL DEFAULT '{}',      -- {"fr": "800 postes", "en": "800 devices"}
  location       text        CHECK (char_length(location) <= 80),
  website        text        CHECK (website ~ '^https://' AND char_length(website) <= 200),
  services       text[]      NOT NULL DEFAULT '{}',
  quote          jsonb       NOT NULL DEFAULT '{}',
  quote_author   text        CHECK (char_length(quote_author) <= 80),
  quote_role     jsonb       NOT NULL DEFAULT '{}',
  story          jsonb       NOT NULL DEFAULT '{}',      -- étude de cas, paragraphes séparés par une ligne vide
  logo           bytea,
  logo_type      text        CHECK (logo_type IN ('image/png', 'image/webp', 'image/jpeg')),
  logo_dark_bg   boolean     NOT NULL DEFAULT false,     -- logo clair, à poser sur fond sombre
  authorized_by  text        CHECK (char_length(authorized_by) <= 120),
  authorized_at  date,
  published      boolean     NOT NULL DEFAULT false CHECK (NOT published OR (authorized_by IS NOT NULL AND authorized_at IS NOT NULL)),
  position       integer     NOT NULL DEFAULT 100,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_references_pub_idx ON customer_references (position, name) WHERE published;
