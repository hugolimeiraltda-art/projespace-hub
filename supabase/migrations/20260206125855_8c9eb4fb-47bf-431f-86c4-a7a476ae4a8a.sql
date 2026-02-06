-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their notifications" ON project_notifications;

-- Create new SELECT policy that allows admins to see all notifications
CREATE POLICY "Users can view their notifications" 
ON project_notifications 
FOR SELECT 
USING (
  -- Admins can see all notifications
  has_role(auth.uid(), 'admin')
  OR
  -- Direct user notifications
  for_user_id = auth.uid()
  OR
  -- Role-based notifications
  (for_role IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role::text = for_role
  ))
);

-- Also update the UPDATE policy
DROP POLICY IF EXISTS "Users can update their notifications" ON project_notifications;

CREATE POLICY "Users can update their notifications"
ON project_notifications
FOR UPDATE
USING (
  -- Admins can update all notifications
  has_role(auth.uid(), 'admin')
  OR
  -- Direct user notifications
  for_user_id = auth.uid()
  OR
  -- Role-based notifications
  (for_role IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role::text = for_role
  ))
);