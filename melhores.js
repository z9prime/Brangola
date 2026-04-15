import { supabase } from './supabase.js';

let obrasGlobais = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Verificação Manual de Sessão
  const sessionStr = localStorage.getItem('brangola_user');
  if (!sessionStr) {
    window.location.href = 'login.html';
    return;
  }

  // Logout Customizado
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('brangola_user');
      window.location.href = 'login.html';
    });
  }

  await carregarTop10();
});

async function carregarTop10() {
  const container = document.getElementById('podio');
  container.innerHTML = '<p style="text-align:center;width:100%;color:var(--neon-cyan);">Calculando Ranking Global Matrix...</p>';

  // Buscar os dados da view 'media_obras' que já traz as médias calculadas
  const { data, error } = await supabase
    .from('media_obras')
    .select('*')
    .order('media_geral', { ascending: false });

  if (error) {
    container.innerHTML = `<p style="color:var(--neon-pink);">Erro ao interceptar os dados: ${error.message}</p>`;
    return;
  }

  obrasGlobais = data.filter(d => d.media_geral > 0);
  
  montarFiltros(obrasGlobais);
  renderizarTop(obrasGlobais);
}

function montarFiltros(opcoes) {
  const containerTabs = document.getElementById('tabs-categorias');
  containerTabs.innerHTML = '';

  const categoriasUnicas = new Set();
  opcoes.forEach(op => {
    if (op.categoria) categoriasUnicas.add(op.categoria);
  });

  const btnTodas = document.createElement('button');
  btnTodas.textContent = 'GERAL (TODAS)';
  btnTodas.classList.add('cyber-btn', 'primary', 'active');
  btnTodas.style.margin = '5px';
  btnTodas.addEventListener('click', () => {
    document.querySelectorAll('#tabs-categorias button').forEach(b => {
      b.classList.remove('primary'); b.classList.add('secondary');
    });
    btnTodas.classList.remove('secondary'); btnTodas.classList.add('primary');
    renderizarTop(obrasGlobais);
  });
  containerTabs.appendChild(btnTodas);

  categoriasUnicas.forEach(cat => {
    const btnCat = document.createElement('button');
    btnCat.textContent = cat.toUpperCase();
    btnCat.classList.add('cyber-btn', 'secondary');
    btnCat.style.margin = '5px';
    btnCat.addEventListener('click', () => {
      document.querySelectorAll('#tabs-categorias button').forEach(b => {
        b.classList.remove('primary'); b.classList.add('secondary');
      });
      btnCat.classList.remove('secondary'); btnCat.classList.add('primary');
      const filtradas = obrasGlobais.filter(o => o.categoria === cat);
      renderizarTop(filtradas);
    });
    containerTabs.appendChild(btnCat);
  });
}

function renderizarTop(lista) {
  const container = document.getElementById('podio');
  container.innerHTML = '';
  container.classList.add('podio-container');

  if (lista.length === 0) {
    container.innerHTML = '<p style="text-align:center;">Nenhum registo enquadrado nos critérios de elitismo.</p>';
    return;
  }

  const top10 = lista.slice(0, 10);
  const template = document.getElementById('template-melhores');

  top10.forEach((obra, index) => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.card');
    
    clone.querySelector('.titulo').textContent = obra.titulo;
    clone.querySelector('.categoria').textContent = obra.categoria;
    clone.querySelector('.imagem-obra').src = obra.imagem_url;
    clone.querySelector('.nota-final-numero').textContent = obra.media_geral.toFixed(1);
    
    const rankNum = index + 1;
    clone.querySelector('.rank-badge').textContent = `#${rankNum}`;

    if (rankNum === 1) card.classList.add('rank-1');
    else if (rankNum === 2) card.classList.add('rank-2');
    else if (rankNum === 3) card.classList.add('rank-3');

    container.appendChild(clone);
  });
}
