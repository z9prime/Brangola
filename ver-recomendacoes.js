import { supabase } from './supabase.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Verificação Manual de Sessão
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

  carregarRecomendacoes();
});

const container = document.getElementById('lista-recomendacoes');
const template = document.getElementById('template-recomendacao');

async function carregarRecomendacoes() {
  container.innerHTML = '<p style="text-align: center; color: var(--neon-cyan);">Processando base de sugestões...</p>';
  
  const { data, error } = await supabase
    .from('recomendacoes')
    .select('*')
    .order('inserted_at', { ascending: false });

  if (error) {
    alert('Falha na comunicação com a Matrix!');
    return;
  }

  container.innerHTML = '';
  
  if (data.length === 0) {
    container.innerHTML = '<p style="text-align: center;">Nenhuma sugestão encontrada na rede.</p>';
    return;
  }

  data.forEach(rec => {
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.rec-titulo').textContent = rec.titulo;
    clone.querySelector('.rec-tipo').textContent = rec.tipo;
    clone.querySelector('.rec-quem').textContent = rec.quem_sugeriu;
    
    const link = clone.querySelector('.rec-link');
    if (rec.link_extra) {
      link.href = rec.link_extra;
    } else {
      link.style.display = 'none';
    }
    
    clone.querySelector('.btn-excluir').addEventListener('click', async () => {
      if (confirm(`Excluir a sugestão "${rec.titulo}" da rede Brangola?`)) {
        await supabase.from('recomendacoes').delete().eq('id', rec.id);
        carregarRecomendacoes(); 
      }
    });
    
    container.appendChild(clone);
  });
}
