import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ExportService } from "../../lib/export/exportService";
import { prisma } from "../../lib/prisma";

export async function exportRoutes(app: FastifyInstance) {
    app.post("/export/:entityType", async (request, reply) => {
        const exportParams = z.object({
            entityType: z.enum(['produtos', 'vendas', 'clientes', 'fornecedores', 'usuarios'])
        });

        const exportBody = z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            empresaId: z.string()
        });

        try {
            const { entityType } = exportParams.parse(request.params);
            const { startDate, endDate, empresaId } = exportBody.parse(request.body);

            console.log(`Iniciando exportação de ${entityType} para empresa ${empresaId}`);
            console.log(`Período: ${startDate} até ${endDate}`);

            const result = await ExportService.exportData(entityType, {
                startDate,
                endDate,
                empresaId
            });

            const usuarioId = request.headers['user-id'] as string;
            console.log(`User ID from headers: ${usuarioId}`);

            let usuarioNome = 'Desconhecido';
            if (usuarioId) {
                try {
                    const usuario = await prisma.usuario.findUnique({
                        where: { id: usuarioId },
                        select: { nome: true }
                    });
                    usuarioNome = usuario?.nome || 'Desconhecido';
                } catch (userError) {
                    console.error('Erro ao buscar usuário:', userError);
                }
            }

            const periodoDesc = startDate && endDate
                ? `${new Date(startDate).toLocaleDateString('pt-BR')} à ${new Date(endDate).toLocaleDateString('pt-BR')}`
                : 'Todos os dados';

            await prisma.logs.create({
                data: {
                    descricao: `Exportação de ${entityType} | Usuário: ${usuarioNome} | Período: ${periodoDesc}`,
                    tipo: "CRIACAO",
                    empresaId,
                    usuarioId: usuarioId || 'Indefinido' 
                }
            });

            reply
                .header('Content-Type', result.contentType)
                .header('Content-Disposition', `attachment; filename="${result.fileName}"`)
                .send(result.buffer);
        } catch (error) {
            console.error('Erro detalhado na rota de exportação:', error);
            reply.status(500).send({
                mensagem: "Erro ao exportar dados",
                error: error instanceof Error ? error.message : "Erro desconhecido",
                stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
            });
        }
    });



app.get("/export/history/:empresaId", async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };

    try {
        const history = await prisma.logs.findMany({
            where: {
                empresaId,
                descricao: {
                    contains: 'Exportação'
                }
            },
            include: {
                usuario: {
                    select: {
                        nome: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        });

        reply.send(history);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        reply.status(500).send({
            mensagem: "Erro ao carregar histórico",
            error: error instanceof Error ? error.message : "Erro desconhecido"
        });
    }
});
}