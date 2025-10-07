export class AccessDeniedException extends Error {
  constructor(message: string = "Acesso negado.") {
    super(message);
    this.name = "AccessDeniedException";
  }
}
