import { getSupabaseBrowserClient } from "./client";

/**
 * Upload a food image to Supabase Storage bucket ('menu-images').
 * Returns the public URL of the uploaded image.
 */
export async function uploadMenuImage(file: File): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  // Validate format
  const validMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!validMimeTypes.includes(file.type)) {
    throw new Error("Invalid image format. Please select JPEG, PNG, WebP, or AVIF.");
  }

  // Validate size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image exceeds maximum size of 5 MB.");
  }

  const extension = file.name.split(".").pop() || "jpg";
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const filePath = `items/${Date.now()}-${sanitizedName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("menu-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload to Supabase Storage failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from("menu-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
