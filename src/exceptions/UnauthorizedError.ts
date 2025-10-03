export class UnauthorizedError extends Error {
  constructor(message = "Usuário não autorizado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}