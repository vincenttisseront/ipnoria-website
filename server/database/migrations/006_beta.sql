-- Programme bêta : candidatures, accord signé, versions préliminaires, signalements, campagnes de test, parrainage.

CREATE TABLE beta_applications (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         bigint      NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  sector          text        NOT NULL CHECK (sector IN ('pme', 'collectivite', 'enseignement', 'sante', 'industrie', 'services', 'association', 'autre')),
  org_size        text        NOT NULL CHECK (org_size IN ('lt100', 'lt500', 'lt2000', 'gt2000')),
  hypervisor      text        NOT NULL CHECK (hypervisor IN ('vmware', 'proxmox', 'hyperv', 'xcpng', 'nutanix', 'other', 'none')),
  current_stack   text[]      NOT NULL DEFAULT '{}',
  active_directory boolean    NOT NULL DEFAULT false,
  wifi_8021x      boolean     NOT NULL DEFAULT false,
  services        text[]      NOT NULL DEFAULT '{}',
  hours           text        NOT NULL CHECK (hours IN ('lt2', 'lt8', 'gt8')),
  motivation      text        NOT NULL CHECK (char_length(motivation) BETWEEN 20 AND 2000),
  public_credit   boolean     NOT NULL DEFAULT false,      -- nom affiché sur la page de remerciements
  referral_code   text        UNIQUE,                       -- lien personnel, attribué à l'acceptation
  referred_by     bigint      REFERENCES users (id) ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'waitlist', 'declined', 'left')),
  decision_note   text        CHECK (char_length(decision_note) <= 2000),
  decided_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX beta_applications_status_idx ON beta_applications (status);

-- Accord bêta : une ligne par version acceptée (preuve horodatée)
CREATE TABLE beta_agreements (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  version     text        NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash     text        NOT NULL,
  UNIQUE (user_id, version)
);

-- Objectifs de recrutement par secteur (clé/valeur)
CREATE TABLE beta_settings (key text PRIMARY KEY, value jsonb NOT NULL);
INSERT INTO beta_settings (key, value) VALUES ('quotas', '{"pme": 8, "collectivite": 8, "enseignement": 6, "sante": 3, "industrie": 3, "services": 3, "association": 2, "autre": 2}');

CREATE TABLE beta_releases (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version     text        NOT NULL UNIQUE CHECK (version ~ '^[0-9A-Za-z.+-]{1,40}$'),
  title       jsonb       NOT NULL DEFAULT '{}',
  notes       jsonb       NOT NULL DEFAULT '{}',
  file_name   text        NOT NULL CHECK (file_name ~ '^[A-Za-z0-9._-]{1,120}$'),
  size_bytes  bigint,
  sha256      text,
  published   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE beta_downloads (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  release_id  bigint      NOT NULL REFERENCES beta_releases (id) ON DELETE CASCADE,
  user_id     bigint      REFERENCES users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE beta_campaigns (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       jsonb       NOT NULL DEFAULT '{}',
  body        jsonb       NOT NULL DEFAULT '{}',
  steps       jsonb       NOT NULL DEFAULT '[]',        -- [{"fr": "...", "en": "..."}]
  version     text,
  starts_on   date,
  ends_on     date,
  published   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE beta_campaign_results (
  campaign_id bigint      NOT NULL REFERENCES beta_campaigns (id) ON DELETE CASCADE,
  user_id     bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  steps       jsonb       NOT NULL DEFAULT '[]',        -- [{"result": "ok"|"ko"|"skip", "note": "..."}]
  outcome     text        NOT NULL CHECK (outcome IN ('success', 'partial', 'failure')),
  comment     text        CHECK (char_length(comment) <= 3000),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

CREATE TABLE beta_reports (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint      REFERENCES users (id) ON DELETE SET NULL,
  campaign_id bigint      REFERENCES beta_campaigns (id) ON DELETE SET NULL,
  version     text        NOT NULL CHECK (char_length(version) <= 40),
  module      text        NOT NULL CHECK (module IN ('install', 'update', 'console', 'ipam', 'dns', 'dhcp', 'radius', 'pki', 'cluster', 'ad', 'other')),
  severity    text        NOT NULL CHECK (severity IN ('blocker', 'major', 'minor', 'suggestion')),
  title       text        NOT NULL CHECK (char_length(title) BETWEEN 8 AND 140),
  steps       text        NOT NULL CHECK (char_length(steps) BETWEEN 10 AND 6000),
  expected    text        NOT NULL CHECK (char_length(expected) <= 3000),
  actual      text        NOT NULL CHECK (char_length(actual) <= 3000),
  logs        text        CHECK (char_length(logs) <= 20000),
  status      text        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'need_info', 'confirmed', 'in_progress', 'fixed', 'wontfix', 'duplicate')),
  known       boolean     NOT NULL DEFAULT false,      -- affiché à tous les testeurs dans « problèmes connus »
  fixed_in    text        CHECK (char_length(fixed_in) <= 40),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX beta_reports_user_idx ON beta_reports (user_id);
CREATE INDEX beta_reports_status_idx ON beta_reports (status);

CREATE TABLE beta_report_comments (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id   bigint      NOT NULL REFERENCES beta_reports (id) ON DELETE CASCADE,
  user_id     bigint      REFERENCES users (id) ON DELETE SET NULL,
  team        boolean     NOT NULL DEFAULT false,
  body        text        NOT NULL CHECK (char_length(body) BETWEEN 2 AND 4000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX beta_report_comments_idx ON beta_report_comments (report_id, created_at);
