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

  const form = document.getElementById('recomendacao-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = document.getElementById('titulo').value;
    const tipo = document.getElementById('tipo').value;
    const link_extra = document.getElementById('link_extra').value || null;
    const quem_sugeriu = currentUser ? currentUser.nome : 'Anônimo Matrix';

    const novaRec = {
      titulo,
      tipo,
      quem_sugeriu,
      link_extra
    };

    const { error } = await supabase.from('recomendacoes').insert([novaRec]);

    if (error) {
      alert('Falha crítica na Matrix: ' + error.message);
    } else {
      alert('Sugestão enviada para a rede com sucesso!');
      window.location.href = 'ver-recomendacoes.html';
    }
  });
});
