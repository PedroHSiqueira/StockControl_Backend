import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import nodemailer from "nodemailer";

export async function verificacaoEmailRoutes(app: FastifyInstance) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  function gerarCodigoVerificacao(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async function enviarEmailVerificacao(email: string, codigo: string, tipo: 'registro' | '2fa') {
    const assunto = tipo === 'registro'
      ? '📧 Confirmação de Email - StockControl'
      : '🔐 Código de Verificação em Duas Etapas - StockControl';

    const texto = tipo === 'registro'
      ? `Olá! Use o código abaixo para verificar seu email no StockControl: ${codigo}`
      : `Seu código de verificação em duas etapas é: ${codigo}. Este código expira em 10 minutos.`;

    const html = tipo === 'registro'
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Confirme seu Email</h2>
          <p>Olá,</p>
          <p>Use o código abaixo para verificar seu email no StockControl:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${codigo}
          </div>
          <p>Este código expira em 10 minutos.</p>
          <p>Se você não criou uma conta no StockControl, ignore este email.</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Verificação em Duas Etapas</h2>
          <p>Olá,</p>
          <p>Seu código de verificação em duas etapas é:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${codigo}
          </div>
          <p>Este código expira em 10 minutos.</p>
          <p>Se você não tentou fazer login, ignore este email.</p>
        </div>
      `;

    const mailOptions = {
      from: `"StockControl" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: assunto,
      text: texto,
      html: html,
    };

    await transporter.sendMail(mailOptions);
  }

  app.post("/verificacao/enviar-codigo-registro", async (request, reply) => {

    const enviarCodigoBody = z.object({
      email: z.string().email(),
    });

    try {
      const { email } = enviarCodigoBody.parse(request.body);

      const codigo = gerarCodigoVerificacao();
      const expiracao = new Date(Date.now() + 10 * 60 * 1000);

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      if (usuario.emailVerificado) {
        return reply.status(400).send({ message: "Email já verificado" });
      }

      await prisma.usuario.update({
        where: { email },
        data: {
          codigoVerificacao: codigo,
          codigoExpiracao: expiracao,
        },
      });

      await enviarEmailVerificacao(email, codigo, 'registro');

      return reply.send({
        message: "Código de verificação enviado com sucesso",
        expiracao: expiracao
      });
    } catch (error) {
      console.error("❌ Erro ao enviar código:", error);
      return reply.status(500).send({ message: "Erro ao enviar código de verificação" });
    }
  });

  app.post("/verificacao/confirmar-email", async (request, reply) => {

    const confirmarEmailBody = z.object({
      email: z.string().email(),
      codigo: z.string().length(6),
    });

    try {
      const { email, codigo } = confirmarEmailBody.parse(request.body);

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      if (usuario.emailVerificado) {
        return reply.status(400).send({ message: "Email já verificado" });
      }

      if (usuario.codigoVerificacao !== codigo) {
        return reply.status(400).send({ message: "Código inválido" });
      }

      if (!usuario.codigoExpiracao || usuario.codigoExpiracao < new Date()) {
        return reply.status(400).send({ message: "Código expirado" });
      }

      await prisma.usuario.update({
        where: { email },
        data: {
          emailVerificado: true,
          codigoVerificacao: null,
          codigoExpiracao: null,
          doisFAAprovado: true,
          doisFADataAprovado: new Date(),
        },
      });

      return reply.send({ message: "Email verificado com sucesso" });
    } catch (error) {
      console.error("❌ Erro ao verificar email:", error);
      return reply.status(500).send({ message: "Erro ao verificar email" });
    }
  });

  app.post("/verificacao/enviar-codigo-2fa", async (request, reply) => {

    const enviarCodigoBody = z.object({
      email: z.string().email(),
    });

    try {
      const { email } = enviarCodigoBody.parse(request.body);

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      const precisa2FA = !usuario.doisFADataAprovado ||
        (new Date().getTime() - usuario.doisFADataAprovado.getTime()) > 7 * 24 * 60 * 60 * 1000;

      if (!precisa2FA) {
        return reply.status(200).send({
          message: "2FA não necessário",
          precisaVerificacao: false
        });
      }

      const codigo = gerarCodigoVerificacao();
      const expiracao = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.usuario.update({
        where: { email },
        data: {
          doisFAToken: codigo,
          doisFAExpiracao: expiracao,
          doisFAAprovado: false,
        },
      });

      await enviarEmailVerificacao(email, codigo, '2fa');

      return reply.send({
        message: "Código de verificação 2FA enviado com sucesso",
        expiracao: expiracao,
        precisaVerificacao: true
      });
    } catch (error) {
      console.error("❌ Erro ao enviar código 2FA:", error);
      return reply.status(500).send({ message: "Erro ao enviar código de verificação" });
    }
  });

  app.post("/verificacao/verificar-2fa", async (request, reply) => {

    const verificar2FABody = z.object({
      email: z.string().email(),
      codigo: z.string().length(6),
    });

    try {
      const { email, codigo } = verificar2FABody.parse(request.body);

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      if (usuario.doisFAToken !== codigo) {
        return reply.status(400).send({ message: "Código inválido" });
      }

      if (!usuario.doisFAExpiracao || usuario.doisFAExpiracao < new Date()) {
        return reply.status(400).send({ message: "Código expirado" });
      }

      await prisma.usuario.update({
        where: { email },
        data: {
          doisFAAprovado: true,
          doisFADataAprovado: new Date(),
          doisFAToken: null,
          doisFAExpiracao: null,
        },
      });

      return reply.send({
        message: "Verificação 2FA realizada com sucesso",
        aprovadoAte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    } catch (error) {
      console.error("❌ Erro ao verificar 2FA:", error);
      return reply.status(500).send({ message: "Erro ao verificar código" });
    }
  });

  app.post("/verificacao/reenviar-codigo", async (request, reply) => {

    const reenviarCodigoBody = z.object({
      email: z.string().email(),
      tipo: z.enum(['registro', '2fa']),
    });

    try {
      const { email, tipo } = reenviarCodigoBody.parse(request.body);

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      const codigo = gerarCodigoVerificacao();
      const expiracao = new Date(Date.now() + 10 * 60 * 1000);

      if (tipo === 'registro') {
        if (usuario.emailVerificado) {
          return reply.status(400).send({ message: "Email já verificado" });
        }

        await prisma.usuario.update({
          where: { email },
          data: {
            codigoVerificacao: codigo,
            codigoExpiracao: expiracao,
          },
        });
      } else {
        await prisma.usuario.update({
          where: { email },
          data: {
            doisFAToken: codigo,
            doisFAExpiracao: expiracao,
            doisFAAprovado: false,
          },
        });
      }

      await enviarEmailVerificacao(email, codigo, tipo);

      return reply.send({
        message: "Código reenviado com sucesso",
        expiracao: expiracao
      });
    } catch (error) {
      console.error("❌ Erro ao reenviar código:", error);
      return reply.status(500).send({ message: "Erro ao reenviar código" });
    }
  });
}