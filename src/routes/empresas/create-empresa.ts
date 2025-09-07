import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { pipeline } from "stream";
import { promisify } from "util";
import slugify from "slugify";
const pump = promisify(pipeline);

export async function createEmpresa(app: FastifyInstance) {
  app.post("/empresa", async (request: FastifyRequest, reply) => {
    try {
      const userId = request.headers["user-id"] as string | undefined;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const parts = request.parts();
      const fields: Record<string, any> = {};
      let fotoFile: any = null;

      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "foto") {
          fotoFile = part;
        } else if (part.type === "field") {
          fields[part.fieldname] = part.value;
        }
      }

      const nome = fields["nome"] || "";
      const email = fields["email"] || "";
      const telefone = fields["telefone"] || "";
      const endereco = fields["endereco"] || "";
      const pais = fields["pais"] || "";
      const estado = fields["estado"] || "";
      const cidade = fields["cidade"] || "";
      const cep = fields["cep"] || "";
      const dominioSolicitado = fields["dominio"] || "";

      if (!nome.trim() || !email.trim()) {
        return reply.status(400).send({
          mensagem: "Nome e email são obrigatórios",
          camposRecebidos: {
            nome: !!nome,
            email: !!email,
          },
        });
      }

      const emailExistente = await prisma.empresa.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true }
      });

      if (emailExistente) {
        return reply.status(400).send({
          mensagem: "Este email já está em uso por outra empresa",
          error: "EMAIL_ALREADY_EXISTS"
        });
      }

      let fotoUrl = null;

      if (fotoFile) {
        try {
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "auto" }, (error, result) => {
              if (error) {
                console.error("Erro no upload:", error);
                resolve(null);
              } else {
                resolve(result);
              }
            });
            pump(fotoFile.file, uploadStream).catch((err) => {
              console.error("Erro no pipeline:", err);
              resolve(null);
            });
          });

          fotoUrl = (result as any)?.secure_url || null;
        } catch (uploadError) {
          console.error("Erro no upload da imagem:", uploadError);
        }
      }

      let finalSlug = "";

      if (dominioSolicitado && dominioSolicitado.trim()) {
        finalSlug = slugify(dominioSolicitado, {
          lower: true,
          strict: true,
          locale: "pt",
        });
      } else {
        finalSlug = slugify(nome, {
          lower: true,
          strict: true,
          locale: "pt",
        });
      }

      const slugExists = await prisma.empresa.findUnique({
        where: { slug: finalSlug },
      });

      if (slugExists) {
        finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 9)}`;
      }

      const empresa = await prisma.empresa.create({
        data: {
          nome: nome.trim(),
          slug: finalSlug,
          email: email.trim().toLowerCase(),
          foto: fotoUrl,
          telefone: telefone.trim(),
          endereco: endereco.trim(),
          pais: pais.trim(),
          estado: estado.trim(),
          cidade: cidade.trim(),
          cep: cep.trim(),
          usuario: {
            connect: {
              id: userId,
            },
          },
        },
      });

      await prisma.usuario.update({
        where: { id: userId },
        data: {
          empresaId: empresa.id,
          tipo: "PROPRIETARIO",
          permissoesPersonalizadas: true,
        },
      });

      const todasPermissoes = await prisma.permissao.findMany();

      for (const permissao of todasPermissoes) {
        await prisma.usuarioPermissao.upsert({
          where: {
            usuarioId_permissaoId: {
              usuarioId: userId,
              permissaoId: permissao.id,
            },
          },
          update: { concedida: true },
          create: {
            usuarioId: userId,
            permissaoId: permissao.id,
            concedida: true,
          },
        });
      }

      return reply.status(201).send({
        ...empresa,
        mensagem: "Empresa criada com sucesso!",
        dominio: finalSlug,
        urlCatalogo: `${process.env.NEXT_PUBLIC_URL}/catalogo/${finalSlug}`
      });
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
      
      if (typeof error === "object" && error !== null && "code" in error && (error as any).code === 'P2002') {
        return reply.status(400).send({
          mensagem: "Email ou domínio já está em uso",
          error: "DUPLICATE_ENTRY"
        });
      }
      
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
      });
    }
  });
}