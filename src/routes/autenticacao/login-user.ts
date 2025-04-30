import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";

export async function loginUser(app: FastifyInstance) {
  app.post("/users/login", async (request, reply) => {
    const loginUserBody = z.object({
      email: z.string().email(),
      senha: z.string(),
    });

    const { email, senha } = loginUserBody.parse(request.body);

    const user = await prisma.usuario.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      reply.status(404).send({ message: "Usuário não encontrado" });
      return;
    }
    const senhaValida = bcrypt.compareSync(senha, user.senha);

    if (!senhaValida) {
      reply.status(401).send({ message: "Senha inválida" });
      return;
    }

    reply.send({ message: "Usuário logado com sucesso", nome: user.nome, id: user.id });
  });
}
