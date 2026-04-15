import { supabase } from './supabase.js';

let obrasGlobais = [];
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

  await carregarHistorico();

  document.getElementById('busca').addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    const filtradas = obrasGlobais.filter(o => o.titulo.toLowerCase().includes(termo));
    renderizarObras(filtradas);
  });
});

async function carregarHistorico() {
  const container = document.getElementById('historico');
  container.innerHTML = '<p style="text-align:center;width:100%;color:var(--neon-cyan);">Acessando os registos da Matrix...</p>';

  // Atenção: Tivemos de mudar de profiles para utilizadores no Fetch relacional
  const { data: obras, error } = await supabase
    .from('obras')
    .select(`
      *,
      avaliacoes (
        id, temporada, historia, personagens, visual_animacao, som_musica, ritmo, originalidade, desfecho,
        personagem_favorito, recomendarias, melhor_cena, superou_expectativas, define_numa_palavra,
        user_id,
        utilizadores (nome)
      )
    `)
    .order('criado_em', { ascending: false });

  if (error) {
    container.innerHTML = `<p style="color:var(--neon-pink);">Erro ao interceptar os dados: ${error.message}</p>`;
    return;
  }

  obrasGlobais = obras;
  montarFiltros(obrasGlobais);
  renderizarObras(obrasGlobais);
}

function processarMediasObra(avaliacoes) {
  if (!avaliacoes || avaliacoes.length === 0) return null;

  const criterios = ['historia', 'personagens', 'visual_animacao', 'som_musica', 'ritmo', 'originalidade', 'desfecho'];
  const mediasDetalhadas = {};
  let totalGeral = 0;

  criterios.forEach(crit => {
    let soma = 0;
    let count = 0;
    avaliacoes.forEach(av => {
      if (av[crit] !== null && av[crit] !== undefined) {
        soma += parseFloat(av[crit]);
        count++;
      }
    });
    const mediaCrit = count > 0 ? (soma / count) : 0;
    mediasDetalhadas[crit] = mediaCrit.toFixed(1);
    totalGeral += mediaCrit;
  });

  const mediaFinal = (totalGeral / criterios.length).toFixed(1);

  return { mediasDetalhadas, mediaFinal };
}

function renderizarObras(obras) {
  const container = document.getElementById('historico');
  container.innerHTML = '';
  const template = document.getElementById('template-historico');

  if (obras.length === 0) {
    container.innerHTML = '<p style="text-align:center;width:100%;">Nenhum registo encontrado na base de dados.</p>';
    return;
  }

  obras.forEach(obra => {
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.titulo').textContent = obra.titulo;
    clone.querySelector('.categoria').textContent = obra.categoria;
    clone.querySelector('.imagem-obra').src = obra.imagem_url;

    const btnEditar = clone.querySelector('.btn-editar');
    const btnExcluir = clone.querySelector('.btn-excluir');

    const minhaAvaliacao = obra.avaliacoes.find(av => av.user_id === currentUser.id);
    if (minhaAvaliacao) {
      btnEditar.style.display = 'inline-block';
      btnExcluir.style.display = 'inline-block';
      
      btnEditar.addEventListener('click', () => {
        window.location.href = `editar.html?avaliacao_id=${minhaAvaliacao.id}`;
      });

      btnExcluir.addEventListener('click', async () => {
        if (confirm('Aviso: Tem certeza que deseja apagar a sua avaliação?')) {
          const { error } = await supabase.from('avaliacoes').delete().eq('id', minhaAvaliacao.id);
          if (error) alert('Falha ao excluir: ' + error.message);
          else {
            alert('Registo apagado.');
            carregarHistorico();
          }
        }
      });
    }

    const mediasObj = processarMediasObra(obra.avaliacoes);
    if (mediasObj) {
      clone.querySelector('.nota-final-numero').textContent = mediasObj.mediaFinal;
      const detalheHtml = `
        <div>História: <strong>${mediasObj.mediasDetalhadas.historia}</strong></div>
        <div>Personagens: <strong>${mediasObj.mediasDetalhadas.personagens}</strong></div>
        <div>Visual/Animação: <strong>${mediasObj.mediasDetalhadas.visual_animacao}</strong></div>
        <div>Som/Música: <strong>${mediasObj.mediasDetalhadas.som_musica}</strong></div>
        <div>Ritmo: <strong>${mediasObj.mediasDetalhadas.ritmo}</strong></div>
        <div>Originalidade: <strong>${mediasObj.mediasDetalhadas.originalidade}</strong></div>
        <div>Desfecho: <strong>${mediasObj.mediasDetalhadas.desfecho}</strong></div>
      `;
      clone.querySelector('.medias-detalhe').innerHTML = detalheHtml;
    } else {
      clone.querySelector('.nota-final-numero').textContent = 'N/A';
      clone.querySelector('.medias-detalhe').innerHTML = 'Sem dados suficientes.';
    }

    const listaComentarios = clone.querySelector('.lista-comentarios');
    
    if (obra.avaliacoes && obra.avaliacoes.length > 0) {
      obra.avaliacoes.forEach(av => {
        const nomeOperador = (av.utilizadores && av.utilizadores.nome) ? av.utilizadores.nome.toUpperCase() : 'DESCONHECIDO';
        
        let avHtml = `<div class="comentario-amigo">
          <div class="nome-amigo">OP: ${nomeOperador} [Temporada: ${av.temporada}]</div>`;
        
        if (av.personagem_favorito) avHtml += `<div><strong style="color:var(--neon-cyan)">Personagem:</strong> ${av.personagem_favorito}</div>`;
        if (av.melhor_cena) avHtml += `<div><strong style="color:var(--neon-cyan)">Cena:</strong> ${av.melhor_cena}</div>`;
        if (av.recomendarias) avHtml += `<div><strong style="color:var(--neon-cyan)">Recomenda:</strong> ${av.recomendarias}</div>`;
        if (av.superou_expectativas) avHtml += `<div><strong style="color:var(--neon-cyan)">Expectativas:</strong> ${av.superou_expectativas}</div>`;
        if (av.define_numa_palavra) avHtml += `<div><strong style="color:var(--neon-cyan)">Em uma palavra:</strong> ${av.define_numa_palavra}</div>`;
        
        avHtml += `</div>`;
        listaComentarios.innerHTML += avHtml;
      });
    } else {
      listaComentarios.innerHTML = '<p>Nenhum registo pessoal anexado a esta obra.</p>';
    }

    container.appendChild(clone);
  });
}

function montarFiltros(obras) {
  const categoriasContenedor = document.getElementById('categorias');
  categoriasContenedor.innerHTML = '';
  
  const categoriasSet = new Set();
  obras.forEach(o => { if (o.categoria) categoriasSet.add(o.categoria); });
  
  const btnTodas = document.createElement('button');
  btnTodas.textContent = 'TODAS';
  btnTodas.classList.add('active');
  btnTodas.addEventListener('click', () => {
    document.querySelectorAll('#categorias button').forEach(b => b.classList.remove('active'));
    btnTodas.classList.add('active');
    renderizarObras(obrasGlobais);
  });
  categoriasContenedor.appendChild(btnTodas);

  categoriasSet.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat.toUpperCase();
    btn.addEventListener('click', () => {
      document.querySelectorAll('#categorias button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderizarObras(obrasGlobais.filter(o => o.categoria === cat));
    });
    categoriasContenedor.appendChild(btn);
  });
}
