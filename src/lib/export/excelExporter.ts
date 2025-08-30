import ExcelJS from 'exceljs';

interface Header {
  key: string;
  title: string;
}

export class ExcelExporter {
  static async export(entityType: string, data: any[], fileName: string) {
    console.log(`Exportando ${data.length} registros do tipo ${entityType}`);
    
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(entityType);

      this.setHeaders(worksheet, entityType);

      data.forEach((item, index) => {
        this.addRow(worksheet, entityType, item, index + 2);
      });

      this.formatWorksheet(worksheet);

      const buffer = await workbook.xlsx.writeBuffer();
      
      console.log(`Exportação concluída com sucesso. Tamanho do buffer: ${buffer.byteLength} bytes`);
      
      return {
        buffer,
        fileName: `${fileName}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } catch (error) {
      console.error('Erro no ExcelExporter:', error);
      throw error;
    }
  }

  public static getHeadersForEntity(entityType: string): Header[] {
    switch (entityType) {
      case 'produtos':
        return [
          { key: 'nome', title: 'Nome' },
          { key: 'descricao', title: 'Descrição' },
          { key: 'preco', title: 'Preço' },
          { key: 'quantidade', title: 'Quantidade' },
          { key: 'quantidadeMin', title: 'Estoque Mínimo' },
          { key: 'categoria.nome', title: 'Categoria' },
          { key: 'fornecedor.nome', title: 'Fornecedor' },
          { key: 'createdAt', title: 'Data de Criação' }
        ];

      case 'vendas':
        return [
          { key: 'produto.nome', title: 'Produto' },
          { key: 'quantidade', title: 'Quantidade' },
          { key: 'valorVenda', title: 'Valor de Venda' },
          { key: 'valorCompra', title: 'Valor de Compra' },
          { key: 'cliente.nome', title: 'Cliente' },
          { key: 'usuario.nome', title: 'Vendedor' },
          { key: 'createdAt', title: 'Data da Venda' }
        ];

      case 'clientes':
        return [
          { key: 'nome', title: 'Nome' },
          { key: 'email', title: 'Email' },
          { key: 'telefone', title: 'Telefone' },
          { key: 'endereco', title: 'Endereço' },
          { key: 'cidade', title: 'Cidade' },
          { key: 'estado', title: 'Estado' },
          { key: 'createdAt', title: 'Data de Cadastro' }
        ];

      case 'fornecedores':
        return [
          { key: 'nome', title: 'Nome' },
          { key: 'cnpj', title: 'CNPJ' },
          { key: 'email', title: 'Email' },
          { key: 'telefone', title: 'Telefone' },
          { key: 'categoria', title: 'Categoria' },
          { key: 'createdAt', title: 'Data de Cadastro' }
        ];

      case 'usuarios':
        return [
          { key: 'nome', title: 'Nome' },
          { key: 'email', title: 'Email' },
          { key: 'tipo', title: 'Tipo' },
          { key: 'createdAt', title: 'Data de Cadastro' }
        ];

      default:
        return [];
    }
  }

  private static setHeaders(worksheet: ExcelJS.Worksheet, entityType: string) {
    const headers = ExcelExporter.getHeadersForEntity(entityType);
    worksheet.addRow(headers.map(header => header.title));

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  }

  private static addRow(worksheet: ExcelJS.Worksheet, entityType: string, item: any, rowNumber: number) {
    const headers = ExcelExporter.getHeadersForEntity(entityType);
    const row: any[] = [];

    headers.forEach(header => {
      const value = this.getNestedValue(item, header.key);
      row.push(value);
    });

    worksheet.addRow(row);
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => {
      if (acc === null || acc === undefined) return null;
      return acc[part];
    }, obj);
  }

  private static formatWorksheet(worksheet: ExcelJS.Worksheet) {
    worksheet.columns.forEach((column: any) => {
      if (!column) return;
      
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });
  }
}

export const excelExporter = new ExcelExporter();