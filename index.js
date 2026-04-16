import { supabase } from './supabase.js';

let currentUser = null;
let obraSelecionadaId = null;
let obrasExistentes = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Verificação de Sessão Manual
    const sessionStr = localStorage.getItem('brangola_user');
    if (!sessionStr) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = JSON.parse(sessionStr);

    if (document.getElementById('nome-operador')) {
        document.getElementById('nome-operador').textContent = currentUser.nome.toUpperCase();
    }

    // Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('brangola_user');
            window.location.href = 'login.html';
        });
    }

    const form = document.getElementById('avaliacao-form');
    const tituloInput = document.getElementById('titulo');
    const categoriaSelect = document.getElementById('categoria');
    const imagemUrlInput = document.getElementById('imagem_url');
    const buscaObraInput = document.getElementById('busca_obra');
    const sugestoesContainer = document.getElementById('sugestoes-obra');
    const campoTemporada = document.getElementById('campo-temporada');

    // Carregar obras iniciais para a busca
    try {
        const { data, error } = await supabase.from('obras').select('id, titulo, categoria, imagem_url');
        if (!error) obrasExistentes = data;
    } catch (err) { console.error(err); }

    // Lógica de Busca em Tempo Real
    buscaObraInput.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        sugestoesContainer.innerHTML = '';
        
        if (termo.length < 1) {
            sugestoesContainer.style.display = 'none';
            return;
        }

        const filtradas = obrasExistentes.filter(o => o.titulo.toLowerCase().includes(termo));
        
        if (filtradas.length > 0) {
            filtradas.forEach(obra => {
                const item = document.createElement('div');
                item.className = 'sugestao-item';
                item.textContent = obra.titulo;
                item.addEventListener('click', () => selecionarObra(obra));
                sugestoesContainer.appendChild(item);
            });
            sugestoesContainer.style.display = 'block';
        } else {
            sugestoesContainer.style.display = 'none';
        }
    });

    function selecionarObra(obra) {
        obraSelecionadaId = obra.id;
        tituloInput.value = obra.titulo;
        tituloInput.readOnly = true;
        categoriaSelect.value = obra.categoria || '';
        categoriaSelect.disabled = true;
        imagemUrlInput.value = obra.imagem_url || '';
        imagemUrlInput.readOnly = true;
        
        buscaObraInput.value = obra.titulo;
        sugestoesContainer.style.display = 'none';

        // Disparar o toggle da temporada após preencher a categoria
        verificarOcultarTemporada();
    }

    // Resetar campos se apagar a busca
    buscaObraInput.addEventListener('blur', () => {
        setTimeout(() => { sugestoesContainer.style.display = 'none'; }, 200);
    });

    // Lógica de Ocultar Temporada
    categoriaSelect.addEventListener('change', verificarOcultarTemporada);

    function verificarOcultarTemporada() {
        const tipo = categoriaSelect.value.toLowerCase();
        // Se for filme (Filmes ou Filme de...), oculta a temporada
        if (tipo.includes('filme')) {
            campoTemporada.style.display = 'none';
            document.getElementById('temporada').value = ''; // Limpa se estiver oculto
        } else {
            campoTemporada.style.display = 'block';
        }
    }

    // Submissão do Formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titulo = tituloInput.value;
        const categoria = categoriaSelect.value;
        const imagem_url = imagemUrlInput.value;
        const temporadaValue = document.getElementById('temporada').value || 'Geral';

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

        let obra_id = obraSelecionadaId;

        // Se não foi selecionada da lista, verificar se já existe pelo título ou criar nova
        if (!obra_id) {
            const { data: existente } = await supabase.from('obras').select('id').eq('titulo', titulo).maybeSingle();
            if (existente) {
                obra_id = existente.id;
            } else {
                const { data: novaObra, error: errObra } = await supabase.from('obras').insert([{
                    titulo, categoria, imagem_url
                }]).select('id').single();
                if (errObra) {
                    alert('Erro ao criar registro da obra: ' + errObra.message);
                    return;
                }
                obra_id = novaObra.id;
            }
        }

        const avaliacaoData = {
            obra_id,
            user_id: currentUser.id,
            temporada: temporadaValue,
            ...notas
        };

        const { error: errAval } = await supabase.from('avaliacoes').upsert([avaliacaoData], {
            onConflict: 'obra_id, user_id, temporada'
        });

        if (errAval) {
            alert('Erro ao transmitir dados para o Comando Central: ' + errAval.message);
        } else {
            alert('Dados sincronizados com sucesso na base estelar!');
            window.location.reload();
        }
    });
});
