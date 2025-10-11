import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";
import { TipoUsuario } from "@prisma/client";
import nodemailer from "nodemailer";

const usuariosPendentes = new Map();

function validarSenha(senha: string) {
  const mensagens: string[] = [];

  if (senha.length < 8) {
    mensagens.push("Erro... a senha deve ter pelo menos 8 caracteres");
  }

  let minusculas = 0;
  let maiusculas = 0;
  let numeros = 0;
  let simbolos = 0;

  for (const char of senha) {
    if (/[a-z]/.test(char)) {
      minusculas++;
    } else if (/[A-Z]/.test(char)) {
      maiusculas++;
    } else if (/[0-9]/.test(char)) {
      numeros++;
    } else {
      simbolos++;
    }
  }

  if (minusculas === 0 || maiusculas === 0 || numeros === 0 || simbolos === 0) {
    mensagens.push("Erro... a senha deve conter letras minúsculas, letras maiúsculas, números e símbolos");
  }

  return mensagens;
}

function gerarCodigoVerificacao(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function enviarEmailVerificacao(email: string, codigo: string) {
  const assunto = "📧 Confirmação de Email - StockControl";
  const texto = `Olá! Use o código abaixo para verificar seu email no StockControl: ${codigo}`;
  
  const html = `
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

function limparUsuariosExpirados() {
  const agora = new Date();
  for (const [email, usuario] of usuariosPendentes.entries()) {
    if (usuario.expiracao < agora) {
      usuariosPendentes.delete(email);
    }
  }
}

export async function createUser(app: FastifyInstance) {
  app.post("/usuarios/iniciar-registro", async (request, reply) => {
    const iniciarRegistroBody = z.object({
      nome: z.string(),
      email: z.string().email(),
      senha: z.string(),
      tipo: z.enum([TipoUsuario.FUNCIONARIO, TipoUsuario.ADMIN]),
    });

    try {
      const { nome, email, senha, tipo } = iniciarRegistroBody.parse(request.body);

      limparUsuariosExpirados();

      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email },
      });

      if (usuarioExistente) {
        return reply.status(400).send({ 
          mensagem: "Email já cadastrado",
          codigo: "EMAIL_JA_CADASTRADO"
        });
      }

      if (usuariosPendentes.has(email)) {
        return reply.status(400).send({ 
          mensagem: "Já existe um registro pendente para este email. Verifique sua caixa de entrada.",
          codigo: "REGISTRO_PENDENTE"
        });
      }

      const erros = validarSenha(senha);
      if (erros.length > 0) {
        return reply.status(400).send({ 
          mensagem: "Senha Inválida verifique e tente novamente",
          codigo: "SENHA_INVALIDA"
        });
      }

      const salt = bcrypt.genSaltSync(12);
      const hash = bcrypt.hashSync(senha, salt);

      const codigoVerificacao = gerarCodigoVerificacao();
      const expiracao = new Date(Date.now() + 10 * 60 * 1000); 

      usuariosPendentes.set(email, {
        nome,
        email,
        senha: hash,
        tipo,
        codigoVerificacao,
        expiracao,
        criadoEm: new Date()
      });

      await enviarEmailVerificacao(email, codigoVerificacao);

      return reply.status(201).send({
        mensagem: "Código de verificação enviado para seu email",
        codigo: "CODIGO_ENVIADO",
        email: email,
        expiracao: expiracao,
      });
    } catch (error) {
      console.error("❌ Erro no registro inicial:", error);
      return reply.status(500).send({ 
        mensagem: "Erro interno do servidor",
        codigo: "ERRO_INTERNO"
      });
    }
  });

  app.post("/usuarios/finalizar-registro", async (request, reply) => {
    const finalizarRegistroBody = z.object({
      email: z.string().email(),
      codigo: z.string().length(6),
    });

    try {
      const { email, codigo } = finalizarRegistroBody.parse(request.body);

      limparUsuariosExpirados();

      const usuarioPendente = usuariosPendentes.get(email);

      if (!usuarioPendente) {
        return reply.status(404).send({ 
          mensagem: "Registro não encontrado ou expirado",
          codigo: "REGISTRO_NAO_ENCONTRADO"
        });
      }

      if (usuarioPendente.expiracao < new Date()) {
        usuariosPendentes.delete(email);
        return reply.status(400).send({ 
          mensagem: "Código de verificação expirado",
          codigo: "CODIGO_EXPIRADO"
        });
      }

      if (usuarioPendente.codigoVerificacao !== codigo) {
        return reply.status(400).send({ 
          mensagem: "Código de verificação inválido",
          codigo: "CODIGO_INVALIDO"
        });
      }
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email },
      });

      if (usuarioExistente) {
        usuariosPendentes.delete(email);
        return reply.status(400).send({ 
          mensagem: "Email já cadastrado",
          codigo: "EMAIL_JA_CADASTRADO"
        });
      }

      const usuarioVerificado = await prisma.usuario.create({
        data: {
          nome: usuarioPendente.nome,
          email: usuarioPendente.email,
          senha: usuarioPendente.senha,
          tipo: usuarioPendente.tipo,
          emailVerificado: true,
          codigoVerificacao: null,
          codigoExpiracao: null,
          doisFAAprovado: true, 
          doisFADataAprovado: new Date(),
        },
      });

      usuariosPendentes.delete(email);

      return reply.status(201).send({
        mensagem: "Email verificado com sucesso! Sua conta foi criada.",
        codigo: "REGISTRO_CONCLUIDO",
        usuario: {
          id: usuarioVerificado.id,
          nome: usuarioVerificado.nome,
          email: usuarioVerificado.email,
          emailVerificado: true
        }
      });
    } catch (error) {
      console.error("❌ Erro ao finalizar registro:", error);
      return reply.status(500).send({ 
        mensagem: "Erro interno do servidor",
        codigo: "ERRO_INTERNO"
      });
    }
  });

  app.post("/usuarios/reenviar-codigo", async (request, reply) => {
    const reenviarCodigoBody = z.object({
      email: z.string().email(),
    });

    try {
      const { email } = reenviarCodigoBody.parse(request.body);

      limparUsuariosExpirados();

      const usuarioPendente = usuariosPendentes.get(email);

      if (!usuarioPendente) {
        return reply.status(404).send({ 
          mensagem: "Registro não encontrado ou expirado",
          codigo: "REGISTRO_NAO_ENCONTRADO"
        });
      }

      const novoCodigo = gerarCodigoVerificacao();
      const novaExpiracao = new Date(Date.now() + 10 * 60 * 1000);

      usuariosPendentes.set(email, {
        ...usuarioPendente,
        codigoVerificacao: novoCodigo,
        expiracao: novaExpiracao
      });

      await enviarEmailVerificacao(email, novoCodigo);

      return reply.send({
        mensagem: "Código reenviado com sucesso",
        codigo: "CODIGO_REENVIADO",
        expiracao: novaExpiracao,
      });
    } catch (error) {
      console.error("❌ Erro ao reenviar código:", error);
      return reply.status(500).send({ 
        mensagem: "Erro ao reenviar código",
        codigo: "ERRO_REENVIO"
      });
    }
  });

  app.get("/usuarios/verificar-pendente/:email", async (request, reply) => {
    const { email } = request.params as { email: string };

    try {
      limparUsuariosExpirados();
      const usuarioPendente = usuariosPendentes.get(email);
      
      return reply.send({
        existe: !!usuarioPendente,
        expiracao: usuarioPendente?.expiracao || null
      });
    } catch (error) {
      return reply.status(500).send({ 
        mensagem: "Erro ao verificar registro pendente"
      });
    }
  });
}