import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UploadResult {
  url: string;
  path: string;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (
    file: File,
    projectId: string,
    folder: string = 'attachments'
  ): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('project-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading file:', error);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-attachments')
        .getPublicUrl(data.path);

      setUploadProgress(100);
      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Error in uploadFile:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMultipleFiles = async (
    files: File[],
    projectId: string,
    folder: string = 'attachments'
  ): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round((i / files.length) * 100));
      
      const result = await uploadFile(file, projectId, folder);
      if (result) {
        results.push(result);
      }
    }
    
    setUploadProgress(100);
    return results;
  };

  const deleteFile = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('project-attachments')
        .remove([path]);

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteFile:', error);
      return false;
    }
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    isUploading,
    uploadProgress,
  };
}
