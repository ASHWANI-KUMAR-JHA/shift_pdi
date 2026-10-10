import { supabase } from './supabase';

export const JCR_WORK_ORDERS_TABLE = 'jcr_work_orders';
export const JCR_COMMENTS_TABLE = 'jcr_comments';
export const JCR_FILES_TABLE = 'jcr_files';

// Fetch all work orders with their stats
export async function fetchJCRWorkOrders() {
  const { data, error } = await supabase
    .from(JCR_WORK_ORDERS_TABLE)
    .select('*')
    .order('work_order_date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Create a new work order
export async function createJCRWorkOrder(workOrder) {
  const { data, error } = await supabase
    .from(JCR_WORK_ORDERS_TABLE)
    .insert([workOrder])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update work order
export async function updateJCRWorkOrder(id, updates) {
  const { data, error } = await supabase
    .from(JCR_WORK_ORDERS_TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Delete work order
export async function deleteJCRWorkOrder(id) {
  const { error } = await supabase
    .from(JCR_WORK_ORDERS_TABLE)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Fetch comments for a work order
export async function fetchComments(workOrderId) {
  const { data, error } = await supabase
    .from(JCR_COMMENTS_TABLE)
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// Add comment
export async function addComment(workOrderId, commentText, createdBy) {
  const { data, error } = await supabase
    .from(JCR_COMMENTS_TABLE)
    .insert([{
      work_order_id: workOrderId,
      comment_text: commentText,
      created_by: createdBy,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update comment
export async function updateComment(commentId, commentText) {
  const { data, error } = await supabase
    .from(JCR_COMMENTS_TABLE)
    .update({ 
      comment_text: commentText,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Delete comment
export async function deleteComment(commentId) {
  const { error } = await supabase
    .from(JCR_COMMENTS_TABLE)
    .delete()
    .eq('id', commentId);
  
  if (error) throw error;
}

// Fetch files for a work order
export async function fetchFiles(workOrderId) {
  const { data, error } = await supabase
    .from(JCR_FILES_TABLE)
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('uploaded_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Upload file metadata (actual file upload handled separately)
export async function addFileMetadata(workOrderId, fileName, filePath, fileSize, fileType, uploadedBy) {
  const { data, error } = await supabase
    .from(JCR_FILES_TABLE)
    .insert([{
      work_order_id: workOrderId,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      file_type: fileType,
      uploaded_by: uploadedBy,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Delete file metadata
export async function deleteFileMetadata(fileId) {
  const { error } = await supabase
    .from(JCR_FILES_TABLE)
    .delete()
    .eq('id', fileId);
  
  if (error) throw error;
}

// Upload file to Supabase Storage
export async function uploadJCRFile(workOrderId, file) {
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `jcr_work_orders/${workOrderId}/${fileName}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('work_order_files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (uploadError) throw uploadError;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('work_order_files')
    .getPublicUrl(filePath);
  
  return { filePath, publicUrl, fileName };
}

// Delete file from Supabase Storage
export async function deleteJCRFile(filePath) {
  const { error } = await supabase.storage
    .from('work_order_files')
    .remove([filePath]);
  
  if (error) throw error;
}

// Get file public URL
export function getJCRFileUrl(filePath) {
  const { data } = supabase.storage
    .from('work_order_files')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

// Export functions for Excel/CSV
export function exportToCleanExcel(workOrders) {
  // This will be used with a library like xlsx
  const exportData = workOrders.map(wo => ({
    'Work Order No': wo.work_order_no,
    'Work Order Date': formatDate(wo.work_order_date),
    'Client Name': wo.client_name,
    'Project Name': wo.project_name,
    'Project Location': wo.project_location,
    'Lights': wo.lights_count || '',
    'Work Order Value': wo.work_order_value,
    'Start Date': formatDate(wo.start_date),
    'Completion Date': formatDate(wo.completion_date),
    'Project Manager': wo.project_manager,
    'Responsible Person': wo.responsible_person,
    'Status': wo.status.toUpperCase(),
    'PDI Pending': wo.pdi_pending ? 'Yes' : 'No',
  }));
  
  return exportData;
}

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Get summary statistics
export function getJCRSummary(workOrders) {
  const summary = {
    total: workOrders.length,
    completed: 0,
    in_process: 0,
    pending: 0,
    totalValue: 0,
  };
  
  workOrders.forEach(wo => {
    summary[wo.status.toLowerCase().replace(' ', '_')]++;
    summary.totalValue += Number(wo.work_order_value) || 0;
  });
  
  return summary;
}
