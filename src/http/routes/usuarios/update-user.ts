import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateUser(app: FastifyInstance) {
  app.put("/usuarios/:id", async (request, reply) => {
    const updateUserBody = z.object({
      nome: z.string(),
      email: z.string().email(),
    });

    const { id } = request.params as { id: string };
    const { nome, email } = updateUserBody.parse(request.body);

    const user = await prisma.usuario.update({
      where: {
        id: String(id),
      },
      data: {
        nome: nome,
        email: email,
      },
    });

    reply.send(user);
  });
}