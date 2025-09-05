import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function updateUser(app: FastifyInstance) {
  app.put("/usuario/:id", async (request, reply) => {
    const updateBody = z.object({
      nome: z.string().optional(),
      email: z.string().email().optional(),
      tipo: z.enum(["FUNCIONARIO", "ADMIN", "PROPRIETARIO"]).optional(),
      empresaId: z.string().uuid().nullable().optional(),
      empresa: z
        .object({
          nome: z.string().optional(),
          telefone: z.string().optional(),
          endereco: z.string().optional(),
          pais: z.string().optional(),
          estado: z.string().optional(),
          cidade: z.string().optional(),
          cep: z.string().optional(),
        })
        .optional(),
    });

    const { id } = request.params as { id: string };
    const { nome, email, tipo, empresa, empresaId } = updateBody.parse(request.body);

    let updateData: any = { nome, email, tipo };
    if (empresaId === null) {
      updateData = {
        ...updateData,
        empresaId: null,
        tipo: "FUNCIONARIO",
      };
    } else {
      updateData = { ...updateData, empresaId };
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: updateData,
    });

    if (empresa) {
      await prisma.empresa.updateMany({
        where: { id: usuarioAtualizado.empresaId || undefined },
        data: {
          nome: empresa.nome,
          telefone: empresa.telefone,
          endereco: empresa.endereco,
          pais: empresa.pais,
          estado: empresa.estado,
          cidade: empresa.cidade,
          cep: empresa.cep,
        },
      });
    }

    reply.send({ mensagem: "Conta atualizada com sucesso!" });
  });
  app.put("/usuario/convite/:id", async (request, reply) => {
    const updateBody = z.object({
      empresaId: z.string().uuid(),
    });

    const { id } = request.params as { id: string };
    const { empresaId } = updateBody.parse(request.body);

    const empresaAtualizada = await prisma.usuario.update({
      where: { id },
      data: { empresaId },
    });

    const deletaNotificacao = await prisma.notificacao.deleteMany({
      where: {
        usuarioId: id,
      },
    });

    reply.send({ mensagem: "Usuario Vinculado a empresa com sucesso" });
  });

  app.put("/usuario/esqueceu/:email", async (request, reply) => {
    const { email } = request.params as { email: string };
    const { recuperacao } = request.body as { recuperacao: string };

    try {
      const cliente = await prisma.usuario.findUnique({
        where: { email },
      });

      if (cliente == null) {
        reply.send({ erro: "Usuário não encontrado" });
        return;
      }

      await prisma.usuario.update({
        where: { email },
        data: { recuperacao: recuperacao },
      });

      reply.send({ mensagem: "Recuperação de senha enviada com sucesso" });
    } catch (error) {
      reply.status(500).send({ erro: "Erro ao atualizar a senha" });
    }
  });

  app.put("/usuario/:id/remover-empresa", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.headers["user-id"] as string | undefined;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(userId, "usuarios_excluir");

      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: usuarios_excluir" });
      }

      const usuarioSolicitante = await prisma.usuario.findUnique({
        where: { id: userId },
        include: { empresa: true },
      });

      if (!usuarioSolicitante) {
        return reply.status(401).send({ mensagem: "Usuário solicitante não encontrado" });
      }

      const usuarioAlvo = await prisma.usuario.findUnique({
        where: { id: id },
        include: { empresa: true },
      });

      if (!usuarioAlvo) {
        return reply.status(404).send({ mensagem: "Usuário não encontrado" });
      }

      if (usuarioSolicitante.tipo === "PROPRIETARIO") {
        if (usuarioAlvo.empresaId !== usuarioSolicitante.empresaId) {
          return reply.status(403).send({ mensagem: "Não é possível remover usuário de outra empresa" });
        }
      } else if (usuarioSolicitante.tipo === "ADMIN") {
        if (usuarioAlvo.empresaId !== usuarioSolicitante.empresaId) {
          return reply.status(403).send({ mensagem: "Não é possível remover usuário de outra empresa" });
        }
        if (usuarioAlvo.tipo !== "FUNCIONARIO") {
          return reply.status(403).send({ mensagem: "Administradores só podem remover funcionários" });
        }
      } else {
        return reply.status(403).send({ mensagem: "Acesso negado" });
      }

      const usuarioAtualizado = await prisma.usuario.update({
        where: { id },
        data: {
          empresaId: null,
          tipo: "FUNCIONARIO",
          permissoesPersonalizadas: false,
        },
      });

      await prisma.usuarioPermissao.deleteMany({
        where: {
          usuarioId: id,
        },
      });

      reply.send({
        mensagem: "Usuário removido da empresa com sucesso! Permissões resetadas.",
        usuario: usuarioAtualizado,
      });
    } catch (error) {
      console.error("Erro detalhado ao remover usuário da empresa:", error);
      reply.status(500).send({ mensagem: "Erro interno ao remover usuário" });
    }
  });

  app.put("/recuperacao/alterar", async (request, reply) => {
    const updateBody = z.object({
      email: z.string().email(),
      senha: z.string(),
      recuperacao: z.string(),
    });

    const { email, senha, recuperacao } = updateBody.parse(request.body);
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return reply.status(404).send({ mensagem: "Usuário não encontrado" });
    }

    if (usuario.recuperacao !== recuperacao) {
      return reply.status(400).send({ mensagem: "Código de recuperação inválido" });
    }

    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync(senha, salt);
    await prisma.usuario.update({
      where: { email },
      data: { senha: hash, recuperacao: null },
    });
    reply.send({ mensagem: "Senha alterada com sucesso" });
  });
}
