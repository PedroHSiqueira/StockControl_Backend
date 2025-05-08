import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getConvite(app: FastifyInstance) {
  app.get("/convites", async (request, reply) => {
    const convites = await prisma.convite.findMany();

    reply.send(convites);
  });
}
