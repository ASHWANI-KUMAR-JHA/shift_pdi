import { supabase } from './supabase';

/**
 * Fetch available (pending) work orders from JCR tracking
 * These are work orders that can be assigned to new installations
 */
export async function fetchAvailableWorkOrders() {
  try {
    const { data, error } = await supabase
      .from('jcr_work_orders')
      .select('id, work_order_no, work_order_date, project_name, project_location, lights_count, status')
      .eq('status', 'pending')
      .order('work_order_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching available work orders:', err);
    throw err;
  }
}

/**
 * Fetch all work orders (for reference/display)
 */
export async function fetchAllWorkOrders() {
  try {
    const { data, error } = await supabase
      .from('jcr_work_orders')
      .select('id, work_order_no, work_order_date, project_name, project_location, lights_count, status')
      .order('work_order_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching work orders:', err);
    throw err;
  }
}

/**
 * Get work order details by work order number
 */
export async function getWorkOrderByNumber(workOrderNo) {
  try {
    const { data, error } = await supabase
      .from('jcr_work_orders')
      .select('*')
      .eq('work_order_no', workOrderNo)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching work order:', err);
    return null;
  }
}

/**
 * Count installations for a specific work order
 */
export async function countInstallationsForWorkOrder(workOrderNo) {
  try {
    const { count, error } = await supabase
      .from('installations')
      .select('*', { count: 'exact', head: true })
      .eq('work_order', workOrderNo);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('Error counting installations:', err);
    return 0;
  }
}
