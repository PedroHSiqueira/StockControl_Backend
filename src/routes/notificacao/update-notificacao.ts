import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateNotificacao(app: FastifyInstance) {
  app.put("/notificacao/marcar-todas", async (request, reply) => {
    const bodySchema = z.object({
      usuarioId: z.string().uuid("ID de usuário inválido"),
    });

    const { usuarioId } = bodySchema.parse(request.body);

    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { empresaId: true },
      });

      if (!usuario) {
        return reply.status(404).send({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      let notificacoesProcessadas = 0;

      const notificacoesPessoais = await prisma.notificacao.findMany({
        where: {
          usuarioId: usuarioId,
          lida: false,
        },
      });

      if (notificacoesPessoais.length > 0) {
        await prisma.notificacao.updateMany({
          where: {
            usuarioId: usuarioId,
            lida: false,
          },
          data: {
            lida: true,
          },
        });
        notificacoesProcessadas += notificacoesPessoais.length;
      }

      if (usuario.empresaId) {
        const notificacoesEmpresa = await prisma.notificacao.findMany({
          where: {
            empresaId: usuario.empresaId,
            usuarioId: null,
            NOT: {
              NotificacaoUsuario: {
                some: { 
                  usuarioId: usuarioId,
                  lida: true 
                }
              }
            }
          },
          include: {
            NotificacaoUsuario: {
              where: {
                usuarioId: usuarioId
              }
            }
          },
        });

        for (const notificacao of notificacoesEmpresa) {
          const notificacaoUsuarioExistente = notificacao.NotificacaoUsuario[0];
          
          if (notificacaoUsuarioExistente) {
            await prisma.notificacaoUsuario.update({
              where: {
                notificacaoId_usuarioId: {
                  notificacaoId: notificacao.id,
                  usuarioId: usuarioId,
                },
              },
              data: {
                lida: true,
                somTocado: true,
              },
            });
          } else {
            await prisma.notificacaoUsuario.create({
              data: {
                notificacaoId: notificacao.id,
                usuarioId: usuarioId,
                lida: true,
                somTocado: true,
              },
            });
          }
          notificacoesProcessadas++;
        }
      }

      return reply.send({
        success: true,
        message: `${notificacoesProcessadas} notificações foram marcadas como lidas para este usuário.`,
        notificacoesProcessadas
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao marcar notificações como lidas",
      });
    }
  });

  app.put("/notificacao/:id", async (request, reply) => {
    const bodySchema = z.object({
      lida: z.boolean().optional(),
      usuarioId: z.string().uuid("ID de usuário inválido"),
    });

    const { id } = request.params as { id: string };
    const { lida, usuarioId } = bodySchema.parse(request.body);

    try {
      const notificacao = await prisma.notificacao.findUnique({
        where: { id },
      });

      if (!notificacao) {
        return reply.status(404).send({
          success: false,
          message: "Notificação não encontrada",
        });
      }

      if (notificacao.empresaId) {
        await prisma.notificacaoUsuario.upsert({
          where: {
            notificacaoId_usuarioId: {
              notificacaoId: notificacao.id,
              usuarioId,
            },
          },
          create: {
            notificacaoId: notificacao.id,
            usuarioId,
            lida: lida !== undefined ? lida : true,
            somTocado: true,
          },
          update: {
            lida: lida !== undefined ? lida : true,
            somTocado: true,
          },
        });
      } 
      else {
        await prisma.notificacao.update({
          where: { id },
          data: { 
            lida: lida !== undefined ? lida : true 
          },
        });
      }

      return reply.send({
        success: true,
        message: "Notificação atualizada com sucesso",
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao atualizar notificação",
      });
    }
  });
}
