import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";

export async function loginUser(app: FastifyInstance) {
  app.post("/usuario/login", async (request, reply) => {
    const loginUserBody = z.object({
      email: z.string().email(),
      senha: z.string(),
    });

    const { email, senha } = loginUserBody.parse(request.body);

    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.status(404).send({ message: "Usuário não encontrado" });
    }

    const senhaValida = bcrypt.compareSync(senha, user.senha);

    if (!senhaValida) {
      return reply.status(401).send({ message: "Senha inválida" });
    }

    const token = app.jwt.sign({ id: user.id, nome: user.nome, email: user.email }, {
      expiresIn: "7d"
    });

    return reply.send({
      message: "Usuário logado com sucesso",
      token,
      nome: user.nome,
      id: user.id,
    });
  });
}
