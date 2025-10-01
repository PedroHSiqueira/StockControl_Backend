import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import nodemailer from 'nodemailer';

interface EmailRequest {
  nome: string;
  email: string;
  mensagem: string;
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
    if (error) {
      console.log('❌ Erro na configuração do email:', error);
    } else {
      console.log('✅ Servidor de email pronto para enviar');
    }
  });

  app.post('/suporte', async (request: FastifyRequest<{ Body: EmailRequest }>, reply: FastifyReply) => {
    try {
      const { nome, email, mensagem } = request.body;

      console.log('📧 Recebendo solicitação:', { nome, email });

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

      console.log('📤 Enviando email...');
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado com sucesso:', result.messageId);

      return reply.status(200).send({
        success: true,
        message: 'Mensagem enviada com sucesso',
        messageId: result.messageId
      });

    } catch (error: any) {
      console.error('❌ Erro ao enviar email:', error);
      
      return reply.status(500).send({
        success: false,
        message: 'Erro ao enviar mensagem. Tente novamente.',
        error: error.message
      });
    }
  });
}