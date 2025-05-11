import multer from 'fastify-multer';

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  const filetypes = /jpeg|jpg|png|gif|jfif|webp|bmp|tiff|svg/;
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Arquivo não suportado'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter,
});

export default upload;