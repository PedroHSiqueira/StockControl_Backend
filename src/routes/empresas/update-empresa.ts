import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateEmpresa(app: FastifyInstance) {
  app.put("/empresa/:id/:usuarioId", async (request, reply) => {
    try {
      const updateEmpresaBody = z.object({
        nome: z.string().min(1).optional().nullable(),
        email: z.string().email().optional().nullable(),
        foto: z.string().optional().nullable(),
        telefone: z.string().optional().nullable(),
        endereco: z.string().optional().nullable(),
        pais: z.string().optional().nullable(),
        estado: z.string().optional().nullable(),
        cidade: z.string().optional().nullable(),
        cep: z.string().optional().nullable(),
      });
  
      const { id, usuarioId } = request.params as { id: string, usuarioId: string };
      const data = updateEmpresaBody.parse(request.body);
  
  
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },  
        include: {
          empresa: true,
        },
      });
  
      if (!usuario || !usuario.empresa) {
        return reply.status(404).send({ mensagem: "Usuário ou empresa não encontrados" });
      }
  
      if (usuario.empresa.id !== id) {
        return reply.status(403).send({ mensagem: "Você não tem permissão para editar esta empresa" });
      }
  
      if (usuario.tipo === 'CLIENTE') {
        return reply.status(403).send({ mensagem: "Clientes não podem editar dados da empresa" });
      }
  
      if (usuario.tipo === 'ADMIN') {
        if (data.nome !== usuario.empresa.nome || data.email !== usuario.empresa.email) {
          return reply.status(403).send({ mensagem: "Você não tem permissão para alterar o nome ou email" });
        }
      }
  
      const empresaAtualizada = await prisma.empresa.update({
        where: { id: String(id) },
        data: {
          ...(data.nome !== null && { nome: data.nome }),
          ...(data.email !== null && { email: data.email }),
          ...(data.foto !== null && { foto: data.foto }),
          ...(data.telefone !== null && { telefone: data.telefone }),
          ...(data.endereco !== null && { endereco: data.endereco }),
          ...(data.pais !== null && { pais: data.pais }),
          ...(data.estado !== null && { estado: data.estado }),
          ...(data.cidade !== null && { cidade: data.cidade }),
          ...(data.cep !== null && { cep: data.cep }),
        },
      });
  
      return reply.send(empresaAtualizada);
  
    } catch (error: any) {
      console.error("Erro ao atualizar empresa:", error.message);
      console.error("Detalhes do erro:", error);
      console.error("→ Body recebido:", request.body);
      return reply.status(500).send({ mensagem: "Erro interno", detalhe: error.message });
    }
  });
}