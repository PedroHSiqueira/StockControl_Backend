import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getLogs(app: FastifyInstance) {
  app.get("/logs", async (request, reply) => {
          
    const logs = await prisma.logs.findMany();
    reply.send(logs);
  });
}