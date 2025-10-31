-- Allow users to delete telemetry data for their sessions
CREATE POLICY "Users can delete telemetry data for their sessions"
ON public.telemetry_data
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM sessions
  WHERE sessions.id = telemetry_data.session_id
  AND sessions.user_id = auth.uid()
));