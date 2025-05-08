import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateConvite(app: FastifyInstance) {
  app.put("/convites/:id", async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      empresaId: z.string().uuid(),
    });

    const { id } = request.params as { id: string };
    const { email, empresaId } = bodySchema.parse(request.body);

    const convite = await prisma.convite.update({
      where: {
        id,
      },
      data: {
        email,
        empresaId,
      },
    });

    return reply.status(200).send({ convite });
  });
}
