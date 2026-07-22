// src/utils/storage.ts
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase.js";

/**
 * Compresses a base64 image string until it is under the target size (in KB).
 */
const compressBase64Image = async (base64Str: string, maxSizeKB: number = 500): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Optional: Prevent excessively large dimensions
      const MAX_DIMENSION = 1920;
      if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        resolve(base64Str); // Fallback if canvas context fails
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.9;
      let compressedDataUrl = canvas.toDataURL("image/jpeg", quality);

      // Iteratively lower quality until under target size (DataURL length * 3 / 4 gives rough byte size)
      while ((compressedDataUrl.length * 3) / 4 > maxSizeKB * 1024 && quality > 0.1) {
        quality -= 0.1;
        compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      resolve(compressedDataUrl);
    };
    img.onerror = (error) => reject(error);
  });
};

export const uploadImageToStorage = async (
  base64Str: string,
  containerId: string,
  type: "damage" | "repair"
): Promise<string> => {
  try {
    // If the image is already a public URL or invalid, return it directly
    if (!base64Str || !base64Str.startsWith("data:image")) {
      return base64Str;
    }

    // Compress the base64 image to target under 500KB
    const optimizedBase64 = await compressBase64Image(base64Str, 500);

    // Unique filename generation
    const filename = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, `service_requests/${containerId}/${filename}`);

    // Upload optimized data_url string to Firebase Storage
    const snapshot = await uploadString(storageRef, optimizedBase64, "data_url");
    
    // Retrieve download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error("Firebase Storage Upload & Compression Failed:", error);
    throw error;
  }
};
