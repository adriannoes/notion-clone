import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads an image file to Supabase Storage
 * @param file - The image file to upload
 * @param bucket - The storage bucket name (default: 'page-images')
 * @returns Promise<string> - The public URL of the uploaded image
 */
export async function uploadImage(
  file: File, 
  bucket: string = 'page-images'
): Promise<string> {
  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  // Upload file to storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Deletes an image from Supabase Storage
 * @param url - The public URL of the image to delete
 * @param bucket - The storage bucket name (default: 'page-images')
 */
export async function deleteImage(
  url: string, 
  bucket: string = 'page-images'
): Promise<void> {
  // Extract file path from URL
  const urlParts = url.split('/');
  const fileName = urlParts[urlParts.length - 1];
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([fileName]);

  if (error) {
    console.warn(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Checks if a URL is a Supabase Storage URL
 * @param url - The URL to check
 * @returns boolean
 */
export function isStorageUrl(url: string): boolean {
  return url.includes('supabase') && url.includes('storage');
}

/**
 * Converts base64 data URL to File object
 * @param dataUrl - The base64 data URL
 * @param filename - The filename for the File object
 * @returns File
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}
