-- Clear telemetry data for re-processing with fixed numeric parsing
DELETE FROM public.telemetry_data WHERE session_id = '2cf4b082-ac36-4166-89aa-0ff0be3a2f1a';