import { supabase } from './supabase.js';

let currentUser = null;
let currentAvaliacaoId = null;
let currentObraId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Verificação de Sessão Manual
  const sessionStr = localStorage.getItem('brangola_user');
  if (!sessionStr) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = JSON.parse(sessionStr);

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('brangola_user');
      window.location.href = 'login.html';
    });
  }

  document.getElementById('btn-voltar').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'historico.html';
  });

  const urlParams = new URLSearchParams(window.location.search);
  const avaliacaoId = urlParams.get('avaliacao_id');

  if (!avaliacaoId) {
    alert('Erro de Parâmetro: Registo não localizado.');
    window.location.href = 'historico.html';
    return;
  }

  currentAvaliacaoId = avaliacaoId;
  await carregarDadosAvaliacao(avaliacaoId);

  const form = document.getElementById('editar-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await atualizarAvaliacao();
  });

  document.getElementById('btn-excluir').addEventListener('click', async () => {
    await excluirAvaliacao();
  });
});

async function carregarDadosAvaliacao(id) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*, obras (id, titulo, categoria, imagem_url)')
    .eq('id', id)
    .single();

  if (data) currentObraId = data.obra_id;

  if (error || !data) {
    alert('Erro ao carregar avaliação: ' + (error?.message || 'Não encontrado'));
    window.location.href = 'historico.html';
    return;
  }

  if (data.user_id !== currentUser.id) {
    alert('Acesso Negado: Esta avaliação pertence a outro Operador.');
    window.location.href = 'historico.html';
    return;
  }

  document.getElementById('titulo').value = data.obras.titulo;
  document.getElementById('categoria').value = data.obras.categoria;
  document.getElementById('imagem_url').value = data.obras.imagem_url;
  document.getElementById('temporada').value = data.temporada;

  // Lógica de Ocultar Temporada
  const tipo = data.obras.categoria ? data.obras.categoria.toLowerCase() : '';
  if (tipo.includes('filme')) {
    document.getElementById('campo-temporada').style.display = 'none';
  } else {
    document.getElementById('campo-temporada').style.display = 'block';
  }

  if (data.historia !== null) document.getElementById('historia').value = data.historia;
  if (data.personagens !== null) document.getElementById('personagens').value = data.personagens;
  if (data.visual_animacao !== null) document.getElementById('visual_animacao').value = data.visual_animacao;
  if (data.som_musica !== null) document.getElementById('som_musica').value = data.som_musica;
  if (data.ritmo !== null) document.getElementById('ritmo').value = data.ritmo;
  if (data.originalidade !== null) document.getElementById('originalidade').value = data.originalidade;
  if (data.desfecho !== null) document.getElementById('desfecho').value = data.desfecho;

  if (data.personagem_favorito) document.getElementById('personagem_favorito').value = data.personagem_favorito;
  if (data.recomendarias) document.getElementById('recomendarias').value = data.recomendarias;
  if (data.melhor_cena) document.getElementById('melhor_cena').value = data.melhor_cena;
  if (data.superou_expectativas) document.getElementById('superou_expectativas').value = data.superou_expectativas;
  if (data.define_numa_palavra) document.getElementById('define_numa_palavra').value = data.define_numa_palavra;
}

async function atualizarAvaliacao() {
  const notas = {
    historia: parseFloat(document.getElementById('historia').value),
    personagens: parseFloat(document.getElementById('personagens').value),
    visual_animacao: parseFloat(document.getElementById('visual_animacao').value),
    som_musica: parseFloat(document.getElementById('som_musica').value),
    ritmo: parseFloat(document.getElementById('ritmo').value),
    originalidade: parseFloat(document.getElementById('originalidade').value),
    desfecho: parseFloat(document.getElementById('desfecho').value),
    
    personagem_favorito: document.getElementById('personagem_favorito').value,
    recomendarias: document.getElementById('recomendarias').value,
    melhor_cena: document.getElementById('melhor_cena').value,
    superou_expectativas: document.getElementById('superou_expectativas').value,
    define_numa_palavra: document.getElementById('define_numa_palavra').value,
  };

  const { error } = await supabase
    .from('avaliacoes')
    .update(notas)
    .eq('id', currentAvaliacaoId)
    .eq('user_id', currentUser.id);

  if (error) {
    alert('Falha na atualização. Erro: ' + error.message);
  } else {
    alert('Dados sincronizados com sucesso na base estelar!');
    window.location.href = 'historico.html';
  }
}

async function excluirAvaliacao() {
  if (!confirm('EXTREMA ATENÇÃO: Deseja apagar permanentemente este relatório pessoal?')) return;

  // 1. Excluir a avaliação
  const { error: errorAval } = await supabase
    .from('avaliacoes')
    .delete()
    .eq('id', currentAvaliacaoId);

  if (errorAval) {
    alert('Erro ao excluir avaliação: ' + errorAval.message);
    return;
  }

  // 2. Verificar se a obra ainda tem outras avaliações
  const { data: outras, error: errorCheck } = await supabase
    .from('avaliacoes')
    .select('id')
    .eq('obra_id', currentObraId);

  if (!errorCheck && (!outras || outras.length === 0)) {
    const deletarObra = confirm('Esta era a única avaliação registrada para esta obra. Deseja excluir a OBRA (o filme/série) também da Base Estelar para não deixar registos órfãos?');
    
    if (deletarObra) {
      const { error: errorObra } = await supabase
        .from('obras')
        .delete()
        .eq('id', currentObraId);
      
      if (errorObra) {
        alert('Avaliação excluída, mas houve erro ao apagar a obra: ' + errorObra.message);
      } else {
        alert('Avaliação e Obra removidas com sucesso.');
      }
    } else {
      alert('Avaliação removida. A obra permanece na base.');
    }
  } else {
    alert('Relatório pessoal eliminado. Outros operadores ainda possuem registos desta obra.');
  }

  window.location.href = 'historico.html';
}
