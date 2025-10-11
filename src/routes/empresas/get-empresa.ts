import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function getEmpresa(app: FastifyInstance) {
  app.get("/empresa", async (request, reply) => {
    await request.jwtVerify().catch(() => {
      throw new UnauthorizedError("Token inválido ou expirado");
    });
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
    const acceptLanguage = request.headers['accept-language'] || 'pt-BR';
    const idioma = acceptLanguage.startsWith('en') ? 'en' : 'pt';
    try {
      const { email } = request.params as { email: string };
      const url = request.url;
      const hasEmpresaId = url.includes("?empresaId=");

      let empresaId = "";
      if (hasEmpresaId) {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        empresaId = urlParams.get("empresaId") || "";
      }

      const whereClauseEmpresa = empresaId
        ? {
          email: email.toLowerCase().trim(),
          id: {
            not: empresaId,
          },
        }
        : {
          email: email.toLowerCase().trim(),
        };

      const empresaExistente = await prisma.empresa.findFirst({
        where: whereClauseEmpresa,
        select: { id: true, nome: true },
      });

      const usuarioExistente = await prisma.usuario.findFirst({
        where: {
          email: email.toLowerCase().trim(),
        },
        select: { id: true, nome: true },
      });

      const emailExiste = !!empresaExistente || !!usuarioExistente;

      let mensagem = idioma === 'en' ? "Email available" : "Email disponível";

      if (empresaExistente) {
        mensagem = idioma === 'en'
          ? "This email is already in use by another company"
          : "Este email já está em uso por outra empresa";
      } else if (usuarioExistente) {
        mensagem = idioma === 'en'
          ? "This email is already in use by a user"
          : "Este email já está em uso por um usuário";
      }

      return reply.send({
        existe: emailExiste,
        empresaExistente: empresaExistente,
        usuarioExistente: usuarioExistente,
        mensagem: mensagem,
      });
    } catch (error) {
      const mensagemErro = idioma === 'en'
        ? "Internal server error"
        : "Erro interno no servidor";
      return reply.status(500).send({ mensagem: mensagemErro });
    }
  });

  app.get("/empresa/verificar-dominio/:dominio", async (request: FastifyRequest, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const { dominio } = request.params as { dominio: string };

      const dominioFormatado = dominio.toLowerCase().trim().replace(/\s+/g, "-");

      const empresaExistente = await prisma.empresa.findUnique({
        where: { slug: dominioFormatado },
        select: { id: true },
      });

      return reply.send({
        disponivel: !empresaExistente,
        dominioSugerido: dominioFormatado,
        mensagem: empresaExistente ? "Este domínio já está em uso" : "Domínio disponível",
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/empresa/status-ativacao/:idEmpresa", async (request: FastifyRequest, reply: FastifyReply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const empresa = await prisma.empresa.findUnique({
        where: { id: idEmpresa },
        include: {
          ChaveAtivacao: {
            select: {
              chave: true,
              utilizada: true,
              dataUso: true,
            },
          },
        },
      });

      if (!empresa) {
        return reply.status(404).send({ mensagem: "Empresa não encontrada" });
      }

      const ativada = !!empresa.ChaveAtivacao;

      return reply.send({
        ativada,
        chave: empresa.ChaveAtivacao?.chave || null,
        dataAtivacao: empresa.ChaveAtivacao?.dataUso || null,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({ mensagem: "Erro interno" });
    }
  });

  app.get("/empresa/empresa/:idEmpresa", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { idEmpresa } = request.params as { idEmpresa: string };

      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

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
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
