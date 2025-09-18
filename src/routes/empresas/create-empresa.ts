import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import slugify from "slugify";

export async function createEmpresa(app: FastifyInstance) {
  app.post("/empresa/upload-foto", async (request: FastifyRequest, reply) => {
    try {

      const userId = request.headers["user-id"] as string;
      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ mensagem: "Nenhum arquivo enviado" });
      }

      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of data.file) {
        chunks.push(chunk);
        totalSize += chunk.length;
      }

      const fileBuffer = Buffer.concat(chunks);



      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            chunk_size: 20 * 1024 * 1024,
            timeout: 60000,
          },
          (error, result) => {
            if (error) {
              console.error("ERRO CLOUDINARY:", error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        uploadStream.end(fileBuffer);
      });

      return reply.send({
        success: true,
        message: "Upload da foto realizado com sucesso",
        fotoUrl: (result as any)?.secure_url,
        fileSize: fileBuffer.length
      });

    } catch (error) {
      console.error("Erro no upload separado:", error);
      return reply.status(500).send({
        error: "Erro no upload da foto",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/empresa", async (request: FastifyRequest, reply) => {
    try {
      const userId = request.headers["user-id"] as string | undefined;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const body = request.body as any;
      const {
        nome,
        email,
        telefone,
        endereco,
        pais,
        estado,
        cidade,
        cep,
        dominioSolicitado,
        fotoUrl 
      } = body;

      if (!nome?.trim() || !email?.trim()) {
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
          foto: fotoUrl || null,
          telefone: telefone?.trim() || "",
          endereco: endereco?.trim() || "",
          pais: pais?.trim() || "",
          estado: estado?.trim() || "",
          cidade: cidade?.trim() || "",
          cep: cep?.trim() || "",
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
        mensagem: "Empresa criada con sucesso!",
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