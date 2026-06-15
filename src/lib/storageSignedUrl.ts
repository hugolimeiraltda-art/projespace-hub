import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the object path inside a Supabase Storage bucket from a stored value
 * that may already be a path or may be a (legacy) public URL / signed URL.
 */
export function extractStoragePath(bucket: string, value: string): string {
  if (!value) return value;
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/authenticated/${bucket}/`,
  ];
  for (const marker of markers) {
    const idx = value.indexOf(marker);
    if (idx !== -1) return value.slice(idx + marker.length).split("?")[0];
  }
  return value;
}

const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Returns a short-lived signed URL for a file in a private bucket.
 * Accepts either a raw path or a legacy public URL.
 */
export async function getSignedFileUrl(
  bucket: string,
  value: string,
  expiresIn = 3600,
): Promise<string> {
  if (!value) return "";
  const path = extractStoragePath(bucket, value);
  const cacheKey = `${bucket}:${path}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return "";
  cache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return data.signedUrl;
}
