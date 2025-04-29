import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { createUser } from "./routes/usuarios/create-user";
import { getUsers } from "./routes/usuarios/get-users";
import { deleteUser } from "./routes/usuarios/delete-user";
import { updateUser } from "./routes/usuarios/update-user";
import { loginUser } from "./routes/autenticacao/login-user";
import { createFornecedor } from "./routes/fornecedores/create-fornecedor";
import { getFornecedor } from "./routes/fornecedores/get-fornecedor";
import { deleteFornecedor } from "./routes/fornecedores/delete-fornecedor";
import { updateFornecedor } from "./routes/fornecedores/update-fornecedor";
import { createProduto } from "./routes/produtos/create-produtos";
import { getProduto } from "./routes/produtos/get-produtos";
import { deleteProduto } from "./routes/produtos/delete-produtos";
import { updateProduto } from "./routes/produtos/update-produtos";
import { createCategorias } from "./routes/categorias/create-categorias";
import { getCategorias } from "./routes/categorias/get-categorias";
import { deleteCategorias } from "./routes/categorias/delete-categorias";
import { updateCategorias } from "./routes/categorias/update-categorias";

const app = fastify();
app.register(fastifyCors);

// Rotas de Usuarios
app.register(createUser);
app.register(getUsers);
app.register(deleteUser);
app.register(updateUser);

// Rotas de Fornecedores
app.register(createFornecedor);
app.register(getFornecedor);
app.register(deleteFornecedor);
app.register(updateFornecedor);

// Rotas de Produtos
app.register(createProduto);
app.register(getProduto);
app.register(deleteProduto);
app.register(updateProduto);

// Rotas de categorias
app.register(createCategorias);
app.register(getCategorias);
app.register(deleteCategorias);
app.register(updateCategorias);

//Rotas Login
app.register(loginUser);

app.get("/", async (request, reply) => {
  return reply.status(200).send({ mensagem: "Servidor rodando" });
});

app.listen({ port: 3001 }).then(() => {
  console.log("Servidor rodando na porta 3001");
});
