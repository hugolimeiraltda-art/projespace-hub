import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Extracts the storage path from a Supabase URL (signed or public).
 */
function extractStoragePath(url: string): string | null {
  try {
    // Pattern: /storage/v1/object/sign/bucket-name/path?token=...
    let match = url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
    if (match) {
      const fullPath = decodeURIComponent(match[1]);
      const parts = fullPath.split('/');
      return parts.slice(1).join('/') || null;
    }
    // Pattern: /storage/v1/object/public/bucket-name/path
    match = url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
    if (match) {
      const fullPath = decodeURIComponent(match[1]);
      const parts = fullPath.split('/');
      return parts.slice(1).join('/') || null;
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

export function isPublicStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/');
}

export function isStorageUrl(url: string): boolean {
  return isSignedStorageUrl(url) || isPublicStorageUrl(url);
}

export function useAttachmentUrl() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openAttachment = useCallback(async (url: string, e?: React.MouseEvent) => {
    if (isBlobUrl(url)) {
      e?.preventDefault();
      return; // Can't open blob URLs
    }

    if (isStorageUrl(url)) {
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
      // External URL
      window.open(url, '_blank');
    }
  }, []);

  return { openAttachment, isRefreshing };
}
