-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.project_notifications;

-- Create a more restrictive policy that allows authenticated users to insert notifications for projects they have access to
CREATE POLICY "Users can insert notifications for accessible projects"
ON public.project_notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id
  )
);