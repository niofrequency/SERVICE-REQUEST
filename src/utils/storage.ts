// src/utils/storage.ts
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase.js";

export const uploadImageToStorage = async (
  base64Str: string,
  containerId: string,
  type: "damage" | "repair"
): Promise<string> => {
  try {
    // If the image is already a public URL, return it directly
    if (!base64Str || !base64Str.startsWith("data:image")) {
      return base64Str;
    }

    // Unique filename generation
    const filename = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, `service_requests/${containerId}/${filename}`);

    // Upload data_url string to Firebase Storage
    const snapshot = await uploadString(storageRef, base64Str, "data_url");
    
    // Retrieve download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error("Firebase Storage Upload Failed:", error);
    throw error;
  }
};
