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

      if (!nome.trim() || !email.trim()) {
        return reply.status(400).send({
          mensagem: "Nome e email são obrigatórios",
          camposRecebidos: {
            nome: !!nome,
            email: !!email,
          },
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

      const slug = slugify(nome, {
        lower: true,
        strict: true,
        locale: "pt",
      });

      const slugExists = await prisma.empresa.findUnique({
        where: { slug },
      });

      let finalSlug = slug;
      if (slugExists) {
        finalSlug = `${slug}-${Date.now()}`;
      }

      const empresa = await prisma.empresa.create({
        data: {
          nome: nome.trim(),
          slug: finalSlug,
          email: email.trim(),
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

      return reply.status(201).send(empresa);
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
      });
    }
  });
}
