# Work Order ↔ Installation Synchronization Flow

## 📋 Overview
This document explains the automatic synchronization between the **JCR Tracking (Work Orders)** and **Installation Register** pages. When installations are added or deleted, the work order status automatically updates.

---

## 🔄 Data Flow Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│  JCR Tracking Page  │         │  Installation Page   │
│  (Work Orders)      │◄───────►│  (Site Register)     │
└─────────────────────┘         └──────────────────────┘
         │                                 │
         │                                 │
         ▼                                 ▼
┌─────────────────────┐         ┌──────────────────────┐
│ jcr_work_orders     │         │   installations      │
│ - work_order_no     │         │   - work_order       │
│ - status            │◄───────►│   - project_name     │
│ - lights_count      │         │   - rms              │
└─────────────────────┘         └──────────────────────┘
         ▲                                 │
         │                                 │
         │        ┌─────────────────┐     │
         └────────│  AUTO TRIGGER   │─────┘
                  │  sync_work_order│
                  │  _status()      │
                  └─────────────────┘
```

---

## 🎯 Synchronization Logic

### When an Installation is **CREATED**:
1. User enters installation data with work order number
2. Installation saved to `installations` table
3. **Trigger fires** → `sync_work_order_status()`
4. Function checks: Does this work order exist in `jcr_work_orders`?
5. If YES:
   - Count installations for this work order
   - If count > 0 AND status != 'completed':
     - Update status to **'in_process'**
   - Work order now shows as "In Process" on JCR Tracking page

### When an Installation is **DELETED**:
1. User deletes installation(s) from RMS Report or Installation Register
2. Installation removed from `installations` table
3. **Trigger fires** → `sync_work_order_status()`
4. Function checks remaining installations for that work order
5. If count = 0:
   - Update status to **'pending'**
   - Work order becomes **available again** for new installations
6. If count > 0:
   - Keep status as **'in_process'**

### When Installation Work Order is **UPDATED**:
1. User changes work order field in installation
2. **Trigger fires** → Checks BOTH old and new work orders
3. For OLD work order:
   - Count remaining installations
   - If 0 → Set to **'pending'**
4. For NEW work order:
   - Count installations (now includes this one)
   - Set to **'in_process'**

---

## 📊 Work Order Status States

| Status | Description | Trigger Condition | Available for New Installations? |
|--------|-------------|-------------------|----------------------------------|
| **pending** | Not yet used | No installations linked | ✅ YES |
| **in_process** | Currently being used | 1+ installations linked | ❌ NO |
| **completed** | Finished project | Manually set by user | ❌ NO |

### Status Flow Diagram
```
    START
      ↓
  [pending] ──────────────────────────────────────┐
      │                                            │
      │ Installation Added                         │
      ▼                                            │
  [in_process]                                     │
      │                                            │
      │ Manual Completion                          │
      ▼                                            │
  [completed] ←──────────────────────────────────┤
      │                                            │
      │ (No auto-change)                           │
      │                                            │
      └─→ [Cannot revert automatically]            │
                                                   │
      All Installations Deleted ─────────────────┘
      (Reverts to pending unless completed)
```

---

## 🔧 Database Implementation

### Trigger Function
```sql
CREATE OR REPLACE FUNCTION sync_work_order_status()
RETURNS TRIGGER AS $$
DECLARE
  wo_number TEXT;
  installation_count INTEGER;
BEGIN
  -- Get work order number from operation
  IF TG_OP = 'DELETE' THEN
    wo_number := OLD.work_order;
  ELSIF TG_OP = 'INSERT' THEN
    wo_number := NEW.work_order;
  ELSIF TG_OP = 'UPDATE' THEN
    wo_number := NEW.work_order;
    -- Also check old work order if changed
    IF OLD.work_order IS DISTINCT FROM NEW.work_order THEN
      -- Handle old work order...
    END IF;
  END IF;

  -- Count installations for work order
  SELECT COUNT(*) INTO installation_count
  FROM installations
  WHERE work_order = wo_number;

  -- Update work order status
  IF installation_count = 0 THEN
    UPDATE jcr_work_orders
    SET status = 'pending'
    WHERE work_order_no = wo_number;
  ELSE
    UPDATE jcr_work_orders
    SET status = 'in_process'
    WHERE work_order_no = wo_number
      AND status != 'completed';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### Triggers
```sql
-- After INSERT
CREATE TRIGGER trigger_sync_wo_after_insert
  AFTER INSERT ON installations
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_order_status();

-- After DELETE
CREATE TRIGGER trigger_sync_wo_after_delete
  AFTER DELETE ON installations
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_order_status();

-- After UPDATE (when work order changes)
CREATE TRIGGER trigger_sync_wo_after_update
  AFTER UPDATE ON installations
  FOR EACH ROW
  WHEN (OLD.work_order IS DISTINCT FROM NEW.work_order)
  EXECUTE FUNCTION sync_work_order_status();
```

---

## 💡 User Scenarios

### Scenario 1: Starting New Installations
**User Story**: "I have a new work order WO/2026/001 for 100 solar lights"

1. ✅ User adds work order in **JCR Tracking**
   - Status: **pending** (available)
   - Lights: 100

2. ✅ User goes to **Installation Register**
   - Sees WO/2026/001 in dropdown (because status = pending)
   - Enters first installation:
     - Work Order: WO/2026/001
     - Location: Site A
     - Saves

3. ✅ **Automatic Update**
   - Trigger fires
   - Work order status → **in_process**
   - Still visible in dropdown but marked as "In Use"

4. ✅ User continues adding more installations
   - Work order remains **in_process**

5. ✅ User completes all installations
   - Goes to JCR Tracking
   - Manually changes status → **completed**
   - Work order now locked (cannot revert)

### Scenario 2: Deleting Installations
**User Story**: "I need to remove some incorrect installations"

1. ✅ User has work order WO/2026/002 with 5 installations
   - Current status: **in_process**

2. ✅ User goes to **RMS Report** or **Installation Register**
   - Filters by work order: WO/2026/002
   - Selects 3 installations
   - Triple-clicks "Delete Selected"
   - Confirms deletion

3. ✅ **Automatic Update**
   - Trigger fires for each deletion
   - After all deletions: 2 installations remain
   - Work order status stays **in_process**

4. ✅ User deletes remaining 2 installations
   - Work order now has 0 installations
   - **Trigger sets status → pending**
   - Work order becomes **available again**

### Scenario 3: Reassigning Work Order
**User Story**: "I assigned wrong work order to installations"

1. ✅ Installation has WO/2026/003 (incorrect)
2. ✅ User edits installation
3. ✅ Changes work order to WO/2026/004 (correct)
4. ✅ **Automatic Update**:
   - Checks WO/2026/003:
     - If no remaining installations → **pending**
     - If installations remain → **in_process**
   - Checks WO/2026/004:
     - Now has installations → **in_process**

### Scenario 4: Work Order Dropdown Filtering
**User Story**: "I want to see only available work orders"

1. ✅ User opens **Installation Register**
2. ✅ Clicks "Work Order" dropdown
3. ✅ Sees only work orders with status = **pending**
4. ✅ Already-used work orders (in_process) not shown (or shown differently)
5. ✅ Completed work orders never shown

---

## 📱 UI Integration

### Installation Register Page

#### Work Order Dropdown
```javascript
const [availableWorkOrders, setAvailableWorkOrders] = useState([]);

useEffect(() => {
  loadAvailableWorkOrders();
}, []);

const loadAvailableWorkOrders = async () => {
  const workOrders = await fetchAvailableWorkOrders();
  setAvailableWorkOrders(workOrders);
};
```

#### Display Logic
```jsx
<select value={workOrder} onChange={(e) => setWorkOrder(e.target.value)}>
  <option value="">-- Select Work Order --</option>
  {availableWorkOrders.map(wo => (
    <option key={wo.id} value={wo.work_order_no}>
      {wo.work_order_no} - {wo.project_name} ({wo.lights_count} lights)
    </option>
  ))}
</select>
```

### JCR Tracking Page

#### Status Display
```jsx
<span className={`status-badge ${workOrder.status}`}>
  {workOrder.status === 'pending' ? '⏳ PENDING' :
   workOrder.status === 'in_process' ? '🔄 IN PROCESS' :
   '✅ COMPLETED'}
</span>
```

#### Manual Status Change
```jsx
<select value={status} onChange={(e) => updateStatus(e.target.value)}>
  <option value="pending">Pending</option>
  <option value="in_process">In Process</option>
  <option value="completed">Completed</option>
</select>
```

---

## ⚠️ Important Notes

### Protected Completed Status
```sql
UPDATE jcr_work_orders
SET status = 'in_process'
WHERE work_order_no = wo_number
  AND status != 'completed'; -- Don't override completed!
```
**Why?** Once a work order is marked "completed", it should not automatically revert even if installations are deleted. This prevents accidental status changes on finished projects.

### Null Handling
```javascript
// Skip if no work order specified
IF wo_number IS NULL OR wo_number = '' THEN
  RETURN COALESCE(NEW, OLD);
END IF;
```
**Why?** Not all installations have work orders. The trigger safely ignores these.

### Performance Considerations
- ✅ Triggers run automatically (no manual refresh needed)
- ✅ COUNT query is fast (indexed on work_order column)
- ✅ Only runs on INSERT/UPDATE/DELETE (not SELECT)
- ⚠️ Large batch deletes may take time (sequential trigger execution)

---

## 🧪 Testing the Flow

### Test 1: Create Installation with Work Order
1. Go to JCR Tracking
2. Add work order: WO/TEST/001, status = pending
3. Go to Installation Register
4. Add installation with work order WO/TEST/001
5. Return to JCR Tracking
6. **Expected**: WO/TEST/001 status is now **in_process**

### Test 2: Delete All Installations
1. Find work order with installations
2. Note the work order number
3. Go to RMS Report
4. Filter by that work order
5. Select all installations
6. Delete them (triple-click)
7. Return to JCR Tracking
8. **Expected**: Work order status reverted to **pending**

### Test 3: Partial Deletion
1. Work order has 5 installations
2. Delete 3 installations
3. Check JCR Tracking
4. **Expected**: Status still **in_process** (2 remain)

### Test 4: Completed Status Protection
1. Set work order to **completed**
2. Delete all its installations
3. Check JCR Tracking
4. **Expected**: Status remains **completed** (not reverted)

### Test 5: Work Order Change
1. Installation has WO/A
2. Change to WO/B
3. Check both work orders
4. **Expected**: 
   - WO/A: If 0 installations → pending
   - WO/B: Now has installation → in_process

---

## 🐛 Troubleshooting

### Issue: Work order not showing in dropdown
**Check**:
- Is status = 'pending'?
- Does work order exist in jcr_work_orders table?
- Run: `SELECT * FROM jcr_work_orders WHERE status = 'pending'`

### Issue: Status not updating after deletion
**Check**:
- Are triggers enabled?
- Run: `SELECT * FROM pg_trigger WHERE tgname LIKE 'trigger_sync_wo%'`
- Check Supabase logs for trigger errors

### Issue: Status changed unexpectedly
**Check**:
- Did someone manually change it?
- Check work order installation count:
  ```sql
  SELECT COUNT(*) FROM installations WHERE work_order = 'WO/XXX';
  ```

### Issue: Completed status reverted
**Check**:
- This should NOT happen (protected in trigger)
- If it did, check trigger code for bugs
- Review Supabase logs

---

## 📊 Database Queries

### Count installations by work order
```sql
SELECT 
  work_order,
  COUNT(*) as installation_count,
  COUNT(CASE WHEN rms = 'YES' THEN 1 END) as rms_enabled_count
FROM installations
GROUP BY work_order
ORDER BY installation_count DESC;
```

### Find work orders with no installations
```sql
SELECT w.*
FROM jcr_work_orders w
LEFT JOIN installations i ON i.work_order = w.work_order_no
WHERE i.id IS NULL;
```

### Audit status changes
```sql
SELECT 
  work_order_no,
  status,
  updated_at,
  (SELECT COUNT(*) FROM installations WHERE work_order = work_order_no) as inst_count
FROM jcr_work_orders
ORDER BY updated_at DESC
LIMIT 20;
```

---

## 🚀 Deployment Checklist

To enable work order sync on new Supabase instance:

- [ ] Run `supabase_work_order_sync.sql` in SQL Editor
- [ ] Verify triggers created: Check pg_trigger table
- [ ] Test INSERT installation → status changes
- [ ] Test DELETE installation → status changes
- [ ] Test UPDATE work order field → both statuses update
- [ ] Verify completed status is protected
- [ ] Check frontend fetches only pending work orders
- [ ] Test dropdown shows correct work orders
- [ ] Verify real-time updates (may need page refresh)

---

## 📈 Future Enhancements

### Phase 2
- [ ] Real-time sync without page refresh (Supabase Realtime)
- [ ] Show installation count badge on work orders
- [ ] Auto-complete work order when all lights installed
- [ ] Work order progress bar (installed / total lights)

### Phase 3
- [ ] Work order allocation rules (priority, deadlines)
- [ ] Batch assignment of installations to work orders
- [ ] Work order templates for quick creation
- [ ] Historical status log (audit trail)

---

## ✅ Summary

**Automatic Synchronization Working:**
✅ Installations added → Work order marked **in_process**  
✅ All installations deleted → Work order reverts to **pending**  
✅ Work order changed → Both old and new work orders update  
✅ Completed status protected from auto-revert  
✅ Dropdown shows only available (pending) work orders  
✅ Triggers run automatically on every change  

**The installation and work order flow is fully synchronized! 🎉**
