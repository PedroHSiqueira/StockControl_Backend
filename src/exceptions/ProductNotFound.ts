export class ProductNotFoundException extends Error {
  constructor(message: string = "Produto não encontrado!") {
    super(message);
    this.name = "ProductNotFoundException";
  }
}
