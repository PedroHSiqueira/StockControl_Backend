import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import fastifyJwt from "@fastify/jwt";
import "./lib/servico-estoque";

import * as Routes from "./routes";
import { inicializarServicoEstoque } from "./lib/servico-estoque";

inicializarServicoEstoque();

const app = fastify({
  connectionTimeout: 120000,
  requestTimeout: 120000,
  bodyLimit: 20 * 1024 * 1024,
});

app.register(fastifyCors, {
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "user-id", "client_key", "Accept"],
  credentials: true,
});

app.register(fastifyMultipart, {
  limits: {
    fileSize: 20 * 1024 * 1024,
    fieldSize: 20 * 1024 * 1024,
    fields: 50,
    files: 10,
    headerPairs: 2000,
  },
  attachFieldsToBody: false,
});

app.register(fastifyJwt, { secret: process.env.JWT_SECRET || "supersecret" });

app.register(Routes.permissoesRoutes);
app.register(Routes.getUsers);
app.register(Routes.getEmpresa);
app.register(Routes.getNotificacao);
app.register(Routes.updateNotificacao);
app.register(Routes.notificacoesLidas);
app.register(Routes.verificarEstoque);
app.register(Routes.createUser);
app.register(Routes.deleteUser);
app.register(Routes.updateUser);
app.register(Routes.exportRoutes);
app.register(Routes.createFornecedor);
app.register(Routes.getFornecedor);
app.register(Routes.deleteFornecedor);
app.register(Routes.updateFornecedor);
app.register(Routes.createProduto);
app.register(Routes.getProduto);
app.register(Routes.deleteProduto);
app.register(Routes.updateProduto);
app.register(Routes.createCategorias);
app.register(Routes.getCategorias);
app.register(Routes.deleteCategorias);
app.register(Routes.updateCategorias);
app.register(Routes.createEmpresa);
app.register(Routes.deleteEmpresa);
app.register(Routes.updateEmpresa);
app.register(Routes.createNotificacao);
app.register(Routes.deleteNotificacao);
app.register(Routes.createConvite);
app.register(Routes.getConvite);
app.register(Routes.deleteConvite);
app.register(Routes.updateConvite);
app.register(Routes.createCliente);
app.register(Routes.getCliente);
app.register(Routes.deleteCliente);
app.register(Routes.updateCliente);
app.register(Routes.createKey);
app.register(Routes.getKey);
app.register(Routes.updateKey);
app.register(Routes.createVenda);
app.register(Routes.getVendas);
app.register(Routes.loginUser);
app.register(Routes.catalogoEmpresa);
app.register(Routes.toggleCatalogo);
app.register(Routes.getLogs);
app.register(Routes.emailRoutes);
app.register(Routes.postpedidos);
app.register(Routes.getpedidos);
app.register(Routes.updatepedidos);
app.register(Routes.movimentacoesEstoqueRoutes);

app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ message: "Token inválido ou expirado" });
  }
});

app.get("/", async (request, reply) => {
  return reply.status(200).send({ mensagem: "API Fastfy: StockControl" });
});

app.listen({ port: 3001 }).then(() => {
  console.log("🚀 Servidor rodando na porta 3001");
});
