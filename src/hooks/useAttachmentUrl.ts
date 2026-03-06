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

  const downloadFile = useCallback(async (fileUrl: string, fileName?: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || fileUrl.split('/').pop()?.split('?')[0] || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(fileUrl, '_blank');
    }
  }, []);

  const openAttachment = useCallback(async (url: string, e?: React.MouseEvent, fileName?: string) => {
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
            .createSignedUrl(path, 60 * 60, { download: true });

          if (!error && data?.signedUrl) {
            await downloadFile(data.signedUrl, fileName || path.split('/').pop());
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
  }, [downloadFile]);

  return { openAttachment, isRefreshing };
}
