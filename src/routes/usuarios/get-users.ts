import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getUsers(app: FastifyInstance) {
  app.get("/usuario", async (request, reply) => {
    const users = await prisma.usuario.findMany();

    reply.send(users);
  });


  app.get("/usuario/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.usuario.findUnique({
      where: {
        id: String(id),
      },
    });

    if (!user) {
      return reply.status(404).send({ mensagem: "Usuário não encontrado, tente novamente" });
    }

    reply.send(user);
  }
  );
}

