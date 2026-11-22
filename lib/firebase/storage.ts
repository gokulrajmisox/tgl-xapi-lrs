"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseAuth, getFirebaseStorage } from "./client";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SUBMISSION_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const ALLOWED_SUBMISSION_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "application/zip",
  "text/plain",
  "text/markdown",
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
}

export async function uploadProfileImageToStorage(file: File): Promise<{
  downloadUrl: string;
  storagePath: string;
}> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Sign in required before uploading a profile photo.");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only PNG, JPEG, or WebP images are supported.");
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Profile image must be smaller than 5 MB.");
  }

  const storagePath = `profile_images/${user.uid}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const storageRef = ref(getFirebaseStorage(), storagePath);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: { uploadedBy: user.uid },
  });
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return { downloadUrl, storagePath };
}

export async function uploadSubmissionFileToStorage(file: File): Promise<{
  name: string;
  sizeBytes: number;
  mimeType: string;
  storagePath: string;
  downloadUrl: string;
}> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Sign in required before uploading submission artifacts.");
  }
  if (file.type && !ALLOWED_SUBMISSION_TYPES.has(file.type)) {
    throw new Error(
      "Supported artifacts: PDF, ZIP, PNG, JPG, WebP, TXT, or Markdown files.",
    );
  }
  if (file.size <= 0 || file.size > MAX_SUBMISSION_BYTES) {
    throw new Error("Uploaded deliverable files must be smaller than 10 MB.");
  }

  const storagePath = `submissions/${user.uid}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const storageRef = ref(getFirebaseStorage(), storagePath);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
    customMetadata: { uploadedBy: user.uid },
  });
  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    storagePath,
    downloadUrl,
  };
}
