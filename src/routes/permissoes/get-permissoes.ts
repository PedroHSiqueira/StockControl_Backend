import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { UserNotFoundError } from "../../exceptions/UserNotFoundException";

export async function getPermissoes(app: FastifyInstance) {
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
      return reply.status(500).send({ mensagem: "Erro interno no servidor", error });
    }
  });

  app.get("/usuarios/:userId/permissoes", async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        include: {
          UsuarioPermissao: {
            include: {
              permissao: true,
            },
          },
        },
      });

      if (!usuario) {
        throw new UserNotFoundError("Usuário não encontrado");
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

      const permissoesOrdenadas = usuarioPermissoes.sort((a, b) => {
        if (a.categoria === b.categoria) {
          return a.nome.localeCompare(b.nome);
        }
        return a.categoria.localeCompare(b.categoria);
      });

      return reply.send({
        permissoes: permissoesOrdenadas,
        permissoesPersonalizadas: true,
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }

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
        throw new UserNotFoundError("Usuário não encontrado");
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
      if (error instanceof UserNotFoundError) return reply.status(404).send({ error: error.message });
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
        permissoesPadrao = ["usuarios_criar", "usuarios_visualizar", "produtos_criar", "produtos_editar", "produtos_visualizar", "clientes_criar", "clientes_editar", "clientes_visualizar", "fornecedores_criar", "fornecedores_editar", "fornecedores_visualizar", "vendas_realizar", "vendas_visualizar", "inventario_visualizar", "estoque_gerenciar"];
        break;
      case "FUNCIONARIO":
        permissoesPadrao = ["produtos_visualizar", "clientes_visualizar", "vendas_visualizar", "usuarios_visualizar", "fornecedores_visualizar", "inventario_visualizar"];
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
