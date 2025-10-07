export class OrderNotFoundException extends Error {
  constructor(message: string = "Pedido não encontrado!") {
    super(message);
    this.name = "OrderNotFoundException";
  }
}
