import ExcelJS from 'exceljs';

interface Header {
  key: string;
  title: string;
}

export class ExcelExporter {
  static async export(entityType: string, data: any[], fileName: string) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(entityType);

      this.setHeaders(worksheet, entityType);

      data.forEach((item, index) => {
        this.addRow(worksheet, entityType, item, index + 2);
      });

      this.formatWorksheet(worksheet);

      const buffer = await workbook.xlsx.writeBuffer();
      
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
          { key: 'noCatalogo', title: 'No Catálogo' },
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

      case 'movimentacoes':
        return [
          { key: 'produto.nome', title: 'Produto' },
          { key: 'tipo', title: 'Tipo' },
          { key: 'quantidade', title: 'Quantidade' },
          { key: 'motivo', title: 'Motivo' },
          { key: 'observacao', title: 'Observação' },
          { key: 'usuario.nome', title: 'Usuário' },
          { key: 'createdAt', title: 'Data da Movimentação' }
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
      
      let formattedValue = value;
      
      if (header.key === 'noCatalogo') {
        formattedValue = value ? 'Sim' : 'Não';
      } else if (header.key === 'createdAt' && value) {
        formattedValue = new Date(value).toLocaleString('pt-BR');
      } else if (header.key === 'preco' && value) {
        formattedValue = `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
      } else if (header.key === 'valorVenda' && value) {
        formattedValue = `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
      } else if (header.key === 'valorCompra' && value) {
        formattedValue = `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
      } else if (header.key === 'tipo') {
        formattedValue = value === 'ENTRADA' ? 'Entrada' : 'Saída';
      }
      
      row.push(formattedValue !== null && formattedValue !== undefined ? formattedValue : '');
    });

    const addedRow = worksheet.addRow(row);
    
    this.formatQuantityCells(addedRow, entityType, headers);
  }

  private static formatQuantityCells(row: ExcelJS.Row, entityType: string, headers: Header[]) {
    headers.forEach((header, columnIndex) => {
      if (header.key === 'quantidade') {
        const cell = row.getCell(columnIndex + 1);
        const value = cell.value;
        
        if (typeof value === 'number') {
          cell.numFmt = '0'; 
          cell.alignment = { horizontal: 'right' };
        }
      }
    });
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => {
      if (acc === null || acc === undefined) return null;
      return acc[part];
    }, obj);
  }

  private static formatWorksheet(worksheet: ExcelJS.Worksheet) {
    worksheet.columns.forEach((column: any, columnIndex) => {
      if (!column) return;
      
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      
      const headers = ExcelExporter.getHeadersForEntity(worksheet.name);
      const header = headers[columnIndex];
      
      if (header.key === 'descricao') {
        column.width = 50; 
      } else if (header.key === 'observacao' || header.key === 'motivo') {
        column.width = 40;
      } else {
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      }
    });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; 
      
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const headers = ExcelExporter.getHeadersForEntity(worksheet.name);
        const header = headers[colNumber - 1];
        
        if (header.key === 'descricao' || header.key === 'observacao' || header.key === 'motivo') {
          cell.alignment = { 
            ...cell.alignment,
            wrapText: true
          };
        }
        
        if (typeof cell.value === 'number') {
          if (header.key !== 'quantidade') {
            cell.numFmt = '#,##0.00';
          }
        }
      });
    });
  }
}

export const excelExporter = new ExcelExporter();