-- Tickets table
CREATE TABLE tickets (
  id                  BIGSERIAL PRIMARY KEY,
  zendesk_id          BIGINT UNIQUE NOT NULL,
  subject             TEXT NOT NULL,
  description         TEXT DEFAULT '',
  status              TEXT NOT NULL CHECK (status IN
                        ('open','pending','in_progress','resolved','closed')),
  priority            TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN
                        ('low','normal','high','urgent')),
  category            TEXT NOT NULL DEFAULT 'query' CHECK (category IN
                        ('bug','feature','query','enhancement','other')),
  requester_email     TEXT NOT NULL,
  requester_name      TEXT DEFAULT '',
  requester_org       TEXT DEFAULT '',
  assignee_name       TEXT DEFAULT '',
  tags                JSONB DEFAULT '[]',
  sla_breach_at       TIMESTAMPTZ,
  zendesk_created_at  TIMESTAMPTZ NOT NULL,
  zendesk_updated_at  TIMESTAMPTZ NOT NULL,
  synced_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX idx_tickets_status          ON tickets(status);
CREATE INDEX idx_tickets_category        ON tickets(category);
CREATE INDEX idx_tickets_requester_org   ON tickets(requester_org);
CREATE INDEX idx_tickets_zendesk_updated ON tickets(zendesk_updated_at DESC);
CREATE INDEX idx_tickets_sla             ON tickets(sla_breach_at)
  WHERE sla_breach_at IS NOT NULL;

-- Sync log table
CREATE TABLE sync_logs (
  id                  BIGSERIAL PRIMARY KEY,
  sync_type           TEXT CHECK (sync_type IN ('webhook','incremental','manual')),
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  tickets_processed   INT DEFAULT 0,
  status              TEXT CHECK (status IN ('running','success','failed')),
  error_message       TEXT DEFAULT ''
);

-- Enable Realtime on tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;

-- Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policy: anon and authenticated can read tickets
CREATE POLICY "Allow read access" ON tickets
  FOR SELECT USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role full access" ON tickets
  FOR ALL USING (auth.role() = 'service_role');
