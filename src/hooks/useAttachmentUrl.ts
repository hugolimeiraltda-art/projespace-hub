import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Extracts the storage path from a Supabase signed URL.
 * Signed URLs contain the path in the JWT payload or URL structure.
 */
function extractStoragePath(signedUrl: string): string | null {
  try {
    // Pattern: /storage/v1/object/sign/bucket-name/path?token=...
    const match = signedUrl.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
    if (match) {
      // Returns "bucket-name/path" - we need just the path after bucket
      const fullPath = decodeURIComponent(match[1]);
      // Remove bucket name (first segment)
      const parts = fullPath.split('/');
      const bucket = parts[0];
      const path = parts.slice(1).join('/');
      return path ? path : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith('data:');
}

export function isSignedStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/sign/');
}

export function useAttachmentUrl() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openAttachment = useCallback(async (url: string, e?: React.MouseEvent) => {
    if (isBlobUrl(url)) {
      e?.preventDefault();
      return; // Can't open blob URLs
    }

    if (isSignedStorageUrl(url)) {
      e?.preventDefault();
      setIsRefreshing(true);
      try {
        const path = extractStoragePath(url);
        if (path) {
          const { data, error } = await supabase.storage
            .from('project-attachments')
            .createSignedUrl(path, 60 * 60); // 1 hour

          if (!error && data?.signedUrl) {
            window.open(data.signedUrl, '_blank');
          } else {
            // Fallback: try opening the original URL
            window.open(url, '_blank');
          }
        } else {
          window.open(url, '_blank');
        }
      } catch {
        window.open(url, '_blank');
      } finally {
        setIsRefreshing(false);
      }
    } else {
      // Regular URL, let the browser handle it
    }
  }, []);

  return { openAttachment, isRefreshing };
}
