// --- COLOQUE AQUI AS SUAS CREDENCIAIS DO SUPABASE (obtidas no seu painel supabase.com) ---
const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_DO_SUPABASE';

let dadosTemporariosCliente = {};

// Função auxiliar para requisições ao Supabase
async function apiSupabase(endpoint, metodo = 'GET', dados = null) {
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    
    const config = { method: metodo, headers };
    if (dados) config.body = JSON.stringify(dados);

    try {
        const resposta = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, config);
        if (!resposta.ok) throw new Error('Erro na requisição');
        return await resposta.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

// --- LÓGICA DA PÁGINA DO CLIENTE (index.html) ---
const formAgendamento = document.getElementById('form-agendamento');
if (formAgendamento) {
    // Carregar configurações dinâmicas (valor e pix)
    carregarConfiguracoesPublicas();

    formAgendamento.addEventListener('submit', (e) => {
        e.preventDefault();
        dadosTemporariosCliente = {
            nome: document.getElementById('nome').value,
            whatsapp: document.getElementById('whatsapp').value,
            area: document.getElementById('area').value,
            assunto: document.getElementById('assunto').value,
            data_desejada: document.getElementById('data').value,
            protocolo: 'KM-2026-' + Math.floor(1000 + Math.random() * 9000),
            status: 'Aguardando Pagamento'
        };

        // Oculta form e mostra pagamento
        formAgendamento.classList.add('hidden');
        document.getElementById('secao-pagamento').classList.remove('hidden');
    });

    document.getElementById('btn-copiar').addEventListener('click', () => {
        const chave = document.getElementById('lbl-chave-pix').innerText;
        navigator.clipboard.writeText(chave);
        alert('Chave Pix copiada com sucesso!');
    });

    document.getElementById('btn-finalizar').addEventListener('click', async () => {
        const btn = document.getElementById('btn-finalizar');
        btn.innerText = 'Enviando...';
        btn.disabled = true;

        // Envia para o Supabase
        await apiSupabase('agendamentos', 'POST', dadosTemporariosCliente);

        document.getElementById('secao-pagamento').classList.add('hidden');
        document.getElementById('txt-protocolo').innerText = dadosTemporariosCliente.protocolo;
        document.getElementById('secao-sucesso').classList.remove('hidden');
    });
}

async function carregarConfiguracoesPublicas() {
    const configs = await apiSupabase('configuracoes?select=*');
    if (configs && configs.length > 0) {
        if(document.getElementById('lbl-valor')) document.getElementById('lbl-valor').innerText = 'R$ ' + configs[0].valor;
        if(document.getElementById('lbl-chave-pix')) document.getElementById('lbl-chave-pix').innerText = configs[0].pix;
    }
}


// --- LÓGICA DO PAINEL ADMINISTRATIVO (painel.html) ---
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const senha = document.getElementById('login-senha').value;
        
        // Senha padrão simples de acesso ao painel (pode alterar conforme preferir)
        if (senha === 'admin123' || senha === '123456') {
            document.getElementById('tela-login').classList.add('hidden');
            document.getElementById('painel-conteudo').classList.remove('hidden');
            carregarAtendimentosPainel();
            carregarConfiguracoesPainel();
        } else {
            alert('Senha incorreta! (Tente admin123)');
        }
    });
}

function mudarAba(aba, event) {
    if(event) event.preventDefault();
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.sidebar ul li a').forEach(a => a.classList.remove('active'));
    
    document.getElementById('aba-' + aba).classList.remove('hidden');
    if(event) event.currentTarget.classList.add('active');
}

async function carregarAtendimentosPainel() {
    const lista = document.getElementById('lista-atendimentos');
    if (!lista) return;

    lista.innerHTML = '<tr><td colspan="7" style="text-align:center;">Carregando dados da nuvem...</td></tr>';
    
    const dados = await apiSupabase('agendamentos?select=*&order=id.desc');
    
    if (!dados || dados.length === 0) {
        lista.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum atendimento registrado ainda.</td></tr>';
        return;
    }

    lista.innerHTML = '';
    dados.forEach(item => {
        const badgeClass = item.status === 'Confirmado' ? 'verde' : 'amarelo';
        lista.innerHTML += `
            <tr>
                <td><strong>${item.protocolo}</strong></td>
                <td>${item.nome}</td>
                <td>${item.whatsapp}</td>
                <td>${item.area}<br><small>${item.assunto}</small></td>
                <td>${item.data_desejada.replace('T', ' ')}</td>
                <td><span class="badge ${badgeClass}">${item.status}</span></td>
                <td>
                    ${item.status !== 'Confirmado' ? `<button class="btn-small verde" onclick="confirmarAtendimento(${item.id})">Confirmar</button>` : '✅ Ok'}
                </td>
            </tr>
        `;
    });
}

async function confirmarAtendimento(id) {
    await apiSupabase(`agendamentos?id=eq.${id}`, 'PATCH', { status: 'Confirmado' });
    alert('Atendimento confirmado com sucesso!');
    carregarAtendimentosPainel();
}

async function carregarConfiguracoesPainel() {
    const configs = await apiSupabase('configuracoes?select=*');
    if (configs && configs.length > 0) {
        document.getElementById('cfg-valor').value = configs[0].valor || '150,00';
        document.getElementById('cfg-pix').value = configs[0].pix || '';
        document.getElementById('cfg-whatsapp').value = configs[0].whatsapp || '';
    }
}

const formConfig = document.getElementById('form-config');
if (formConfig) {
    formConfig.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novasConfig = {
            id: 1,
            valor: document.getElementById('cfg-valor').value,
            pix: document.getElementById('cfg-pix').value,
            whatsapp: document.getElementById('cfg-whatsapp').value
        };

        // Salva as configurações atualizadas no Supabase
        await apiSupabase('configuracoes', 'POST', novasConfig);
        alert('Configurações salvas com sucesso no sistema!');
    });
}

function fazerLogout() {
    location.reload();
}