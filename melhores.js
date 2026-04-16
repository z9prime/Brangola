import { supabase } from './supabase.js';

let obrasGlobais = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Verificação Manual de Sessão
    const sessionStr = localStorage.getItem('brangola_user');
    if (!sessionStr) {
        window.location.href = 'login.html';
        return;
    }

    // Logout
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

    await carregarTop10();
});

async function carregarTop10() {
    const container = document.getElementById('podio');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;width:100%;color:var(--tech-cyan);">Calculando Ranking Global Estelar...</p>';

    try {
        const { data, error } = await supabase
            .from('media_obras')
            .select('*')
            .order('media_geral', { ascending: false });

        if (error) {
            container.innerHTML = `<p style="color:#ff6b6b;">Erro ao interceptar os dados: ${error.message}</p>`;
            return;
        }

        obrasGlobais = (data || []).filter(d => d.media_geral > 0);
        montarFiltros(obrasGlobais);
        renderizarTop(obrasGlobais);
    } catch (err) {
        container.innerHTML = `<p style="color:#ff6b6b;">Erro crítico: ${err.message}</p>`;
    }
}

function montarFiltros(opcoes) {
    const containerTabs = document.getElementById('tabs-categorias');
    if (!containerTabs) return;
    containerTabs.innerHTML = '';

    const categoriasUnicas = new Set();
    opcoes.forEach(op => { if (op.categoria) categoriasUnicas.add(op.categoria); });

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
            renderizarTop(obrasGlobais.filter(o => o.categoria === cat));
        });
        containerTabs.appendChild(btnCat);
    });
}

function renderizarTop(lista) {
    const containerTop = document.getElementById('podium-top');
    const containerRest = document.getElementById('podio');
    const template = document.getElementById('template-melhores');
    if (!containerTop || !containerRest || !template) return;

    containerTop.innerHTML = '';
    containerRest.innerHTML = '';

    if (!lista || lista.length === 0) {
        containerRest.innerHTML = '<p style="text-align:center;">Nenhum registo enquadrado nos critérios de elitismo.</p>';
        return;
    }

    const top10 = lista.slice(0, 10);
    top10.forEach((obra, index) => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.card');
        const tituloEl = clone.querySelector('.titulo');
        const imagemEl = clone.querySelector('.imagem-obra');
        const notaEl = clone.querySelector('.nota-final-numero');
        const rankBadge = clone.querySelector('.rank-badge');

        if (tituloEl) tituloEl.textContent = obra.titulo;
        if (imagemEl) imagemEl.src = obra.imagem_url || '';
        if (notaEl) notaEl.textContent = (obra.media_geral || 0).toFixed(1);
        
        const rankNum = index + 1;
        if (rankBadge) rankBadge.textContent = `#${rankNum}`;

        if (card) {
            card.addEventListener('click', () => abrirModalObra(obra));

            if (rankNum <= 3) {
                card.classList.add('podium-item');
                if (rankNum === 1) card.classList.add('rank-1');
                else if (rankNum === 2) card.classList.add('rank-2');
                else if (rankNum === 3) card.classList.add('rank-3');
                containerTop.appendChild(clone);
            } else {
                containerRest.appendChild(clone);
            }
        }
    });
}

async function abrirModalObra(obraMedia) {
    const modal = document.getElementById('movie-modal');
    const modalContent = document.getElementById('modal-content');
    if (!modal || !modalContent) return;
    
    const idObra = obraMedia.id || obraMedia.obra_id;
    
    try {
        const { data: obraCompleta, error } = await supabase
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
            .eq('id', idObra)
            .single();

        let avaliacoes = (obraCompleta && obraCompleta.avaliacoes) ? obraCompleta.avaliacoes : [];

        const currentUserStr = localStorage.getItem('brangola_user');
        const currentUserObj = currentUserStr ? JSON.parse(currentUserStr) : null;
        const minhaAvaliacao = (currentUserObj && avaliacoes.length > 0) ? avaliacoes.find(av => av.user_id === currentUserObj.id) : null;

        let btnAcoesHtml = '';
        if (minhaAvaliacao) {
            btnAcoesHtml = `<div class="modal-acoes"><button id="btn-modal-editar" class="cyber-btn primary">Editar Minha Avaliação</button></div>`;
        }

        // Médias detalhadas
        let mediasHtml = '<div style="color:var(--text-secondary);">Sem dados suficientes.</div>';
        if (avaliacoes.length > 0) {
            const criterios = ['historia', 'personagens', 'visual_animacao', 'som_musica', 'ritmo', 'originalidade', 'desfecho'];
            const mediasDetalhadas = {};
            criterios.forEach(crit => {
                let soma = 0; let count = 0;
                avaliacoes.forEach(av => {
                    if (av[crit] !== null && av[crit] !== undefined) { soma += parseFloat(av[crit]); count++; }
                });
                mediasDetalhadas[crit] = count > 0 ? (soma / count).toFixed(1) : 'N/A';
            });

            mediasHtml = `
                <div class="medias-grid">
                    <div class="media-item"><span>História</span> <strong>${mediasDetalhadas.historia}</strong></div>
                    <div class="media-item"><span>Personagens</span> <strong>${mediasDetalhadas.personagens}</strong></div>
                    <div class="media-item"><span>Vis./Animação</span> <strong>${mediasDetalhadas.visual_animacao}</strong></div>
                    <div class="media-item"><span>Som/Música</span> <strong>${mediasDetalhadas.som_musica}</strong></div>
                    <div class="media-item"><span>Ritmo</span> <strong>${mediasDetalhadas.ritmo}</strong></div>
                    <div class="media-item"><span>Originalidade</span> <strong>${mediasDetalhadas.originalidade}</strong></div>
                    <div class="media-item"><span>Desfecho</span> <strong>${mediasDetalhadas.desfecho}</strong></div>
                </div>
            `;
        }

        let comentariosHtml = '';
        if (avaliacoes.length > 0) {
            avaliacoes.forEach(av => {
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
                <img class="modal-poster" src="${obraMedia.imagem_url || ''}" alt="Capa" />
                <div class="modal-info-basic">
                    <span class="categoria-badge">${obraMedia.categoria || 'Obra'}</span>
                </div>
            </div>
            <div class="modal-right">
                <h2 class="modal-titulo">${obraMedia.titulo}</h2>
                <div class="modal-nota-geral">
                    <span class="nota-label">Avaliação Global</span>
                    <span class="nota-value">⭐ ${(obraMedia.media_geral || 0).toFixed(1)}</span>
                    <span class="aval-count">(${avaliacoes.length} avaliações)</span>
                </div>
                <div class="modal-section">
                    <h3>MÉDIAS DO COMANDO</h3>
                    ${mediasHtml}
                </div>
                <div class="modal-section scrollable" style="max-height: 250px; overflow-y: auto;">
                    <h3>RELATÓRIOS PESSOAIS</h3>
                    <div class="lista-comentarios">${comentariosHtml}</div>
                </div>
                ${btnAcoesHtml}
            </div>
        `;

        const btnModalEditar = document.getElementById('btn-modal-editar');
        if (btnModalEditar && minhaAvaliacao) {
            btnModalEditar.addEventListener('click', () => {
                window.location.href = `editar.html?avaliacao_id=${minhaAvaliacao.id}`;
            });
        }
    } catch (err) {
        modalContent.innerHTML = `<p style="padding:20px; color:#ff6b6b;">Erro ao carregar detalhes: ${err.message}</p>`;
    }

    modal.style.display = 'flex';
}
