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
  
      const { idUsuario } = request.body as { idUsuario: string };
      
      if (!idUsuario) {
        return reply.status(400).send({ mensagem: "ID do usuário não fornecido" });
      }
  
      const usuario = await prisma.usuario.findUnique({
        where: { id: idUsuario },  
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
        data,
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