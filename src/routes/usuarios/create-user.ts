import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";
import { TipoUsuario } from "@prisma/client";

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

export async function createUser(app: FastifyInstance) {
  app.post("/usuarios", async (request, reply) => {
    const criarUsuarioBody = z.object({
      nome: z.string(),
      email: z.string().email(),
      senha: z.string(),
      tipo: z.enum([TipoUsuario.FUNCIONARIO, TipoUsuario.ADMIN]),
    });

    const { nome, email, senha, tipo } = criarUsuarioBody.parse(request.body);

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      return reply.status(400).send({ mensagem: "Email já cadastrado" });
    }

    const erros = validarSenha(senha);
    if (erros.length > 0) {
      return reply.status(400).send({ mensagem: "Senha Inválida verifique e tente novamente" });
    }

    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync(senha, salt);

    const codigoVerificacao = gerarCodigoVerificacao();
    const codigoExpiracao = new Date(Date.now() + 10 * 60 * 1000);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hash,
        tipo,
        emailVerificado: false,
        codigoVerificacao,
        codigoExpiracao,
        doisFAAprovado: true,
        doisFADataAprovado: new Date(), 
      },
    });

    return reply.status(201).send({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      mensagem: "Usuário criado com sucesso. Você será redirecionado para verificar seu email.",
      emailVerificado: false
    });
  });
}