import { prisma } from "../lib/prisma";

export async function usuarioTemPermissao(userId: string, permissaoChave: string): Promise<boolean> {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        UsuarioPermissao: {
          include: { permissao: true }
        }
      }
    });

    if (!usuario) return false;

    if (usuario.tipo === 'PROPRIETARIO') {
      return true;
    }

    if (!usuario.permissoesPersonalizadas) {
      const permissoesPadrao = await getPermissoesPadraoPorTipo(usuario.tipo);
      return permissoesPadrao.includes(permissaoChave);
    }

    const permissao = await prisma.permissao.findFirst({
      where: { chave: permissaoChave }
    });

    if (!permissao) return false;

    const usuarioPermissao = await prisma.usuarioPermissao.findUnique({
      where: {
        usuarioId_permissaoId: {
          usuarioId: userId,
          permissaoId: permissao.id
        }
      }
    });

    return usuarioPermissao?.concedida || false;
  } catch (error) {
    console.error("Erro ao verificar permissão:", error);
    return false;
  }
}

async function getPermissoesPadraoPorTipo(tipo: string): Promise<string[]> {
  switch (tipo) {
    case 'PROPRIETARIO':
      const todasPermissoes = await prisma.permissao.findMany();
      return todasPermissoes.map(p => p.chave);
    case 'ADMIN':
      return [
        'usuarios_criar', 'usuarios_editar', 'usuarios_visualizar',
        'produtos_criar', 'produtos_editar', 'produtos_visualizar',
        'clientes_criar', 'clientes_editar', 'clientes_visualizar',
        'fornecedores_criar', 'fornecedores_editar', 'fornecedores_visualizar',
        'vendas_realizar', 'vendas_visualizar'
      ];
    case 'FUNCIONARIO':
      return [
        'produtos_visualizar',
        'clientes_visualizar',
        'vendas_visualizar',
        'usuarios_visualizar'
      ];
    default:
      return [];
  }
}

export function verificarPermissao(permissaoChave: string) {
  return async (request: any, reply: any, done: any) => {
    try {
      const userId = request.headers['user-id'] as string;
      
      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(userId, permissaoChave);
      
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: " + permissaoChave });
      }

      done();
    } catch (error) {
      console.error("Erro no middleware de permissão:", error);
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  };
}