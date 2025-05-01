import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateEmpresa(app: FastifyInstance) {
  app.put("/empresa/:id", async (request, reply) => {
    try {
      const updateEmpresaBody = z.object({
        nome: z.string().min(1),
        email: z.string().email(),
        foto: z.string().optional().nullable(),
        telefone: z.string().optional().nullable(),
        endereco: z.string().optional().nullable(),
        pais: z.string().optional().nullable(),
        estado: z.string().optional().nullable(),
        cidade: z.string().optional().nullable(),
        cep: z.string().optional().nullable(),
      });

      const { id } = request.params as { id: string };
      const data = updateEmpresaBody.parse(request.body);

      const empresaExistente = await prisma.empresa.findUnique({
        where: { id: String(id) },
      });

      if (!empresaExistente) {
        return reply.status(404).send({ mensagem: "Empresa não encontrada." });
      }

      const empresa = await prisma.empresa.update({
        where: { id: String(id) },
        data,
      });

      return reply.send(empresa);
    } catch (error: any) {
      console.error("Erro ao atualizar empresa:", error.message);
      console.error("→ Body recebido:", request.body);
      return reply.status(500).send({ mensagem: "Erro interno", detalhe: error.message });
    }
  });
}
