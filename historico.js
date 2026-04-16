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

    // Configurar fechamento do modal
    const modal = document.getElementById('movie-modal');
    const modalClose = document.querySelector('.modal-close');
    if (modal && modalClose) {
        modalClose.addEventListener('click', () => { modal.style.display = 'none'; });
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // Listener de Busca
    const buscaInput = document.getElementById('busca');
    if (buscaInput) {
        buscaInput.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const filtradas = obrasGlobais.filter(o => o.titulo.toLowerCase().includes(termo));
            renderizarObras(filtradas);
        });
    }

    await carregarHistorico();
});

async function carregarHistorico() {
    const container = document.getElementById('historico');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center;width:100%;color:var(--tech-cyan);">Acessando os registos da Base Estelar...</p>';

    try {
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
            container.innerHTML = `<p style="color:#ff6b6b;">Erro ao interceptar os dados: ${error.message}</p>`;
            return;
        }

        obrasGlobais = obras || [];
        montarFiltros(obrasGlobais);
        renderizarObras(obrasGlobais);
    } catch (err) {
        container.innerHTML = `<p style="color:#ff6b6b;">Erro crítico: ${err.message}</p>`;
    }
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
    const template = document.getElementById('template-historico');
    if (!container || !template) return;

    container.innerHTML = '';

    if (!obras || obras.length === 0) {
        container.innerHTML = '<p style="text-align:center;width:100%;">Nenhum registo encontrado na base de dados.</p>';
        return;
    }

    obras.forEach(obra => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.card');
        const tituloEl = clone.querySelector('.titulo');
        const imagemEl = clone.querySelector('.imagem-obra');
        const notaEl = clone.querySelector('.nota-final-numero');
        const qtdEl = clone.querySelector('.qtd-avaliacoes');
        const avalLabel = clone.querySelector('.aval-label');

        if (tituloEl) tituloEl.textContent = obra.titulo;
        if (imagemEl) imagemEl.src = obra.imagem_url || '';

        const qtdAvaliacoes = obra.avaliacoes ? obra.avaliacoes.length : 0;
        if (qtdEl) qtdEl.textContent = qtdAvaliacoes;
        if (avalLabel && qtdAvaliacoes === 1) avalLabel.textContent = 'avaliação';

        const mediasObj = processarMediasObra(obra.avaliacoes);
        if (notaEl) {
            notaEl.textContent = (mediasObj && qtdAvaliacoes > 0) ? mediasObj.mediaFinal : 'N/A';
        }

        if (card) {
            card.addEventListener('click', () => abrirModalObra(obra, mediasObj, qtdAvaliacoes));
        }

        container.appendChild(clone);
    });
}

function abrirModalObra(obra, mediasObj, qtdAvaliacoes) {
    const modal = document.getElementById('movie-modal');
    const modalContent = document.getElementById('modal-content');
    if (!modal || !modalContent) return;

    const minhaAvaliacao = (obra.avaliacoes && currentUser) ? obra.avaliacoes.find(av => av.user_id === currentUser.id) : null;

    let btnAcoesHtml = '<div class="modal-acoes">';
    
    // Botão de Inserir Sempre Visível (para permitir novas temporadas ou se não houver)
    btnAcoesHtml += `<button id="btn-modal-inserir" class="cyber-btn primary">Inserir Nova Avaliação</button>`;

    if (minhaAvaliacao) {
        btnAcoesHtml += `
            <button id="btn-modal-editar" class="cyber-btn secondary">Editar Minha Anterior</button>
            <button id="btn-modal-excluir" class="cyber-btn" style="background:#ff4d4d; color:#fff;">Excluir Minha</button>
        `;
    } else if (!obra.avaliacoes || obra.avaliacoes.length === 0) {
        btnAcoesHtml += `
            <button id="btn-modal-remover-vazia" class="cyber-btn" style="background:#ff4d4d; color:#fff; border-color:#ff4d4d;">Remover Obra Vazia</button>
        `;
    }
    btnAcoesHtml += '</div>';

    let mediasHtml = '<div style="color:var(--text-secondary);">Sem dados suficientes.</div>';
    if (mediasObj) {
        mediasHtml = `
            <div class="medias-grid">
                <div class="media-item"><span>História</span> <strong>${mediasObj.mediasDetalhadas.historia}</strong></div>
                <div class="media-item"><span>Personagens</span> <strong>${mediasObj.mediasDetalhadas.personagens}</strong></div>
                <div class="media-item"><span>Vis./Animação</span> <strong>${mediasObj.mediasDetalhadas.visual_animacao}</strong></div>
                <div class="media-item"><span>Som/Música</span> <strong>${mediasObj.mediasDetalhadas.som_musica}</strong></div>
                <div class="media-item"><span>Ritmo</span> <strong>${mediasObj.mediasDetalhadas.ritmo}</strong></div>
                <div class="media-item"><span>Originalidade</span> <strong>${mediasObj.mediasDetalhadas.originalidade}</strong></div>
                <div class="media-item"><span>Desfecho</span> <strong>${mediasObj.mediasDetalhadas.desfecho}</strong></div>
            </div>
        `;
    }

    let comentariosHtml = '';
    if (obra.avaliacoes && obra.avaliacoes.length > 0) {
        obra.avaliacoes.forEach(av => {
            const nomeOperador = (av.utilizadores && av.utilizadores.nome) ? av.utilizadores.nome.toUpperCase() : 'DESCONHECIDO';
            comentariosHtml += `
                <div class="comentario-card">
                    <div class="comentario-header">OP: ${nomeOperador} <span class="temporada-badge">Temp: ${av.temporada}</span></div>
                    <div class="comentario-body">
                        ${av.personagem_favorito ? `<div><span>Personagem:</span> ${av.personagem_favorito}</div>` : ''}
                        ${av.melhor_cena ? `<div><span>Cena:</span> ${av.melhor_cena}</div>` : ''}
                        ${av.recomendarias ? `<div><span>Recomenda:</span> ${av.recomendarias}</div>` : ''}
                        ${av.superou_expectativas ? `<div><span>Expectativas:</span> ${av.superou_expectativas}</div>` : ''}
                        ${av.define_numa_palavra ? `<div><span>Em uma palavra:</span> ${av.define_numa_palavra}</div>` : ''}
                    </div>
                </div>
            `;
        });
    } else {
        comentariosHtml = '<p style="color:var(--text-secondary);">Nenhum registo pessoal anexado.</p>';
    }

    modalContent.innerHTML = `
        <div class="modal-left">
            <img class="modal-poster" src="${obra.imagem_url || ''}" alt="Capa" />
            <div class="modal-info-basic">
                <span class="categoria-badge">${obra.categoria || 'Obra'}</span>
            </div>
        </div>
        <div class="modal-right">
            <h2 class="modal-titulo">${obra.titulo}</h2>
            <div class="modal-nota-geral">
                <span class="nota-label">Avaliação Global</span>
                <span class="nota-value">⭐ ${mediasObj ? mediasObj.mediaFinal : 'N/A'}</span>
                <span class="aval-count">(${qtdAvaliacoes} avaliações)</span>
            </div>
            <div class="modal-section">
                <h3>MÉDIAS DO COMANDO</h3>
                ${mediasHtml}
            </div>
            <div class="modal-section scrollable" style="max-height: 250px; overflow-y: auto;">
                <h3>RELATÓRIOS PESSOAIS</h3>
                <div class="lista-comentarios">
                    ${comentariosHtml}
                </div>
            </div>
            ${btnAcoesHtml}
        </div>
    `;

    // Listeners para os botões do modal
    const btnInserir = document.getElementById('btn-modal-inserir');
    const btnEditar = document.getElementById('btn-modal-editar');
    const btnExcluir = document.getElementById('btn-modal-excluir');
    const btnRemoverVazia = document.getElementById('btn-modal-remover-vazia');

    if (btnInserir) {
        btnInserir.addEventListener('click', () => {
            localStorage.setItem('brangola_pre_obra', JSON.stringify(obra));
            window.location.href = 'index.html';
        });
    }
    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            window.location.href = `editar.html?avaliacao_id=${minhaAvaliacao.id}`;
        });
    }
    if (btnExcluir) {
        btnExcluir.addEventListener('click', async () => {
            if (confirm('Aviso: Tem certeza que deseja apagar a sua avaliação?')) {
                const { error } = await supabase.from('avaliacoes').delete().eq('id', minhaAvaliacao.id);
                if (error) alert('Falha ao excluir: ' + error.message);
                else {
                    const { data: restate } = await supabase.from('avaliacoes').select('id').eq('obra_id', obra.id);
                    if (!restate || restate.length === 0) {
                        if (confirm('Esta era a última avaliação. Deseja remover também o filme/série da base?')) {
                            await supabase.from('obras').delete().eq('id', obra.id);
                        }
                    }
                    alert('Registo atualizado.');
                    modal.style.display = 'none';
                    carregarHistorico();
                }
            }
        });
    }
    if (btnRemoverVazia) {
        btnRemoverVazia.addEventListener('click', async () => {
            if (confirm(`Deseja remover "${obra.titulo}" permanentemente por não possuir avaliações?`)) {
                const { error } = await supabase.from('obras').delete().eq('id', obra.id);
                if (error) alert('Erro ao remover obra: ' + error.message);
                else {
                    alert('Obra removida da base estelar.');
                    modal.style.display = 'none';
                    carregarHistorico();
                }
            }
        });
    }

    modal.style.display = 'flex';
}

function montarFiltros(obras) {
    const categoriasContenedor = document.getElementById('categorias');
    if (!categoriasContenedor) return;
    categoriasContenedor.innerHTML = '';
    
    const categoriasSet = new Set();
    obras.forEach(o => { if (o.categoria) categoriasSet.add(o.categoria); });
    
    const btnTodas = document.createElement('button');
    btnTodas.textContent = 'TODAS';
    btnTodas.classList.add('cyber-btn', 'secondary', 'active');
    btnTodas.style.margin = '5px';
    btnTodas.addEventListener('click', () => {
        document.querySelectorAll('#categorias button').forEach(b => b.classList.remove('active'));
        btnTodas.classList.add('active');
        renderizarObras(obrasGlobais);
    });
    categoriasContenedor.appendChild(btnTodas);

    categoriasSet.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat.toUpperCase();
        btn.classList.add('cyber-btn', 'secondary');
        btn.style.margin = '5px';
        btn.addEventListener('click', () => {
            document.querySelectorAll('#categorias button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarObras(obrasGlobais.filter(o => o.categoria === cat));
        });
        categoriasContenedor.appendChild(btn);
    });
}
