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

      const emailHtml = `
      <p>Olá, esse é seu código de alteração de senha na <strong>StockControl</strong>: <strong>${codigo}</strong></p>
      <p><a href="https://stockcontrol-six.vercel.app/alteracao">Clique aqui para acessar a página de recuperação</a></p>
    `;

      const mailOptions = {
        from: `"StockControl" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '📩 Código de alteração de senha StockControl',
        html: emailHtml,
        text: `Seu código de recuperação é: ${codigo}\n\nAcesse: https://stockcontrol-six.vercel.app/alteracao para alterar sua senha.`
      };

      const result = await transporter.sendMail(mailOptions);

      return reply.status(200).send({
        success: true,
        message: 'Email de recuperação enviado com sucesso',
        messageId: result.messageId
      });

    } catch (error: any) {
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