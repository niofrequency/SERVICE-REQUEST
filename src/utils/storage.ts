// src/utils/storage.ts
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

export const uploadImageToStorage = async (
  base64Str: string, 
  containerId: string, 
  type: "damage" | "repair"
): Promise<string> => {
  try {
    // If it is already a regular http/https URL from a previous upload, return it directly
    if (!base64Str.startsWith("data:image")) {
      return base64Str;
    }

    // Generate a unique filename to prevent overwrites
    const filename = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, `service_requests/${containerId}/${filename}`);

    // Upload base64 data string to the explicit Firebase Storage bucket
    const snapshot = await uploadString(storageRef, base64Str, 'data_url');
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    return downloadUrl;
  } catch (error) {
    console.error("Firebase Storage upload failed: ", error);
    throw error;
  }
};
