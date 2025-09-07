import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getEmpresa(app: FastifyInstance) {
  app.get("/empresa", async (request, reply) => {
    const empresas = await prisma.empresa.findMany({
      include: {
        Produto: true,
        ChaveAtivacao: true,
      },
    });
    reply.send(empresas);
  });

  app.get("/empresa/usuario/:idUsuario", async (request: FastifyRequest, reply: FastifyReply) => {
    const { idUsuario } = request.params as { idUsuario: string };

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: String(idUsuario),
      },
      include: {
        empresa: {
          include: {
            ChaveAtivacao: true,
          },
        },
      },
    });

    if (!usuario) {
      return reply.status(404).send({ mensagem: "Usuário não encontrado" });
    }

    reply.send(usuario.empresa);
  });

  app.get("/empresa/verificar-email/:email", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email } = request.params as { email: string };

      const empresaExistente = await prisma.empresa.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true, nome: true }
      });

      return reply.send({
        existe: !!empresaExistente,
        mensagem: empresaExistente
          ? "Este email já está em uso por outra empresa"
          : "Email disponível"
      });
    } catch (error) {
      console.error("Erro ao verificar email:", error);
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/empresa/verificar-dominio/:dominio", async (request: FastifyRequest, reply) => {
    try {
      const { dominio } = request.params as { dominio: string };

      const dominioFormatado = dominio.toLowerCase().trim().replace(/\s+/g, '-');

      const empresaExistente = await prisma.empresa.findUnique({
        where: { slug: dominioFormatado },
        select: { id: true }
      });

      return reply.send({
        disponivel: !empresaExistente,
        dominioSugerido: dominioFormatado,
        mensagem: empresaExistente
          ? "Este domínio já está em uso"
          : "Domínio disponível"
      });
    } catch (error) {
      console.error("Erro ao verificar domínio:", error);
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/empresa/empresa/:idEmpresa", async (request: FastifyRequest, reply: FastifyReply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };

    const empresa = await prisma.empresa.findUnique({
      where: {
        id: idEmpresa,
      },
      include: {
        Produto: true,
        ChaveAtivacao: true,
        usuario: true,
      },
    });

    if (!empresa) {
      return reply.status(404).send({ mensagem: "Empresa não encontrada" });
    }

    reply.send(empresa);
  });
}