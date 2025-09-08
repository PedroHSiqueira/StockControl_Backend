import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";

import * as Routes from "./routes";

const app = fastify();

// Configuração do CORS
app.register(fastifyCors, {
  origin: ["https://stockcontrol-six.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "user-id", "client_key", "Accept"],
  credentials: true,
});

app.register(fastifyMultipart, {
  limits: {
    fileSize: 20 * 1024 * 1024,
    fields: 20,
  },
  attachFieldsToBody: false,
});

app.register(Routes.permissoesRoutes);

// Rotas de Usuarios
app.register(Routes.createUser);
app.register(Routes.getUsers);
app.register(Routes.deleteUser);
app.register(Routes.updateUser);

// Rota de Exportação
app.register(Routes.exportRoutes);

// Rotas de Fornecedores
app.register(Routes.createFornecedor);
app.register(Routes.getFornecedor);
app.register(Routes.deleteFornecedor);
app.register(Routes.updateFornecedor);

// Rotas de Produtos
app.register(Routes.createProduto);
app.register(Routes.getProduto);
app.register(Routes.deleteProduto);
app.register(Routes.updateProduto);

// Rotas de categorias
app.register(Routes.createCategorias);
app.register(Routes.getCategorias);
app.register(Routes.deleteCategorias);
app.register(Routes.updateCategorias);

// Rotas de Empresa
app.register(Routes.createEmpresa);
app.register(Routes.getEmpresa);
app.register(Routes.deleteEmpresa);
app.register(Routes.updateEmpresa);

// Rotas de Notificações
app.register(Routes.createNotificacao);
app.register(Routes.getNotificacao);
app.register(Routes.updateNotificacao);
app.register(Routes.deleteNotificacao);
app.register(Routes.notificacoesLidas);

//Rotas de convites
app.register(Routes.createConvite);
app.register(Routes.getConvite);
app.register(Routes.deleteConvite);
app.register(Routes.updateConvite);

// Rotas de Clientes
app.register(Routes.createCliente);
app.register(Routes.getCliente);
app.register(Routes.deleteCliente);
app.register(Routes.updateCliente);

//Rotas de chaves
app.register(Routes.createKey);
app.register(Routes.getKey);
app.register(Routes.updateKey);

//Rotas de Vendas
app.register(Routes.createVenda);
app.register(Routes.getVendas);

//Rotas Login
app.register(Routes.loginUser);

//Rotas de Catalogo
app.register(Routes.catalogoEmpresa);
app.register(Routes.toggleCatalogo);

// Rota Logs
app.register(Routes.getLogs);

// Rota de movimentações de estoque
app.register(Routes.movimentacoesEstoqueRoutes);

app.get("/", async (request, reply) => {
  return reply.status(200).send({ mensagem: "API Fastfy: StockControl" });
});

app.listen({ port: 3001 }).then(() => {
  console.log("Servidor rodando na porta 3001");
});
