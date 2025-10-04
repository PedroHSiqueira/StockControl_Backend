export class PhotoUploadError extends Error {
  constructor(message = "Erro no upload da foto") {
    super(message);
    this.name = "PhotoUploadError";
  }
}