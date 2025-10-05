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

    try {
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

      if (!user.emailVerificado) {

        return reply.status(403).send({
          message: "Email não verificado. Você será redirecionado para verificar seu email.",
          codigo: "EMAIL_NAO_VERIFICADO",
          precisaVerificacao: true,
          email: user.email
        });
      }

      const precisa2FA = !user.doisFADataAprovado ||
        (new Date().getTime() - user.doisFADataAprovado.getTime()) > 7 * 24 * 60 * 60 * 1000;
      if (user.doisFADataAprovado) {
        const diasDesdeAprovacao = Math.floor(
          (new Date().getTime() - user.doisFADataAprovado.getTime()) / (24 * 60 * 60 * 1000)
        );
      }

      if (precisa2FA) {

        return reply.status(200).send({
          message: "Verificação em duas etapas necessária",
          precisa2FA: true,
          email: user.email
        });
      }

      const token = app.jwt.sign(
        {
          id: user.id,
          nome: user.nome,
          email: user.email,
          tipo: user.tipo
        },
        { expiresIn: "7d" }
      );

      return reply.send({
        message: "Usuário logado com sucesso",
        token,
        nome: user.nome,
        id: user.id,
        tipo: user.tipo,
        precisa2FA: false
      });
    } catch (error) {
      console.error("❌ Erro no login:", error);
      return reply.status(500).send({ message: "Erro interno do servidor" });
    }
  });


  app.get("/usuario/verificar-sessao", async (request, reply) => {
    try {
      await request.jwtVerify();

      const user = await prisma.usuario.findUnique({
        where: { email: (request.user as any).email },
        select: {
          doisFADataAprovado: true,
          doisFAAprovado: true,
          emailVerificado: true
        }
      });

      if (!user) {
        return reply.status(404).send({ sessaoValida: false });
      }

      if (!user.emailVerificado) {
        return reply.status(403).send({ sessaoValida: false });
      }

      if (!user.doisFAAprovado || !user.doisFADataAprovado) {
        return reply.send({ sessaoValida: true });
      }

      const tempoDesdeAprovacao = new Date().getTime() - user.doisFADataAprovado.getTime();
      const sessaoValida = tempoDesdeAprovacao <= 7 * 24 * 60 * 60 * 1000;

      return reply.send({
        sessaoValida,
        aprovadoAte: sessaoValida && user.doisFADataAprovado
          ? new Date(user.doisFADataAprovado.getTime() + 7 * 24 * 60 * 60 * 1000)
          : null
      });
    } catch (error) {
      console.error("❌ Erro ao verificar sessão:", error);
      return reply.status(401).send({ sessaoValida: false });
    }
  });

  app.post("/usuario/login-finalizar", async (request, reply) => {

    const loginFinalizarBody = z.object({
      email: z.string().email(),
    });

    try {
      const { email } = loginFinalizarBody.parse(request.body);

      const user = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!user) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      if (!user.doisFAAprovado) {
        return reply.status(403).send({ message: "Verificação 2FA necessária" });
      }

      const token = app.jwt.sign(
        {
          id: user.id,
          nome: user.nome,
          email: user.email,
          tipo: user.tipo
        },
        { expiresIn: "7d" }
      );


      return reply.send({
        message: "Login realizado com sucesso",
        token,
        nome: user.nome,
        id: user.id,
        tipo: user.tipo,
      });
    } catch (error) {
      console.error("❌ Erro ao finalizar login:", error);
      return reply.status(500).send({ message: "Erro interno do servidor" });
    }
  });
}