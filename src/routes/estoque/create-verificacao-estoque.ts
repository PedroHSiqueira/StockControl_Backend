import { FastifyInstance } from "fastify";
import { EstoqueNotificacaoService } from "../../lib/estoque-notificacao-service";
import { prisma } from "../../lib/prisma";
import { z } from "zod";

async function calcularSaldoProduto(produtoId: number): Promise<number> {
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    where: { produtoId },
    orderBy: { createdAt: 'desc' }
  });

  return movimentacoes.reduce((saldo, mov) => {
    if (mov.tipo === 'ENTRADA') {
      return saldo + mov.quantidade;
    } else {
      return saldo - mov.quantidade;
    }
  }, 0);
}

export async function verificarEstoque(app: FastifyInstance) {
  app.post("/estoque/verificar", async (request, reply) => {
    try {
      const notificacoesCriadas = await EstoqueNotificacaoService.verificarEstoqueBaixo();

      return reply.send({
        success: true,
        message: `Verificação concluída. ${notificacoesCriadas} notificações criadas.`
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao verificar estoque"
      });
    }
  });

  app.post("/produtos/verificar-estoque-empresa", async (request, reply) => {
    try {
      const notificacoesCriadas = await EstoqueNotificacaoService.verificarEstoqueBaixo();

      const umaHoraAtras = new Date(Date.now() - 10 * 1000);

      const produtos = await prisma.produto.findMany({
        where: {
          createdAt: {
            lte: umaHoraAtras
          },
          quantidadeMin: {
            gt: 0
          }
        },
        include: {
          empresa: true,
          Movimentacoes: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          }
        },
      });

      const produtosComSaldo = await Promise.all(
        produtos.map(async (produto) => {
          const saldo = await calcularSaldoProduto(produto.id);
          return {
            ...produto,
            quantidade: saldo
          };
        })
      );

      const produtosPorEmpresa: Record<string, any[]> = {};
      produtosComSaldo.forEach((produto) => {
        if (!produto.empresaId) return;
        if (!produtosPorEmpresa[produto.empresaId]) {
          produtosPorEmpresa[produto.empresaId] = [];
        }
        produtosPorEmpresa[produto.empresaId].push(produto);
      });

      let notificacoesAdicionais = 0;

      for (const [empresaId, produtosEmpresa] of Object.entries(produtosPorEmpresa)) {
        const notificacaoRecente = await prisma.notificacaoEstoque.findFirst({
          where: {
            empresaId,
            enviadaEm: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });

        if (notificacaoRecente) {
          continue;
        }

        const produtosAlerta = produtosEmpresa.filter((produto) => {
          return produto.quantidadeMin > 0 &&
            produto.quantidade < produto.quantidadeMin + 5 &&
            produto.quantidade > 0;
        });

        if (produtosAlerta.length > 0) {
          const empresa = await prisma.empresa.findUnique({
            where: { id: empresaId },
            include: { usuario: true },
          });

          if (!empresa || empresa.usuario.length === 0) continue;

          const titulo = "Alerta de Estoque - Análise Detalhada";

          const lotes = [];
          for (let i = 0; i < produtosAlerta.length; i += 3) {
            lotes.push(produtosAlerta.slice(i, i + 3));
          }

          for (const lote of lotes) {
            let descricao = "Análise detalhada de produtos com estoque próximo do limite:\n";

            lote.forEach((produto) => {
              const diferenca = produto.quantidadeMin - produto.quantidade;
              const estado = diferenca > 0 ?
                `FALTAM ${diferenca} UNIDADES` :
                "PRÓXIMO DO LIMITE";

              descricao += `\n- ${produto.nome}: ${estado} (Atual: ${produto.quantidade}, Mínimo: ${produto.quantidadeMin})`;
            });

            if (lotes.length > 1) {
              descricao += `\n\n(Parte ${lotes.indexOf(lote) + 1} de ${lotes.length})`;
            }

            const notificacao = await prisma.notificacao.create({
              data: {
                titulo,
                descricao: `Enviado por Sistema de Estoque: ${descricao}`,
                empresa: { connect: { id: empresaId } },
              },
            });

            const notificacoesUsuario = empresa.usuario.map(usuario =>
              prisma.notificacaoUsuario.create({
                data: {
                  notificacaoId: notificacao.id,
                  usuarioId: usuario.id,
                  lida: false,
                  somTocado: false
                }
              })
            );

            await Promise.all(notificacoesUsuario);
            notificacoesAdicionais++;
          }
        }
      }

      reply.send({
        mensagem: "Verificação de estoque concluída",
        notificacoesSistema: notificacoesCriadas,
        notificacoesAdicionais: notificacoesAdicionais,
        total: notificacoesCriadas + notificacoesAdicionais
      });
    } catch (error) {
      reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.post("/produtos/verificar-estoque-empresa/:empresaId", async (request, reply) => {
    const paramsSchema = z.object({
      empresaId: z.string().uuid("ID da empresa inválido")
    });

    const { empresaId } = paramsSchema.parse(request.params);

    try {
      const notificacoesCriadas = await EstoqueNotificacaoService.verificarEstoqueEmpresaEspecifica(empresaId);

      return reply.send({
        success: true,
        message: `Verificação concluída para a empresa. ${notificacoesCriadas} notificações criadas.`,
        notificacoesCriadas
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao verificar estoque da empresa"
      });
    }
  });
}
