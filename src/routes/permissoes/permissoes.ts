import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function permissoesRoutes(app: FastifyInstance) {
  app.get("/permissoes", async (request, reply) => {
    try {
      const permissoes = await prisma.permissao.findMany({
        orderBy: [{ categoria: "asc" }, { nome: "asc" }],
      });

      const permissoesAgrupadas = permissoes.reduce((acc, permissao) => {
        if (!acc[permissao.categoria]) {
          acc[permissao.categoria] = [];
        }
        acc[permissao.categoria].push(permissao);
        return acc;
      }, {} as Record<string, typeof permissoes>);

      return reply.send(permissoesAgrupadas);
    } catch (error) {
      console.error("Erro ao buscar permissões:", error);
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/usuarios/:userId/permissoes", async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        include: {
          UsuarioPermissao: {
            include: { permissao: true },
          },
        },
      });

      if (!usuario) {
        return reply.status(404).send({ mensagem: "Usuário não encontrado" });
      }

      if (!usuario.permissoesPersonalizadas) {
        const permissoesPadrao = await getPermissoesPadraoPorTipo(usuario.tipo);
        return reply.send({
          permissoes: permissoesPadrao,
          permissoesPersonalizadas: false,
        });
      }

      const usuarioPermissoes = usuario.UsuarioPermissao.map((up) => ({
        ...up.permissao,
        concedida: up.concedida,
      }));

      return reply.send({
        permissoes: usuarioPermissoes,
        permissoesPersonalizadas: true,
      });
    } catch (error) {
      console.error("Erro ao buscar permissões do usuário:", error);
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.put("/usuarios/:userId/permissoes", async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const { permissoes, ativarPersonalizacao } = request.body as {
        permissoes: { permissaoId: string; concedida: boolean }[];
        ativarPersonalizacao: boolean;
      };

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
      });

      if (!usuario) {
        return reply.status(404).send({ mensagem: "Usuário não encontrado" });
      }

      if (ativarPersonalizacao !== undefined) {
        await prisma.usuario.update({
          where: { id: userId },
          data: { permissoesPersonalizadas: ativarPersonalizacao },
        });
      }

      for (const permissao of permissoes) {
        await prisma.usuarioPermissao.upsert({
          where: {
            usuarioId_permissaoId: {
              usuarioId: userId,
              permissaoId: permissao.permissaoId,
            },
          },
          update: { concedida: permissao.concedida },
          create: {
            usuarioId: userId,
            permissaoId: permissao.permissaoId,
            concedida: permissao.concedida,
          },
        });
      }

      return reply.send({
        mensagem: "Permissões atualizadas com sucesso",
        permissoesPersonalizadas: ativarPersonalizacao,
      });
    } catch (error) {
      console.error("Erro ao atualizar permissões:", error);
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/usuarios/:userId/tem-permissao/:permissaoChave", async (request, reply) => {
    try {
      const { userId, permissaoChave } = request.params as {
        userId: string;
        permissaoChave: string;
      };

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        include: {
          UsuarioPermissao: {
            include: { permissao: true },
          },
        },
      });

      if (!usuario) {
        return reply.status(404).send({ mensagem: "Usuário não encontrado" });
      }

      if (!usuario.permissoesPersonalizadas) {
        const permissoesPadrao = await getPermissoesPadraoPorTipo(usuario.tipo);
        const temPermissao = permissoesPadrao.some((p) => p.chave === permissaoChave && p.concedida);
        return reply.send({ temPermissao });
      }

      const permissao = await prisma.permissao.findFirst({
        where: { chave: permissaoChave },
      });

      if (!permissao) {
        return reply.status(404).send({ mensagem: "Permissão não encontrada" });
      }

      const usuarioPermissao = await prisma.usuarioPermissao.findUnique({
        where: {
          usuarioId_permissaoId: {
            usuarioId: userId,
            permissaoId: permissao.id,
          },
        },
      });

      const temPermissao = usuarioPermissao?.concedida || false;

      return reply.send({ temPermissao });
    } catch (error) {
      console.error("Erro ao verificar permissão:", error);
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  async function getPermissoesPadraoPorTipo(tipo: string) {
    const todasPermissoes = await prisma.permissao.findMany();

    let permissoesPadrao: string[] = [];

    switch (tipo) {
      case "PROPRIETARIO":
        permissoesPadrao = todasPermissoes.map((p) => p.chave);
        break;
      case "ADMIN":
        permissoesPadrao = ["usuarios_criar", "usuarios_visualizar", "produtos_criar", "produtos_editar", "produtos_visualizar", "clientes_criar", "clientes_editar", "clientes_visualizar", "fornecedores_criar", "fornecedores_editar", "fornecedores_visualizar", "vendas_realizar", "vendas_visualizar"];
        break;
      case "FUNCIONARIO":
        permissoesPadrao = ["produtos_visualizar", "clientes_visualizar", "vendas_visualizar", "usuarios_visualizar"];
        break;
      default:
        permissoesPadrao = [];
    }

    return todasPermissoes.map((permissao) => ({
      ...permissao,
      concedida: permissoesPadrao.includes(permissao.chave),
    }));
  }
}
