import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ExportService } from "../../lib/export/exportService";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function exportRoutes(app: FastifyInstance) {
  app.post("/export/:entityType", async (request, reply) => {
    try {
      const usuarioId = request.headers["user-id"] as string;

      if (!usuarioId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(usuarioId, "exportar_dados");
      if (!temPermissao) {
        return reply.status(403).send({
          mensagem: "Acesso negado. Permissão necessária: exportar_dados",
        });
      }

      const exportParams = z.object({
        entityType: z.enum(["produtos", "vendas", "clientes", "fornecedores", "usuarios", "movimentacoes"]),
      });

      const exportBody = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        empresaId: z.string(),
      });

      const { entityType } = exportParams.parse(request.params);
      const { startDate, endDate, empresaId } = exportBody.parse(request.body);

      let usuarioNome = "Desconhecido";
      try {
        const usuario = await prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: { nome: true },
        });
        usuarioNome = usuario?.nome || "Desconhecido";
      } catch (userError) {
        console.error("Erro ao buscar usuário:", userError);
      }

      const result = await ExportService.exportData(entityType, {
        startDate,
        endDate,
        empresaId,
      });

      const periodoDesc = startDate && endDate 
        ? `${new Date(startDate).toLocaleDateString("pt-BR")} à ${new Date(endDate).toLocaleDateString("pt-BR")}`
        : "Todos os dados";

      const descricaoLegivel = `Exportação de ${entityType} | Usuário: ${usuarioNome} | Período: ${periodoDesc}`;

      await prisma.logs.create({
        data: {
          descricao: descricaoLegivel, 
          tipo: "CRIACAO",
          empresaId,
          usuarioId,
        },
      });

      reply.header("Content-Type", result.contentType)
          .header("Content-Disposition", `attachment; filename="${result.fileName}"`)
          .send(result.buffer);
    } catch (error) {
      console.error("Erro detalhado na rota de exportação:", error);
      reply.status(500).send({
        mensagem: "Erro ao exportar dados",
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
      });
    }
  });

  app.get("/export/history/:empresaId", async (request, reply) => {
    try {
      const usuarioId = request.headers["user-id"] as string;

      if (!usuarioId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(usuarioId, "exportar_dados");
      if (!temPermissao) {
        return reply.status(403).send({
          mensagem: "Acesso negado. Permissão necessária: exportar_dados",
        });
      }

      const { empresaId } = request.params as { empresaId: string };

      const history = await prisma.logs.findMany({
        where: {
          empresaId,
          descricao: {
            startsWith: "Exportação", 
          },
        },
        include: {
          usuario: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50, 
      });

      reply.send(history);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      reply.status(500).send({
        mensagem: "Erro ao carregar histórico",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
}