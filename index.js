import { supabase } from './supabase.js';

let currentUser = null;

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

  // Logout Customizado
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

  let obrasExistentes = [];

  try {
    const { data: obrasData, error } = await supabase.from('obras').select('id, titulo, categoria, imagem_url');
    if (!error && obrasData) {
      obrasExistentes = obrasData;
      const selectExistente = document.getElementById('obra_existente');
      if (selectExistente) {
        obrasData.forEach(obra => {
          const option = document.createElement('option');
          option.value = obra.id;
          option.textContent = obra.titulo;
          selectExistente.appendChild(option);
        });
      }
    }
  } catch (err) {}

  const selectExistente = document.getElementById('obra_existente');
  if (selectExistente) {
    selectExistente.addEventListener('change', (e) => {
      const idSelecionado = e.target.value;
      if (idSelecionado) {
        const obraEncontrada = obrasExistentes.find(o => o.id === idSelecionado);
        if (obraEncontrada) {
          tituloInput.value = obraEncontrada.titulo;
          tituloInput.readOnly = true; 
          if (obraEncontrada.categoria) categoriaSelect.value = obraEncontrada.categoria;
          categoriaSelect.disabled = true;
          if (obraEncontrada.imagem_url) imagemUrlInput.value = obraEncontrada.imagem_url;
          imagemUrlInput.readOnly = true;
        }
      } else {
        tituloInput.value = '';
        tituloInput.readOnly = false;
        categoriaSelect.value = '';
        categoriaSelect.disabled = false;
        imagemUrlInput.value = '';
        imagemUrlInput.readOnly = false;
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = document.getElementById('titulo').value;
    const categoria = document.getElementById('categoria').value;
    const imagem_url = document.getElementById('imagem_url').value;
    const temporadaValue = document.getElementById('temporada').value || 'Geral';
    const obraIdSelecionada = document.getElementById('obra_existente').value;

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

    let obra_id = obraIdSelecionada;

    if (!obra_id) {
      const { data: existente } = await supabase.from('obras').select('id').eq('titulo', titulo).maybeSingle();
      if (existente) {
        obra_id = existente.id;
      } else {
        const { data: novaObra, error: errObra } = await supabase.from('obras').insert([{
          titulo, categoria, imagem_url
        }]).select('id').single();
        if (errObra) {
          alert('Erro ao criar obra: ' + errObra.message);
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
        alert('Erro ao guardar a avaliação! ' + errAval.message);
    } else {
        alert('Avaliação transmitida à Matrix com sucesso!');
        window.location.reload();
    }
  });
});
