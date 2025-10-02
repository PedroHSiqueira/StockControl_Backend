import { EstoqueNotificacaoService } from "./estoque-notificacao-service";

let servicoInicializado = false;

export function inicializarServicoEstoque() {
  if (servicoInicializado) {
    console.log('⚠️  Serviço de estoque já está inicializado');
    return;
  }
  
  servicoInicializado = true;
  console.log('🔄 Inicializando serviço de verificação de estoque...');
  EstoqueNotificacaoService.iniciarServicoVerificacao();
}

if (process.env.NODE_ENV !== 'test') {
  inicializarServicoEstoque();
}