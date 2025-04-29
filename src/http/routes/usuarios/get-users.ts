import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getUsers(app: FastifyInstance) {
  app.get("/usuarios", async (request, reply) => {
    const users = await prisma.usuario.findMany();

    reply.send(users);
  });
}