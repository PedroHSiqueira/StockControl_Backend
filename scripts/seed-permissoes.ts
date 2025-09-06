import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissoes = [
  // Gestão de Usuários
  {
    nome: "Adicionar Usuarios",
    descricao: "Permite Adicionar novos usuários no sistema",
    chave: "usuarios_criar",
    categoria: "USUARIOS"
  },
  {
    nome: "Editar Usuários",
    descricao: "Permite editar usuários existentes",
    chave: "usuarios_editar",
    categoria: "USUARIOS"
  },
  {
    nome: "Excluir Usuários",
    descricao: "Permite excluir usuários do sistema",
    chave: "usuarios_excluir",
    categoria: "USUARIOS"
  },
  {
    nome: "Visualizar Usuários",
    descricao: "Permite visualizar a lista de usuários",
    chave: "usuarios_visualizar",
    categoria: "USUARIOS"
  },
  {
    nome: "Gerenciar Permissões",
    descricao: "Permite gerenciar permissões de outros usuários",
    chave: "usuarios_gerenciar_permissoes",
    categoria: "USUARIOS"
  },

  // Gestão de Produtos
  {
    nome: "Criar Produtos",
    descricao: "Permite criar novos produtos",
    chave: "produtos_criar",
    categoria: "PRODUTOS"
  },
  {
    nome: "Editar Produtos",
    descricao: "Permite editar produtos existentes",
    chave: "produtos_editar",
    categoria: "PRODUTOS"
  },
  {
    nome: "Excluir Produtos",
    descricao: "Permite excluir produtos",
    chave: "produtos_excluir",
    categoria: "PRODUTOS"
  },
  {
    nome: "Visualizar Produtos",
    descricao: "Permite visualizar a lista de produtos",
    chave: "produtos_visualizar",
    categoria: "PRODUTOS"
  },

  // Gestão de Clientes
  {
    nome: "Criar Clientes",
    descricao: "Permite criar novos clientes",
    chave: "clientes_criar",
    categoria: "CLIENTES"
  },
  {
    nome: "Editar Clientes",
    descricao: "Permite editar clientes existentes",
    chave: "clientes_editar",
    categoria: "CLIENTES"
  },
  {
    nome: "Excluir Clientes",
    descricao: "Permite excluir clientes",
    chave: "clientes_excluir",
    categoria: "CLIENTES"
  },
  {
    nome: "Visualizar Clientes",
    descricao: "Permite visualizar a lista de clientes",
    chave: "clientes_visualizar",
    categoria: "CLIENTES"
  },

  // Gestão de Fornecedores
  {
    nome: "Criar Fornecedores",
    descricao: "Permite criar novos fornecedores",
    chave: "fornecedores_criar",
    categoria: "FORNECEDORES"
  },
  {
    nome: "Editar Fornecedores",
    descricao: "Permite editar fornecedores existentes",
    chave: "fornecedores_editar",
    categoria: "FORNECEDORES"
  },
  {
    nome: "Excluir Fornecedores",
    descricao: "Permite excluir fornecedores",
    chave: "fornecedores_excluir",
    categoria: "FORNECEDORES"
  },
  {
    nome: "Visualizar Fornecedores",
    descricao: "Permite visualizar a lista de fornecedores",
    chave: "fornecedores_visualizar",
    categoria: "FORNECEDORES"
  },

  // Gestão de Vendas
  {
    nome: "Realizar Vendas",
    descricao: "Permite realizar vendas",
    chave: "vendas_realizar",
    categoria: "VENDAS"
  },
  {
    nome: "Visualizar Vendas",
    descricao: "Permite visualizar o histórico de vendas",
    chave: "vendas_visualizar",
    categoria: "VENDAS"
  },
  {
    nome: "Exportar Dados",
    descricao: "Permite exportar dados do sistema",
    chave: "exportar_dados",
    categoria: "RELATORIOS"
  },

  // Configurações
  {
    nome: "Gerenciar Empresa",
    descricao: "Permite gerenciar configurações da empresa",
    chave: "empresa_gerenciar",
    categoria: "CONFIGURACOES"
  },
  {
    nome: "Visualizar Logs",
    descricao: "Permite visualizar logs do sistema",
    chave: "logs_visualizar",
    categoria: "CONFIGURACOES"
  },

  // Estoque
  {
    chave: "estoque_gerenciar",
    nome: "Gerenciar Estoque",
    descricao: "Permite criar movimentações de estoque",
    categoria: "ESTOQUE"
  },
  {
    chave: "inventario_visualizar",
    nome: "Visualizar Inventário",
    descricao: "Permite Visualizar inventário do estoque",
    categoria: "ESTOQUE"
  }
];

async function main() {

  for (const permissao of permissoes) {
    await prisma.permissao.upsert({
      where: { chave: permissao.chave },
      update: permissao,
      create: permissao
    });
  }

  const usuarios = await prisma.usuario.findMany();
  const todasPermissoes = await prisma.permissao.findMany();

  for (const usuario of usuarios) {
    if (usuario.tipo === 'PROPRIETARIO') {
      for (const permissao of todasPermissoes) {
        await prisma.usuarioPermissao.upsert({
          where: {
            usuarioId_permissaoId: {
              usuarioId: usuario.id,
              permissaoId: permissao.id
            }
          },
          update: { concedida: true },
          create: {
            usuarioId: usuario.id,
            permissaoId: permissao.id,
            concedida: true
          }
        });
      }
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { permissoesPersonalizadas: true }
      });
    }
    else if (usuario.tipo === 'ADMIN') {
      const permissoesPadraoAdmin = [
        'usuarios_criar', 'usuarios_visualizar',
        'produtos_criar', 'produtos_editar', 'produtos_visualizar',
        'clientes_criar', 'clientes_editar', 'clientes_visualizar',
        'fornecedores_criar', 'fornecedores_editar', 'fornecedores_visualizar',
        'vendas_realizar', 'vendas_visualizar', 'estoque_gerenciar', 'inventario_visualizar'
      ];

      for (const permissao of todasPermissoes) {
        const concedida = permissoesPadraoAdmin.includes(permissao.chave);
        await prisma.usuarioPermissao.upsert({
          where: {
            usuarioId_permissaoId: {
              usuarioId: usuario.id,
              permissaoId: permissao.id
            }
          },
          update: { concedida },
          create: {
            usuarioId: usuario.id,
            permissaoId: permissao.id,
            concedida
          }
        });
      }
    }
    else if (usuario.tipo === 'FUNCIONARIO') {
      const permissoesPadraoFuncionario = [
        'produtos_visualizar',
        'clientes_visualizar',
        'vendas_realizar',
        'inventario_visualizar',
        'usuarios_visualizar',
        'fornecedores_visualizar'
      ];

      for (const permissao of todasPermissoes) {
        const concedida = permissoesPadraoFuncionario.includes(permissao.chave);
        await prisma.usuarioPermissao.upsert({
          where: {
            usuarioId_permissaoId: {
              usuarioId: usuario.id,
              permissaoId: permissao.id
            }
          },
          update: { concedida },
          create: {
            usuarioId: usuario.id,
            permissaoId: permissao.id,
            concedida
          }
        });
      }
    }
  }

}

main()
  .catch((e) => {
    console.error("Erro durante a população:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });