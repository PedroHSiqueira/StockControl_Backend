import { PrismaClient } from '@prisma/client';
import { ExcelExporter } from './excelExporter';

const prisma = new PrismaClient();

export interface ExportOptions {
    startDate?: string;
    endDate?: string;
    empresaId: string;
}

export class ExportService {
    static async exportData(entityType: string, options: ExportOptions) {
        const { startDate, endDate, empresaId } = options;

        console.log(`Buscando dados para ${entityType}, empresa: ${empresaId}`);

        let data: any[];
        let fileName: string;

        const whereClause: any = {
            empresaId,
            ...(startDate && endDate && {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            })
        };

        console.log(`Where clause: ${JSON.stringify(whereClause)}`);

        try {
            switch (entityType) {
                case 'produtos':
                    data = await prisma.produto.findMany({
                        where: whereClause,
                        include: {
                            categoria: true,
                            fornecedor: true,
                            usuario: true
                        }
                    });
                    fileName = `produtos_${empresaId}_${new Date().toISOString().split('T')[0]}`;
                    break;

                case 'vendas':
                    data = await prisma.venda.findMany({
                        where: whereClause,
                        include: {
                            produto: true,
                            cliente: true,
                            usuario: true
                        }
                    });
                    fileName = `vendas_${empresaId}_${new Date().toISOString().split('T')[0]}`;
                    break;

                case 'clientes':
                    data = await prisma.cliente.findMany({
                        where: whereClause
                    });
                    fileName = `clientes_${empresaId}_${new Date().toISOString().split('T')[0]}`;
                    break;

                case 'fornecedores':
                    data = await prisma.fornecedor.findMany({
                        where: whereClause
                    });
                    fileName = `fornecedores_${empresaId}_${new Date().toISOString().split('T')[0]}`;
                    break;

                case 'usuarios':
                    data = await prisma.usuario.findMany({
                        where: { empresaId }
                    });
                    fileName = `usuarios_${empresaId}_${new Date().toISOString().split('T')[0]}`;
                    break;

                default:
                    throw new Error('Tipo de entidade não suportado');
            }

            console.log(`Encontrados ${data.length} registros para exportação`);

            return await ExcelExporter.export(entityType, data, fileName);
        } catch (error) {
            console.error(`Erro no ExportService para ${entityType}:`, error);
            throw error;
        }
    }

    static async getExportHistory(empresaId: string) {
        return await prisma.logs.findMany({
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
    }
}