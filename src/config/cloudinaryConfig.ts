import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryUploadOptions = {
  resource_type: "auto" as const,
  chunk_size: 6 * 1024 * 1024, 
  timeout: 120000,
  upload_preset: "seu_upload_preset", 
};
export default cloudinary;