import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar sessão local Custom Auth
  const session = localStorage.getItem('brangola_user');
  if (session) {
    window.location.href = 'index.html';
  }

  const form = document.getElementById('auth-form');
  const btnSubmit = document.getElementById('btn-submit');
  const toggleLink = document.getElementById('toggle-mode');
  const msgLabel = document.getElementById('auth-msg');
  const formTitle = document.getElementById('form-title');
  
  let isRegistering = false;

  // Alternar entre modo Login e Registo via Link
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isRegistering = !isRegistering;
    
    if (isRegistering) {
      formTitle.textContent = 'REGISTRO DE OPERADOR';
      btnSubmit.textContent = 'EFETUAR REGISTRO NA MATRIX';
      toggleLink.textContent = 'Já possui acesso? Clique para Entrar';
    } else {
      formTitle.textContent = 'LOGIN DO OPERADOR';
      btnSubmit.textContent = 'ENTRAR NA MATRIX';
      toggleLink.textContent = 'Quero Registrar-me';
    }
    msgLabel.textContent = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isRegistering) await handleRegister();
    else await handleLogin();
  });

  async function handleLogin() {
    const rawUsername = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    msgLabel.textContent = 'A processar a entrada na Matrix...';
    msgLabel.style.color = '#00f3ff';
    
    // Validar login (nome exato + senha exata, não criptografamos porque pediste para ser entre amigos)
    const { data: user, error } = await supabase
      .from('utilizadores')
      .select('*')
      .ilike('nome', rawUsername)
      .eq('senha', password)
      .maybeSingle();

    if (error || !user) {
      msgLabel.textContent = 'Acesso Negado: Utilizador não encontrado ou senha incorreta.';
      msgLabel.style.color = '#ff003c';
    } else {
      msgLabel.textContent = 'Acesso Autorizado!';
      msgLabel.style.color = '#bc13fe';
      
      // Salvar Sessão Manualmente 
      const sessionData = {
        id: user.id,
        nome: user.nome
      };
      localStorage.setItem('brangola_user', JSON.stringify(sessionData));
      
      setTimeout(() => window.location.href = 'index.html', 1000);
    }
  }

  async function handleRegister() {
    const rawUsername = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    msgLabel.textContent = 'A estabilizar nova conexão...';
    msgLabel.style.color = '#00f3ff';

    // Inserção directa 
    const { data, error } = await supabase
      .from('utilizadores')
      .insert([{ nome: rawUsername, senha: password }])
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        msgLabel.textContent = 'Falha: Já existe um operador com esse nome na rede.';
      } else {
        msgLabel.textContent = 'Falha crítica no banco: ' + error.message;
      }
      msgLabel.style.color = '#ff003c';
    } else if (data) {
      msgLabel.textContent = 'Registro efetuado! Autenticando...';
      msgLabel.style.color = '#bc13fe';
      
      // Auto-Login
      const sessionData = {
        id: data.id,
        nome: data.nome
      };
      localStorage.setItem('brangola_user', JSON.stringify(sessionData));
      
      setTimeout(() => window.location.href = 'index.html', 1500);
    }
  }
});
