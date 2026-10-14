-- ========================================================================
-- Work Order ↔ Installation Synchronization
-- ========================================================================
-- This script creates triggers to automatically update JCR work order status
-- when installations are added or deleted.
--
-- Logic:
--   - When an installation is deleted, check if the work order has any remaining
--     installations. If zero remain, mark the work order as 'pending' (available).
--   - When an installation is added with a work order, mark that work order as
--     'in_process' (being used).
--
-- Run this in the Supabase SQL Editor.
-- ========================================================================

-- ===== Function: Update work order status after installation changes =====
CREATE OR REPLACE FUNCTION sync_work_order_status()
RETURNS TRIGGER AS $$
DECLARE
  wo_number TEXT;
  installation_count INTEGER;
BEGIN
  -- Determine which work order number to check
  IF TG_OP = 'DELETE' THEN
    wo_number := OLD.work_order;
  ELSIF TG_OP = 'INSERT' THEN
    wo_number := NEW.work_order;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle both old and new work orders if changed
    wo_number := NEW.work_order;
    IF OLD.work_order IS DISTINCT FROM NEW.work_order THEN
      -- Also check the old work order
      IF OLD.work_order IS NOT NULL THEN
        SELECT COUNT(*) INTO installation_count
        FROM public.installations
        WHERE work_order = OLD.work_order;
        
        IF installation_count = 0 THEN
          -- No more installations for old work order → mark as pending
          UPDATE public.jcr_work_orders
          SET status = 'pending',
              updated_at = NOW()
          WHERE work_order_no = OLD.work_order;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Skip if no work order specified
  IF wo_number IS NULL OR wo_number = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count remaining installations for this work order
  SELECT COUNT(*) INTO installation_count
  FROM public.installations
  WHERE work_order = wo_number;

  -- Update the corresponding JCR work order status
  IF installation_count = 0 THEN
    -- No installations → mark as pending (available for use)
    UPDATE public.jcr_work_orders
    SET status = 'pending',
        updated_at = NOW()
    WHERE work_order_no = wo_number;
  ELSE
    -- Has installations → mark as in_process (being used)
    UPDATE public.jcr_work_orders
    SET status = 'in_process',
        updated_at = NOW()
    WHERE work_order_no = wo_number
      AND status != 'completed'; -- Don't override completed status
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ===== Triggers on installations table =====

-- Trigger after INSERT
DROP TRIGGER IF EXISTS trigger_sync_wo_after_insert ON public.installations;
CREATE TRIGGER trigger_sync_wo_after_insert
  AFTER INSERT ON public.installations
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_order_status();

-- Trigger after DELETE
DROP TRIGGER IF EXISTS trigger_sync_wo_after_delete ON public.installations;
CREATE TRIGGER trigger_sync_wo_after_delete
  AFTER DELETE ON public.installations
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_order_status();

-- Trigger after UPDATE (in case work order field changes)
DROP TRIGGER IF EXISTS trigger_sync_wo_after_update ON public.installations;
CREATE TRIGGER trigger_sync_wo_after_update
  AFTER UPDATE ON public.installations
  FOR EACH ROW
  WHEN (OLD.work_order IS DISTINCT FROM NEW.work_order)
  EXECUTE FUNCTION sync_work_order_status();

-- ===== Helper function: Get available work orders =====
-- Returns work orders that are pending (not yet used in installations)
CREATE OR REPLACE FUNCTION get_available_work_orders()
RETURNS TABLE (
  id UUID,
  work_order_no TEXT,
  work_order_date DATE,
  project_name TEXT,
  project_location TEXT,
  lights_count NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.work_order_no,
    w.work_order_date,
    w.project_name,
    w.project_location,
    w.lights_count,
    w.status
  FROM public.jcr_work_orders w
  WHERE w.status = 'pending'
  ORDER BY w.work_order_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ===== Comments =====
COMMENT ON FUNCTION sync_work_order_status() IS 
  'Automatically updates jcr_work_orders.status based on installations count';
COMMENT ON FUNCTION get_available_work_orders() IS 
  'Returns list of work orders available for assignment (status=pending)';
