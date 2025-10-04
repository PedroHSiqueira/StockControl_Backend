export class EmailInUseException extends Error {
  constructor(message: "Email já está em uso") {
    super(message);
    this.name = "EmailInUseException";
  }
}
