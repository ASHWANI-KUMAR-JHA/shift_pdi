-- JCR (Job Completion Report) Tracking Tables for Work Orders
-- Enhanced with file uploads and comments functionality

-- Main JCR Work Orders Table
CREATE TABLE IF NOT EXISTS jcr_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_no TEXT NOT NULL,
  work_order_date DATE NOT NULL,
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_location TEXT NOT NULL,
  lights_count NUMERIC,
  work_order_value NUMERIC NOT NULL,
  start_date DATE,
  completion_date DATE,
  project_manager TEXT NOT NULL,
  responsible_person TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'in_process', 'pending')),
  pdi_pending BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Comments Table for Work Orders
CREATE TABLE IF NOT EXISTS jcr_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES jcr_work_orders(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Attachments Table for Work Orders
CREATE TABLE IF NOT EXISTS jcr_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES jcr_work_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jcr_work_orders_status ON jcr_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_jcr_work_orders_date ON jcr_work_orders(work_order_date DESC);
CREATE INDEX IF NOT EXISTS idx_jcr_comments_work_order ON jcr_comments(work_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jcr_files_work_order ON jcr_files(work_order_id, uploaded_at DESC);

-- Row Level Security (RLS) - Enable
ALTER TABLE jcr_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcr_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jcr_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to read/write
CREATE POLICY "Allow authenticated users to read work orders"
  ON jcr_work_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert work orders"
  ON jcr_work_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update work orders"
  ON jcr_work_orders FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete work orders"
  ON jcr_work_orders FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read comments"
  ON jcr_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert comments"
  ON jcr_comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update comments"
  ON jcr_comments FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete comments"
  ON jcr_comments FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read files"
  ON jcr_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert files"
  ON jcr_files FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete files"
  ON jcr_files FOR DELETE
  TO authenticated
  USING (true);

-- Sample data insertion (matching the screenshot)
INSERT INTO jcr_work_orders (
  work_order_no, work_order_date, client_name, project_name, project_location,
  lights_count, work_order_value, start_date, completion_date,
  project_manager, responsible_person, status, pdi_pending
) VALUES
  ('11390', '2026-01-18', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'PANCHKULA AND YAMUNANAGAR', 179.4, 3643000, NULL, NULL, 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'completed', false),
  ('11379', '2026-01-24', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'GURGAON AND REWARI', 169.4, 2573000, '2025-01-11', '2025-06-18', 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'completed', false),
  ('776', '2026-02-04', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'GURGAON, REWARI, CHARKHI DADRI, MAHENDERGARH, ROHTAK', 322.0, 15749000, NULL, NULL, 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'in_process', false),
  ('3596', '2026-01-02', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'AMBALA NEWALI KAITHAL', 277.4, 3859000, NULL, NULL, 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'in_process', false),
  ('10621', '2026-01-18', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'PANCHKULA AND KURUKSHETRA', 209.0, 3648000, '2025-01-20', '2025-06-04', 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'completed', false),
  ('10600', '2025-01-04', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'PANCHKULA AND KURUKSHETRA', 579.0, 12000000, '2025-01-20', '2025-04-12', 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'completed', false),
  ('10070', '2025-03-18', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'PANCHKULA AND KURUKSHETRA', 510.0, 12000000, '2025-01-20', '2025-04-11', 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'completed', true),
  ('7312', '2026-02-05', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'REWARI AND JHAJJAR', NULL, 131000, '2025-03-05', '2025-05-03', 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'completed', false),
  ('11345', '2026-01-16', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'REWARI', 86.0, 894000, '2025-01-31', '2025-04-02', 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'completed', true),
  ('3735', '2026-07-20', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'REWARI (KALIANI KARNAL PANIPAT)LA', 189.0, 2131000, NULL, NULL, 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'pending', true),
  ('335', '2026-07-07', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'KAITHAL', 96.0, 952000, NULL, NULL, 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'pending', true),
  ('658', '2026-02-04', 'SUNFEED ECOSOLUTIONS INDIA PVT LTD', 'SOLAR STREET LIGHT', 'KURUKSHETRA', 14.9, 238000, '2025-03-31', '2025-04-01', 'UMESH KHATRI TB', 'UMESH KHATRI ES', 'completed', false);
