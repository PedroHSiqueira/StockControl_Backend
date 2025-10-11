import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import nodemailer from 'nodemailer';
import { prisma } from '../../lib/prisma';

interface EmailRequest {
  nome: string;
  email: string;
  mensagem: string;
}

interface RecuperacaoRequest {
  email: string;
  codigo: string;
}

interface PedidoRequest {
  action: string;
  remetente_nome: string;
  remetente_email: string;
  empresa_nome: string;
  empresa_telefone?: string;
  empresa_id: string;
  destinatario: string;
  fornecedor_nome: string;
  pedido_id: string;
  pedido_numero: string;
  assunto: string;
  total: number;
  data: string;
  observacoes: string;
  itens: Array<{
    produto: string;
    quantidade: number;
    preco_unitario: number;
    total_item: number;
    observacao: string;
  }>;
}

export async function emailRoutes(app: FastifyInstance) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  transporter.verify((error, success) => {
  });

  app.post('/suporte', async (request: FastifyRequest<{ Body: EmailRequest }>, reply: FastifyReply) => {
    try {
      const { nome, email, mensagem } = request.body;

      if (!nome || !email || !mensagem) {
        return reply.status(400).send({
          success: false,
          message: 'Todos os campos são obrigatórios'
        });
      }

      const emailText = `Nome: ${nome}\nEmail: ${email}\nMensagem:\n${mensagem}`;

      const mailOptions = {
        from: `"Suporte StockControl" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        replyTo: email,
        subject: '📩 Nova mensagem de suporte recebida via StockControl',
        text: emailText,
      };

      const result = await transporter.sendMail(mailOptions);

      return reply.status(200).send({
        success: true,
        message: 'Mensagem enviada com sucesso',
        messageId: result.messageId
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Erro ao enviar mensagem. Tente novamente.',
        error: error.message
      });
    }
  });

  app.post('/recuperacao-senha', async (request: FastifyRequest<{ Body: RecuperacaoRequest }>, reply: FastifyReply) => {
    try {
      const { email, codigo } = request.body;

      if (!email || !codigo) {
        return reply.status(400).send({
          success: false,
          message: 'Email e código são obrigatórios'
        });
      }
      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        return reply.status(404).send({
          success: false,
          message: 'Nenhuma conta encontrada com este email',
          codigo: 'EMAIL_NAO_ENCONTRADO'
        });
      }

      await prisma.usuario.update({
        where: { email },
        data: {
          recuperacao: codigo,
        },
      });

      const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1976d2; margin: 0;">StockControl</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Recuperação de Senha</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Olá, ${usuario.nome}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Você solicitou a recuperação de senha para sua conta no StockControl.
            Use o código abaixo para redefinir sua senha:
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 2px dashed #ddd;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1976d2;">
              ${codigo}
            </div>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            <strong>Este código expira em 30 minutos.</strong>
          </p>
          
          <div style="margin-top: 30px; padding: 15px; background: #e3f2fd; border-radius: 6px;">
            <p style="margin: 0; color: #1976d2; font-size: 14px;">
              <strong>Próximo passo:</strong> 
              <a href="${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://stockcontrol-six.vercel.app'}/alteracao" style="color: #1976d2; text-decoration: underline;">
                Clique aqui para acessar a página de recuperação
              </a>
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
            Se você não solicitou esta recuperação, ignore este email.
          </p>
        </div>
      </div>
    `;

      const mailOptions = {
        from: `"StockControl" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Código de Recuperação de Senha - StockControl',
        html: emailHtml,
        text: `Olá ${usuario.nome}!\n\nSeu código de recuperação de senha é: ${codigo}\n\nAcesse: ${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://stockcontrol-six.vercel.app'}/alteracao para alterar sua senha.\n\nEste código expira em 30 minutos.\n\nSe você não solicitou esta recuperação, ignore este email.`
      };

      const result = await transporter.sendMail(mailOptions);

      return reply.status(200).send({
        success: true,
        message: 'Email de recuperação enviado com sucesso',
        messageId: result.messageId
      });

    } catch (error: any) {
      console.error('❌ Erro ao enviar email de recuperação:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro ao enviar email de recuperação. Tente novamente.',
        error: error.message
      });
    }
  });
  app.post('/email-pedidos', async (request: FastifyRequest<{ Body: PedidoRequest }>, reply: FastifyReply) => {
    try {
      const {
        remetente_email,
        empresa_nome,
        empresa_telefone,
        empresa_id,
        destinatario,
        fornecedor_nome,
        pedido_numero,
        assunto,
        total,
        data,
        observacoes,
        itens
      } = request.body;

      if (!destinatario || !pedido_numero || !empresa_id) {
        return reply.status(400).send({
          success: false,
          message: 'Dados obrigatórios faltando'
        });
      }

      let emailEmpresaReal = remetente_email;
      let nomeEmpresaReal = empresa_nome;
      let telefoneEmpresaReal = empresa_telefone;

      try {
        const empresa = await prisma.empresa.findUnique({
          where: { id: empresa_id },
          select: { email: true, nome: true, telefone: true }
        });

        if (empresa && empresa.email) {
          emailEmpresaReal = empresa.email;
          nomeEmpresaReal = empresa.nome || nomeEmpresaReal;
          telefoneEmpresaReal = empresa.telefone || telefoneEmpresaReal;
        }
      } catch (error) {
        console.error('❌ Erro ao buscar empresa, usando fallback:', error);
      }

      let tabelaItens = "";
      if (itens && itens.length) {
        for (const item of itens) {
          tabelaItens += `
            <tr>
              <td style="border:1px solid #ccc;padding:5px">${item.produto}</td>
              <td style="border:1px solid #ccc;padding:5px">${item.quantidade}</td>
              <td style="border:1px solid #ccc;padding:5px">R$ ${item.preco_unitario.toFixed(2)}</td>
              <td style="border:1px solid #ccc;padding:5px">R$ ${item.total_item.toFixed(2)}</td>
              <td style="border:1px solid #ccc;padding:5px">${item.observacao || ""}</td>
            </tr>
          `;
        }
      }

      const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Pedido ${pedido_numero}</title>
  </head>
  <body style="font-family:Arial,sans-serif;font-size:14px;color:#333">
    <h2>Pedido ${pedido_numero}</h2>
    <p><strong>Fornecedor:</strong> ${fornecedor_nome}</p>
    <p><strong>Data:</strong> ${data}</p>
    <p><strong>Total:</strong> R$ ${total.toFixed(2)}</p>
    <p><strong>Observações gerais:</strong> ${observacoes || 'Nenhuma'}</p>

    <table style="border-collapse:collapse;width:100%;margin-top:10px">
      <tr>
        <th style="border:1px solid #ccc;padding:5px">Produto</th>
        <th style="border:1px solid #ccc;padding:5px">Quantidade</th>
        <th style="border:1px solid #ccc;padding:5px">Preço Unitário</th>
        <th style="border:1px solid #ccc;padding:5px">Total Item</th>
        <th style="border:1px solid #ccc;padding:5px">Observação</th>
      </tr>
      ${tabelaItens}
    </table>

    <h3>Contato da empresa</h3>
    <p>Caso queira entrar em contato com a empresa que realizou o pedido:</p>
    <table style="border-collapse:collapse;width:auto;margin-top:5px">
      <tr>
        <td style="padding:2px 5px"><strong>Empresa:</strong></td>
        <td style="padding:2px 5px">${nomeEmpresaReal}</td>
      </tr>
      <tr>
        <td style="padding:2px 5px"><strong>Email:</strong></td>
        <td style="padding:2px 5px">${emailEmpresaReal}</td>
      </tr>
      ${telefoneEmpresaReal ? `
      <tr>
        <td style="padding:2px 5px"><strong>Telefone:</strong></td>
        <td style="padding:2px 5px">${telefoneEmpresaReal}</td>
      </tr>
      ` : ''}
    </table>
  </body>
</html>
      `;

      const mailOptions = {
        from: `"${nomeEmpresaReal}" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        replyTo: emailEmpresaReal,
        subject: assunto,
        html: emailHtml,
        text: `Pedido ${pedido_numero} - ${fornecedor_nome}\n\nTotal: R$ ${total.toFixed(2)}\nData: ${data}\n\nItens:\n${itens.map(item => `- ${item.produto}: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)} = R$ ${item.total_item.toFixed(2)}`).join('\n')}\n\nContato: ${emailEmpresaReal}`
      };

      const result = await transporter.sendMail(mailOptions);

      return reply.status(200).send({
        success: true,
        message: 'Email de pedido enviado com sucesso',
        messageId: result.messageId,
        empresa: nomeEmpresaReal,
        email_empresa: emailEmpresaReal
      });

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Erro ao enviar email de pedido. Tente novamente.',
        error: error.message
      });
    }
  });
}