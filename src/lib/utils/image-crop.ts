export interface CropParams {
  imagePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
  outputFormat?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export interface CropResponse {
  success: boolean;
  message?: string;
  imageBlob?: Blob;
}

/**
 * Crop an image using the image-crop API
 * @param params - Crop parameters
 * @returns Promise with the cropped image as a Blob
 */
export async function cropImage(params: CropParams): Promise<CropResponse> {
  try {
    const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
    
    const response = await fetch(`${BASE_PATH}/api/image-crop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to crop image',
      };
    }

    const imageBlob = await response.blob();
    
    return {
      success: true,
      imageBlob,
    };
  } catch (error) {
    console.error('Error cropping image:', error);
    return {
      success: false,
      message: 'Network error while cropping image',
    };
  }
}

/**
 * Convert a cropped image blob to a data URL
 * @param blob - The cropped image blob
 * @returns Promise with the data URL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download a cropped image blob
 * @param blob - The cropped image blob
 * @param filename - The filename for the download
 */
export function downloadCroppedImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 