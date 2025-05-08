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
import { createEmpresa } from "./routes/empresas/create-empresa";
import { getEmpresa } from "./routes/empresas/get-empresa";
import { deleteEmpresa } from "./routes/empresas/delete-empresa";
import { updateEmpresa } from "./routes/empresas/update-empresa";
import { createNotificacao } from "./routes/notificacao/create-notificacao";
import { getNotificacao } from "./routes/notificacao/get-notificacao";
import { updateNotificacao } from "./routes/notificacao/update-notificacao";
import { deleteNotificacao } from "./routes/notificacao/delete-notificacao";

const app = fastify();

// Configuração do CORS
app.register(fastifyCors, {
  origin: ['http://localhost:3000', 'https://stockcontrol-frontend.vercel.app'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id', 'client_key'], 
  credentials: true,
});

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

// Rotas de Empresa
app.register(createEmpresa);
app.register(getEmpresa);
app.register(deleteEmpresa);
app.register(updateEmpresa);

// Rotas Notificações
app.register(createNotificacao);
app.register(getNotificacao);
app.register(updateNotificacao);
app.register(deleteNotificacao);

//Rotas Login
app.register(loginUser);

app.get("/", async (request, reply) => {
  return reply.status(200).send({ mensagem: "API Fastfy: StockControl" });
});

app.listen({ port: 3001 }).then(() => {
  console.log("Servidor rodando na porta 3001");
});
