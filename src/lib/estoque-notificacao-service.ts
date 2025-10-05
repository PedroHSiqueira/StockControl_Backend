import { prisma } from "./prisma";

export class EstoqueNotificacaoService {
  private static readonly INTERVALO_VERIFICACAO = 60 * 60 * 1000;
  private static readonly INTERVALO_NOTIFICACAO = 24 * 60 * 60 * 1000;
  private static readonly MARGEM_ALERTA = 5;

  private static emExecucao = false;
  private static inicializado = false;
  private static intervaloId: NodeJS.Timeout | null = null;

  static async verificarEstoqueBaixo() {
    if (this.emExecucao) return 0;
    this.emExecucao = true;
    try {
      const empresas = await prisma.empresa.findMany({
        include: {
          Produto: {
            where: {
              createdAt: {
                lte: new Date(Date.now() - 60 * 60 * 1000)
              },
              quantidadeMin: {
                gt: 0
              }
            }
          },
          usuario: {
            where: {
              tipo: {
                in: ['PROPRIETARIO', 'ADMIN', 'FUNCIONARIO']
              }
            }
          }
        }
      });

      let notificacoesCriadas = 0;

      for (const empresa of empresas) {
        for (const produto of empresa.Produto) {
          const estoqueAtual = await this.calcularEstoqueAtual(produto.id);
          const notificacaoRecente = await this.verificarNotificacaoRecente(produto.id);
          if (notificacaoRecente) continue;

          if (estoqueAtual === 0) {
            const notificacaoCriada = await this.criarNotificacaoSeNecessario(
              produto.id,
              empresa.id,
              estoqueAtual,
              'ZERADO',
              produto.id
            );
            if (notificacaoCriada) notificacoesCriadas++;
          }
          else if (estoqueAtual < produto.quantidadeMin) {
            const notificacaoCriada = await this.criarNotificacaoSeNecessario(
              produto.id,
              empresa.id,
              estoqueAtual,
              'CRITICO',
              produto.id
            );
            if (notificacaoCriada) notificacoesCriadas++;
          }
          else if (estoqueAtual <= produto.quantidadeMin + this.MARGEM_ALERTA) {
            const notificacaoCriada = await this.criarNotificacaoSeNecessario(
              produto.id,
              empresa.id,
              estoqueAtual,
              'ALERTA',
              produto.id
            );
            if (notificacaoCriada) notificacoesCriadas++;
          }
        }
      }
      return notificacoesCriadas;
    } catch (error) {
      throw error;
    } finally {
      this.emExecucao = false;
    }
  }

  private static async verificarNotificacaoRecente(produtoId: number): Promise<boolean> {
    const vinteQuatroHorasAtras = new Date(Date.now() - this.INTERVALO_NOTIFICACAO);

    const notificacaoRecente = await prisma.notificacaoEstoque.findFirst({
      where: {
        produtoId,
        enviadaEm: {
          gte: vinteQuatroHorasAtras
        }
      }
    });

    return !!notificacaoRecente;
  }

  private static async calcularEstoqueAtual(produtoId: number): Promise<number> {
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: { produtoId }
    });

    return movimentacoes.reduce((estoque, mov) => {
      if (mov.tipo === 'ENTRADA') {
        return estoque + mov.quantidade;
      } else {
        return estoque - mov.quantidade;
      }
    }, 0);
  }

  private static async criarNotificacaoSeNecessario(
    produtoId: number,
    empresaId: string,
    quantidade: number,
    tipo: 'ALERTA' | 'CRITICO' | 'ZERADO',
    produtoIdParam: number
  ): Promise<boolean> {
    const notificacaoRecente = await this.verificarNotificacaoRecente(produtoId);
    if (notificacaoRecente) return false;

    const produto = await prisma.produto.findUnique({
      where: { id: produtoId },
      include: {
        empresa: {
          include: {
            usuario: {
              where: {
                tipo: {
                  in: ['PROPRIETARIO', 'ADMIN', 'FUNCIONARIO']
                }
              }
            }
          }
        }
      }
    });

    if (!produto) return false;

    const usuarios = produto.empresa?.usuario || [];
    if (usuarios.length === 0) return false;

    const idioma = 'pt';

    await prisma.notificacaoEstoque.create({
      data: {
        produtoId,
        empresaId,
        quantidade,
        tipo,
        enviadaEm: new Date()
      }
    });

    const titulo = this.getTituloNotificacao(tipo, idioma);
    const descricao = this.getDescricaoNotificacao(
      produto.nome,
      quantidade,
      produto.quantidadeMin,
      tipo,
      produtoIdParam,
      idioma
    );

    const notificacao = await prisma.notificacao.create({
      data: {
        titulo,
        descricao,
        empresaId,
        usuarioId: null
      }
    });

    const notificacoesUsuario = usuarios.map(usuario =>
      prisma.notificacaoUsuario.create({
        data: {
          notificacaoId: notificacao.id,
          usuarioId: usuario.id,
          lida: false,
          somTocado: false
        }
      })
    );

    await Promise.all(notificacoesUsuario);

    return true;
  }

  private static getDescricaoNotificacao(
    nomeProduto: string,
    quantidade: number,
    quantidadeMin: number,
    tipo: string,
    produtoId: number,
    idioma: 'pt' | 'en' = 'pt'
  ): string {
    const traducoes = {
      pt: {
        ALERTA: `O produto ${nomeProduto} está com estoque próximo do limite.\n${quantidade} unidades restantes.\nQTD Min: ${quantidadeMin} unidades\nProduto ID: ${produtoId}`,
        CRITICO: `O produto ${nomeProduto} está com estoque CRÍTICO.\n${quantidade} unidades restantes.\nQTD Min: ${quantidadeMin} unidades\nÉ necessário repor urgentemente!\nProduto ID: ${produtoId}`,
        ZERADO: `O produto ${nomeProduto} está com estoque ZERADO.\n0 unidades restantes.\nQTD Min: ${quantidadeMin} unidades\nReposição IMEDIATA necessária!\nProduto ID: ${produtoId}`
      },
      en: {
        ALERTA: `Product ${nomeProduto} is running low on stock.\n${quantidade} units remaining.\nMin Qty: ${quantidadeMin} units\nProduct ID: ${produtoId}`,
        CRITICO: `Product ${nomeProduto} has CRITICAL stock level.\n${quantidade} units remaining.\nMin Qty: ${quantidadeMin} units\nUrgent restocking required!\nProduct ID: ${produtoId}`,
        ZERADO: `Product ${nomeProduto} is OUT OF STOCK.\n0 units remaining.\nMin Qty: ${quantidadeMin} units\nIMMEDIATE restocking required!\nProduct ID: ${produtoId}`
      }
    };

    const textos = traducoes[idioma];
    return textos[tipo as keyof typeof textos] || `Alerta para o produto ${nomeProduto}\nProduto ID: ${produtoId}`;
  }

  private static getTituloNotificacao(
    tipo: string,
    idioma: 'pt' | 'en' = 'pt'
  ): string {
    const titulos = {
      pt: {
        ALERTA: 'Alerta de Estoque',
        CRITICO: 'Estoque Crítico',
        ZERADO: 'Estoque Zerado'
      },
      en: {
        ALERTA: 'Stock Alert',
        CRITICO: 'Critical Stock',
        ZERADO: 'Out of Stock'
      }
    };

    const textos = titulos[idioma];
    return textos[tipo as keyof typeof textos] || textos.ALERTA;
  }

  static async verificarEstoqueEmpresaEspecifica(empresaId: string) {
    if (this.emExecucao) return 0;
    this.emExecucao = true;
    try {
      const produtos = await prisma.produto.findMany({
        where: {
          empresaId,
          createdAt: {
            lte: new Date(Date.now() - 60 * 60 * 1000)
          },
          quantidadeMin: {
            gt: 0
          }
        }
      });

      let notificacoesCriadas = 0;

      for (const produto of produtos) {
        const estoqueAtual = await this.calcularEstoqueAtual(produto.id);
        const notificacaoRecente = await this.verificarNotificacaoRecente(produto.id);
        if (notificacaoRecente) continue;

        if (estoqueAtual === 0) {
          const notificacaoCriada = await this.criarNotificacaoSeNecessario(
            produto.id,
            empresaId,
            estoqueAtual,
            'ZERADO',
            produto.id
          );
          if (notificacaoCriada) notificacoesCriadas++;
        }
        else if (estoqueAtual < produto.quantidadeMin) {
          const notificacaoCriada = await this.criarNotificacaoSeNecessario(
            produto.id,
            empresaId,
            estoqueAtual,
            'CRITICO',
            produto.id
          );
          if (notificacaoCriada) notificacoesCriadas++;
        }
        else if (estoqueAtual <= produto.quantidadeMin + this.MARGEM_ALERTA) {
          const notificacaoCriada = await this.criarNotificacaoSeNecessario(
            produto.id,
            empresaId,
            estoqueAtual,
            'ALERTA',
            produto.id
          );
          if (notificacaoCriada) notificacoesCriadas++;
        }
      }
      return notificacoesCriadas;
    } catch (error) {
      throw error;
    } finally {
      this.emExecucao = false;
    }
  }

  static iniciarServicoVerificacao() {
    if (this.inicializado) return;
    this.inicializado = true;
    if (this.intervaloId) {
      clearInterval(this.intervaloId);
    }
    this.intervaloId = setInterval(async () => {
      try {
        await this.verificarEstoqueBaixo();
      } catch (error) { }
    }, this.INTERVALO_VERIFICACAO);

    this.verificarEstoqueBaixo().catch(() => { });
  }

  static pararServicoVerificacao() {
    if (this.intervaloId) {
      clearInterval(this.intervaloId);
      this.intervaloId = null;
    }
    this.inicializado = false;
    this.emExecucao = false;
  }
}
