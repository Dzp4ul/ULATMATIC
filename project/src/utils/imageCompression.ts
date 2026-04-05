export async function compressImage(file: File, maxSizeMB: number = 5): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  // If already under limit, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // More aggressive resizing for very large files
        let maxDimension = 1920;
        if (file.size > 10 * 1024 * 1024) {
          // Files over 10MB: resize to 1280px max
          maxDimension = 1280;
        } else if (file.size > 7 * 1024 * 1024) {
          // Files over 7MB: resize to 1600px max
          maxDimension = 1600;
        }
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels to get under size limit
        const tryCompress = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              if (blob.size > maxSizeBytes && quality > 0.3) {
                // Try with lower quality
                tryCompress(quality - 0.1);
              } else {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        // Start with lower quality for very large files
        const startQuality = file.size > 10 * 1024 * 1024 ? 0.7 : 0.9;
        tryCompress(startQuality);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}
