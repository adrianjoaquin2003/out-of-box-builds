-- Update incorrectly marked processed files that have no data
UPDATE uploaded_files 
SET upload_status = 'failed'
WHERE upload_status = 'processed' 
AND id NOT IN (SELECT DISTINCT file_id FROM telemetry_data);