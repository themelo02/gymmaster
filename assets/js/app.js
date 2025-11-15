// Banco de dados simulado usando localStorage
class DatabaseManager {
    constructor() {
        this.initDatabase();
    }
    
    initDatabase() {
        // Inicializar tabelas se não existirem
        if (!localStorage.getItem('usuarios')) {
            localStorage.setItem('usuarios', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('atletas')) {
            localStorage.setItem('atletas', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('pagamentos')) {
            localStorage.setItem('pagamentos', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('configuracoes')) {
            localStorage.setItem('configuracoes', JSON.stringify({
                meta_receita_mensal: 500000
            }));
        }
    }
    
    // Gerenciamento de usuários
    criarUsuario(nome, email, telefone, senha) {
        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        
        // Verificar se email já existe
        if (usuarios.find(u => u.email === email)) {
            return false;
        }
        
        // Criar novo usuário
        const novoUsuario = {
            id: Date.now(),
            nome,
            email,
            telefone,
            senha: this.hashPassword(senha),
            data_criacao: new Date().toISOString().split('T')[0],
            tipo: 'admin'
        };
        
        usuarios.push(novoUsuario);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        
        return true;
    }
    
    verificarLogin(email, senha) {
        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        const usuario = usuarios.find(u => u.email === email);
        
        if (usuario && usuario.senha === this.hashPassword(senha)) {
            return {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone,
                tipo: usuario.tipo
            };
        }
        
        return null;
    }
    
    hashPassword(password) {
        // Hash simples para demonstração (em produção usar bcrypt)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }
    
    // Gerenciamento de atletas
    addAtleta(nome, telefone, email, data_vencimento, plano, valor_plano, observacoes = "") {
        const atletas = JSON.parse(localStorage.getItem('atletas'));
        
        const novoAtleta = {
            id: Date.now(),
            nome,
            telefone,
            email,
            data_cadastro: new Date().toISOString().split('T')[0],
            data_vencimento,
            status: this.calcularStatus(data_vencimento),
            observacoes,
            plano,
            valor_plano
        };
        
        atletas.push(novoAtleta);
        localStorage.setItem('atletas', JSON.stringify(atletas));
        
        return novoAtleta.id;
    }
    
    getAllAtletas() {
        const atletas = JSON.parse(localStorage.getItem('atletas'));
        
        // Atualizar status antes de retornar
        atletas.forEach(atleta => {
            atleta.status = this.calcularStatus(atleta.data_vencimento);
        });
        
        localStorage.setItem('atletas', JSON.stringify(atletas));
        
        return atletas;
    }
    
    getAtletaById(id) {
        const atletas = JSON.parse(localStorage.getItem('atletas'));
        return atletas.find(a => a.id === parseInt(id));
    }
    
    updateAtleta(id, nome, telefone, email, data_vencimento, plano, valor_plano, observacoes) {
        const atletas = JSON.parse(localStorage.getItem('atletas'));
        const index = atletas.findIndex(a => a.id === parseInt(id));
        
        if (index !== -1) {
            atletas[index] = {
                ...atletas[index],
                nome,
                telefone,
                email,
                data_vencimento,
                plano,
                valor_plano,
                observacoes,
                status: this.calcularStatus(data_vencimento)
            };
            
            localStorage.setItem('atletas', JSON.stringify(atletas));
            return true;
        }
        
        return false;
    }
    
    excluirAtleta(id) {
        const atletas = JSON.parse(localStorage.getItem('atletas'));
        const pagamentos = JSON.parse(localStorage.getItem('pagamentos'));
        
        // Remover atleta
        const novaListaAtletas = atletas.filter(a => a.id !== parseInt(id));
        localStorage.setItem('atletas', JSON.stringify(novaListaAtletas));
        
        // Remover pagamentos do atleta
        const novaListaPagamentos = pagamentos.filter(p => p.atleta_id !== parseInt(id));
        localStorage.setItem('pagamentos', JSON.stringify(novaListaPagamentos));
        
        return true;
    }
    
    calcularStatus(data_vencimento) {
        const hoje = new Date();
        const vencimento = new Date(data_vencimento);
        const diffTime = vencimento.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return 'vencido';
        } else if (diffDays <= 7) {
            return 'alerta';
        } else {
            return 'ativo';
        }
    }
    
    // Gerenciamento de pagamentos
    registrarPagamento(atleta_id, data_pagamento, valor, mes_referencia, forma_pagamento, observacoes) {
        const pagamentos = JSON.parse(localStorage.getItem('pagamentos'));
        
        const novoPagamento = {
            id: Date.now(),
            atleta_id: parseInt(atleta_id),
            data_pagamento,
            valor: parseFloat(valor),
            mes_referencia,
            forma_pagamento,
            observacoes
        };
        
        pagamentos.push(novoPagamento);
        localStorage.setItem('pagamentos', JSON.stringify(pagamentos));
        
        return true;
    }
    
    getPagamentos() {
        const pagamentos = JSON.parse(localStorage.getItem('pagamentos'));
        const atletas = JSON.parse(localStorage.getItem('atletas'));
        
        // Adicionar nome do atleta aos pagamentos
        return pagamentos.map(pagamento => {
            const atleta = atletas.find(a => a.id === pagamento.atleta_id);
            return {
                ...pagamento,
                atleta_nome: atleta ? atleta.nome : 'Atleta não encontrado'
            };
        });
    }
    
    // Estatísticas
    getEstatisticasAvancadas() {
        const atletas = this.getAllAtletas();
        const pagamentos = this.getPagamentos();
        
        // Receita do mês atual
        const mesAtual = new Date().toISOString().substring(0, 7);
        const receitaMesAtual = pagamentos
            .filter(p => p.mes_referencia === mesAtual)
            .reduce((sum, p) => sum + p.valor, 0);
        
        // Receita últimos 6 meses
        const receitaMeses = [];
        for (let i = 5; i >= 0; i--) {
            const data = new Date();
            data.setMonth(data.getMonth() - i);
            const mes = data.toISOString().substring(0, 7);
            
            const receita = pagamentos
                .filter(p => p.mes_referencia === mes)
                .reduce((sum, p) => sum + p.valor, 0);
            
            receitaMeses.push({
                mes,
                receita_mensal: receita
            });
        }
        
        // Estatísticas de atletas
        const totalAtletas = atletas.length;
        const ativos = atletas.filter(a => a.status === 'ativo').length;
        const vencidos = atletas.filter(a => a.status === 'vencido').length;
        const alertas = atletas.filter(a => a.status === 'alerta').length;
        const ticketMedio = atletas.length > 0 ? 
            atletas.reduce((sum, a) => sum + a.valor_plano, 0) / atletas.length : 0;
        
        return {
            receita_mes_atual: receitaMesAtual,
            receita_meses: receitaMeses,
            total_atletas: totalAtletas,
            ativos,
            vencidos,
            alertas,
            ticket_medio: ticketMedio
        };
    }
    
    getMetaReceita() {
        const configuracoes = JSON.parse(localStorage.getItem('configuracoes'));
        return configuracoes.meta_receita_mensal || 500000;
    }
    
    setMetaReceita(valor) {
        const configuracoes = JSON.parse(localStorage.getItem('configuracoes'));
        configuracoes.meta_receita_mensal = parseFloat(valor);
        localStorage.setItem('configuracoes', JSON.stringify(configuracoes));
    }
    
    getNotificacoes() {
        const atletas = this.getAllAtletas();
        const hoje = new Date();
        
        const notificacoes = [];
        
        atletas.forEach(atleta => {
            const vencimento = new Date(atleta.data_vencimento);
            const diffTime = vencimento.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 7 && atleta.status !== 'vencido') {
                if (diffDays < 0) {
                    notificacoes.push(`❌ ${atleta.nome} - Vencido`);
                } else if (diffDays === 0) {
                    notificacoes.push(`⚠️ ${atleta.nome} - Vence hoje!`);
                } else {
                    notificacoes.push(`🔔 ${atleta.nome} - Vence em ${diffDays} dias`);
                }
            }
        });
        
        return notificacoes;
    }
}

// Gerenciador da aplicação
class GymMasterApp {
    constructor() {
        this.db = new DatabaseManager();
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkFirstAccess();
        this.setDefaultDates();
    }
    
    setupEventListeners() {
        // Login
        document.getElementById('login-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Cadastro
        document.getElementById('register-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        document.getElementById('back-to-login').addEventListener('click', () => {
            this.showLoginForm();
        });
        
        // Navegação
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(e.target.getAttribute('data-page'));
            });
        });
        
        // Menu toggle
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('hidden');
        });
        
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
        
        // Formulários
        document.getElementById('form-cadastro-atleta').addEventListener('submit', (e) => {
            e.preventDefault();
            this.cadastrarAtleta();
        });
        
        document.getElementById('form-editar-atleta').addEventListener('submit', (e) => {
            e.preventDefault();
            this.atualizarAtleta();
        });
        
        document.getElementById('btn-excluir-atleta').addEventListener('click', () => {
            this.excluirAtleta();
        });
        
        document.getElementById('form-registrar-pagamento').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registrarPagamento();
        });
        
        document.getElementById('btn-salvar-meta').addEventListener('click', () => {
            this.salvarMetaReceita();
        });
        
        document.getElementById('btn-logout').addEventListener('click', () => {
            this.logout();
        });
        
        // Filtros
        document.getElementById('filtro-nome').addEventListener('input', () => {
            this.filtrarAtletas();
        });
        
        document.getElementById('filtro-status').addEventListener('change', () => {
            this.filtrarAtletas();
        });
    }
    
    checkFirstAccess() {
        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        if (usuarios.length === 0) {
            document.getElementById('first-access-info').classList.remove('hidden');
            this.showRegisterForm();
        }
    }
    
    setDefaultDates() {
        // Definir data de vencimento padrão (próximo mês)
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        document.getElementById('atleta-vencimento').value = nextMonth.toISOString().split('T')[0];
        
        // Definir data de pagamento padrão (hoje)
        document.getElementById('pagamento-data').value = new Date().toISOString().split('T')[0];
        
        // Definir mês de referência padrão (mês atual)
        document.getElementById('pagamento-mes').value = new Date().toISOString().substring(0, 7);
    }
    
    showLoginForm() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    }
    
    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }
    
    handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showAlert('Preencha todos os campos!', 'danger');
            return;
        }
        
        const usuario = this.db.verificarLogin(email, password);
        
        if (usuario) {
            this.currentUser = usuario;
            this.showMainApp();
        } else {
            this.showAlert('Email ou senha incorretos!', 'danger');
        }
    }
    
    handleRegister() {
        const nome = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const telefone = document.getElementById('register-phone').value;
        const senha = document.getElementById('register-password').value;
        const confirmarSenha = document.getElementById('register-confirm-password').value;
        
        if (!nome || !email || !senha || !confirmarSenha) {
            this.showAlert('Preencha todos os campos obrigatórios!', 'danger');
            return;
        }
        
        if (senha !== confirmarSenha) {
            this.showAlert('As senhas não coincidem!', 'danger');
            return;
        }
        
        if (senha.length < 6) {
            this.showAlert('A senha deve ter pelo menos 6 caracteres!', 'danger');
            return;
        }
        
        const sucesso = this.db.criarUsuario(nome, email, telefone, senha);
        
        if (sucesso) {
            this.showAlert('✅ Conta criada com sucesso! Faça login para continuar.', 'success');
            this.showLoginForm();
        } else {
            this.showAlert('❌ Este email já está em uso!', 'danger');
        }
    }
    
    showMainApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        // Atualizar informações do usuário
        document.getElementById('user-name').textContent = `👤 ${this.currentUser.nome}`;
        document.getElementById('page-title').textContent = '🏋️ GymMaster';
        
        // Carregar dados iniciais
        this.loadDashboard();
        this.loadNotifications();
        this.loadAtletasForSelect();
    }
    
    navigateTo(page) {
        // Esconder todas as páginas
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
        });
        
        // Mostrar página selecionada
        document.getElementById(`${page}-page`).classList.remove('hidden');
        
        // Atualizar título
        const pageTitles = {
            'dashboard': '📊 Dashboard',
            'cadastro-atleta': '➕ Cadastrar Atleta',
            'lista-atletas': '👥 Listar Atletas',
            'pagamentos': '💰 Pagamentos',
            'relatorios': '📊 Relatórios',
            'configuracoes': '⚙️ Configurações',
            'perfil': '👤 Perfil'
        };
        
        document.getElementById('page-title').textContent = pageTitles[page];
        this.currentPage = page;
        
        // Carregar dados específicos da página
        switch(page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'lista-atletas':
                this.loadAtletasTable();
                break;
            case 'pagamentos':
                this.loadPagamentosTable();
                break;
            case 'relatorios':
                this.loadRelatorios();
                break;
            case 'configuracoes':
                this.loadConfiguracoes();
                break;
            case 'perfil':
                this.loadPerfil();
                break;
        }
    }
    
    switchTab(tabId) {
        // Desativar todas as tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Ativar tab selecionada
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }
    
    loadDashboard() {
        const stats = this.db.getEstatisticasAvancadas();
        const meta = this.db.getMetaReceita();
        const percentualMeta = meta > 0 ? (stats.receita_mes_atual / meta) * 100 : 0;
        
        // Atualizar KPIs
        document.getElementById('kpi-receita').textContent = `KZ ${stats.receita_mes_atual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('kpi-meta').textContent = `${percentualMeta.toFixed(1)}% da meta`;
        document.getElementById('kpi-ativos').textContent = stats.ativos;
        document.getElementById('kpi-alertas').textContent = stats.alertas;
        document.getElementById('kpi-ticket').textContent = `KZ ${stats.ticket_medio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        
        // Criar gráfico
        this.createRevenueChart(stats.receita_meses);
    }
    
    createRevenueChart(data) {
        const ctx = document.getElementById('revenue-chart').getContext('2d');
        
        // Destruir gráfico anterior se existir
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }
        
        this.revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.mes),
                datasets: [{
                    label: 'Receita Mensal (KZ)',
                    data: data.map(d => d.receita_mensal),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Receita dos Últimos 6 Meses'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'KZ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    }
    
    loadNotifications() {
        const notificacoes = this.db.getNotificacoes();
        const container = document.getElementById('notifications-list');
        container.innerHTML = '';
        
        if (notificacoes.length === 0) {
            container.innerHTML = '<div class="notification info">Nenhuma notificação</div>';
            return;
        }
        
        notificacoes.slice(0, 3).forEach(notif => {
            const div = document.createElement('div');
            div.className = 'notification warning';
            div.textContent = notif;
            container.appendChild(div);
        });
    }
    
    cadastrarAtleta() {
        const nome = document.getElementById('atleta-nome').value;
        const telefone = document.getElementById('atleta-telefone').value;
        const email = document.getElementById('atleta-email').value;
        const data_vencimento = document.getElementById('atleta-vencimento').value;
        const plano = document.getElementById('atleta-plano').value;
        const valor_plano = parseFloat(document.getElementById('atleta-valor').value);
        const observacoes = document.getElementById('atleta-observacoes').value;
        
        if (!nome || !data_vencimento || valor_plano <= 0) {
            this.showAlert('Preencha os campos obrigatórios!', 'danger');
            return;
        }
        
        try {
            const atletaId = this.db.addAtleta(
                nome, telefone, email, data_vencimento, plano, valor_plano, observacoes
            );
            
            this.showAlert(`✅ Atleta ${nome} cadastrado com sucesso! ID: ${atletaId}`, 'success');
            document.getElementById('form-cadastro-atleta').reset();
            this.setDefaultDates();
            
            // Recarregar notificações
            this.loadNotifications();
        } catch (e) {
            this.showAlert(`❌ Erro: ${e.message}`, 'danger');
        }
    }
    
    loadAtletasTable() {
        const atletas = this.db.getAllAtletas();
        const tbody = document.getElementById('atletas-table-body');
        tbody.innerHTML = '';
        
        if (atletas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Nenhum atleta cadastrado</td></tr>';
            return;
        }
        
        atletas.forEach(atleta => {
            const tr = document.createElement('tr');
            
            // Determinar classe de status
            let statusClass = '';
            let statusText = '';
            
            switch(atleta.status) {
                case 'ativo':
                    statusClass = 'status-active';
                    statusText = 'Ativo';
                    break;
                case 'alerta':
                    statusClass = 'status-alert';
                    statusText = 'Alerta';
                    break;
                case 'vencido':
                    statusClass = 'status-expired';
                    statusText = 'Vencido';
                    break;
            }
            
            tr.innerHTML = `
                <td>${atleta.id}</td>
                <td>${atleta.nome}</td>
                <td>${atleta.telefone || '-'}</td>
                <td>${atleta.email || '-'}</td>
                <td>${atleta.plano}</td>
                <td>KZ ${atleta.valor_plano.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td>${new Date(atleta.data_vencimento).toLocaleDateString('pt-BR')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm editar-atleta" data-id="${atleta.id}">Editar</button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        // Adicionar event listeners para botões de edição
        document.querySelectorAll('.editar-atleta').forEach(btn => {
            btn.addEventListener('click', () => {
                this.editarAtleta(btn.getAttribute('data-id'));
            });
        });
    }
    
    filtrarAtletas() {
        const filtroNome = document.getElementById('filtro-nome').value.toLowerCase();
        const filtroStatus = document.getElementById('filtro-status').value;
        
        const rows = document.querySelectorAll('#atletas-table-body tr');
        
        rows.forEach(row => {
            const nome = row.cells[1].textContent.toLowerCase();
            const status = row.cells[7].querySelector('.status-badge').textContent.toLowerCase();
            
            const nomeMatch = nome.includes(filtroNome);
            const statusMatch = filtroStatus === 'Todos' || 
                               (filtroStatus === 'ativo' && status === 'ativo') ||
                               (filtroStatus === 'alerta' && status === 'alerta') ||
                               (filtroStatus === 'vencido' && status === 'vencido');
            
            row.style.display = nomeMatch && statusMatch ? '' : 'none';
        });
    }
    
    editarAtleta(id) {
        const atleta = this.db.getAtletaById(id);
        
        if (!atleta) {
            this.showAlert('Atleta não encontrado!', 'danger');
            return;
        }
        
        // Preencher formulário de edição
        document.getElementById('editar-atleta-id').value = atleta.id;
        document.getElementById('editar-nome').value = atleta.nome;
        document.getElementById('editar-telefone').value = atleta.telefone || '';
        document.getElementById('editar-email').value = atleta.email || '';
        document.getElementById('editar-plano').value = atleta.plano;
        document.getElementById('editar-valor').value = atleta.valor_plano;
        document.getElementById('editar-vencimento').value = atleta.data_vencimento;
        document.getElementById('editar-observacoes').value = atleta.observacoes || '';
        
        // Mostrar card de edição
        document.getElementById('editar-atleta-card').style.display = 'block';
        
        // Scroll para o formulário
        document.getElementById('editar-atleta-card').scrollIntoView({ behavior: 'smooth' });
    }
    
    atualizarAtleta() {
        const id = document.getElementById('editar-atleta-id').value;
        const nome = document.getElementById('editar-nome').value;
        const telefone = document.getElementById('editar-telefone').value;
        const email = document.getElementById('editar-email').value;
        const data_vencimento = document.getElementById('editar-vencimento').value;
        const plano = document.getElementById('editar-plano').value;
        const valor_plano = parseFloat(document.getElementById('editar-valor').value);
        const observacoes = document.getElementById('editar-observacoes').value;
        
        if (!nome || !data_vencimento || valor_plano <= 0) {
            this.showAlert('Preencha os campos obrigatórios!', 'danger');
            return;
        }
        
        const sucesso = this.db.updateAtleta(
            id, nome, telefone, email, data_vencimento, plano, valor_plano, observacoes
        );
        
        if (sucesso) {
            this.showAlert('✅ Atleta atualizado!', 'success');
            this.loadAtletasTable();
            this.loadNotifications();
            
            // Esconder formulário de edição
            document.getElementById('editar-atleta-card').style.display = 'none';
        } else {
            this.showAlert('❌ Erro ao atualizar atleta!', 'danger');
        }
    }
    
    excluirAtleta() {
        const id = document.getElementById('editar-atleta-id').value;
        const nome = document.getElementById('editar-nome').value;
        
        if (confirm(`Tem certeza que deseja excluir o atleta "${nome}"? Esta ação não pode ser desfeita.`)) {
            const sucesso = this.db.excluirAtleta(id);
            
            if (sucesso) {
                this.showAlert('✅ Atleta excluído!', 'success');
                this.loadAtletasTable();
                this.loadNotifications();
                
                // Esconder formulário de edição
                document.getElementById('editar-atleta-card').style.display = 'none';
            } else {
                this.showAlert('❌ Erro ao excluir atleta!', 'danger');
            }
        }
    }
    
    loadAtletasForSelect() {
        const atletas = this.db.getAllAtletas();
        const select = document.getElementById('pagamento-atleta');
        select.innerHTML = '<option value="">Selecione um atleta</option>';
        
        atletas.forEach(atleta => {
            const option = document.createElement('option');
            option.value = atleta.id;
            option.textContent = atleta.nome;
            select.appendChild(option);
        });
    }
    
    registrarPagamento() {
        const atleta_id = document.getElementById('pagamento-atleta').value;
        const valor = parseFloat(document.getElementById('pagamento-valor').value);
        const forma_pagamento = document.getElementById('pagamento-forma').value;
        const data_pagamento = document.getElementById('pagamento-data').value;
        const mes_referencia = document.getElementById('pagamento-mes').value;
        const observacoes = document.getElementById('pagamento-observacoes').value;
        
        if (!atleta_id || valor <= 0 || !mes_referencia) {
            this.showAlert('Preencha os campos obrigatórios!', 'danger');
            return;
        }
        
        const sucesso = this.db.registrarPagamento(
            atleta_id, data_pagamento, valor, mes_referencia, forma_pagamento, observacoes
        );
        
        if (sucesso) {
            this.showAlert('✅ Pagamento registrado!', 'success');
            document.getElementById('form-registrar-pagamento').reset();
            this.setDefaultDates();
            
            // Recarregar dashboard
            this.loadDashboard();
        } else {
            this.showAlert('❌ Erro ao registrar pagamento!', 'danger');
        }
    }
    
    loadPagamentosTable() {
        const pagamentos = this.db.getPagamentos();
        const tbody = document.getElementById('pagamentos-table-body');
        tbody.innerHTML = '';
        
        if (pagamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum pagamento registrado</td></tr>';
            return;
        }
        
        pagamentos.forEach(pagamento => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${pagamento.id}</td>
                <td>${pagamento.atleta_nome}</td>
                <td>${new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR')}</td>
                <td>KZ ${pagamento.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td>${pagamento.mes_referencia}</td>
                <td>${pagamento.forma_pagamento}</td>
                <td>${pagamento.observacoes || '-'}</td>
            `;
            
            tbody.appendChild(tr);
        });
    }
    
    loadRelatorios() {
        const stats = this.db.getEstatisticasAvancadas();
        
        // Atualizar KPIs
        document.getElementById('relatorio-receita').textContent = `KZ ${stats.receita_mes_atual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('relatorio-total').textContent = stats.total_atletas;
        document.getElementById('relatorio-ticket').textContent = `KZ ${stats.ticket_medio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        
        // Criar gráfico
        this.createRelatoriosChart(stats.receita_meses);
    }
    
    createRelatoriosChart(data) {
        const ctx = document.getElementById('relatorios-chart').getContext('2d');
        
        // Destruir gráfico anterior se existir
        if (this.relatoriosChart) {
            this.relatoriosChart.destroy();
        }
        
        this.relatoriosChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.mes),
                datasets: [{
                    label: 'Receita Mensal (KZ)',
                    data: data.map(d => d.receita_mensal),
                    backgroundColor: '#2ecc71',
                    borderColor: '#27ae60',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Receita dos Últimos 6 Meses'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'KZ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    }
    
    loadConfiguracoes() {
        const meta = this.db.getMetaReceita();
        document.getElementById('meta-receita').value = meta;
    }
    
    salvarMetaReceita() {
        const meta = document.getElementById('meta-receita').value;
        
        if (!meta || meta <= 0) {
            this.showAlert('Digite uma meta válida!', 'danger');
            return;
        }
        
        this.db.setMetaReceita(meta);
        this.showAlert('✅ Meta atualizada!', 'success');
    }
    
    loadPerfil() {
        const container = document.getElementById('perfil-info');
        container.innerHTML = `
            <p><strong>Nome:</strong> ${this.currentUser.nome}</p>
            <p><strong>Email:</strong> ${this.currentUser.email}</p>
            <p><strong>Telefone:</strong> ${this.currentUser.telefone || 'Não informado'}</p>
            <p><strong>Tipo:</strong> ${this.currentUser.tipo}</p>
        `;
    }
    
    logout() {
        this.currentUser = null;
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        
        // Limpar formulários
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
    }
    
    showAlert(message, type) {
        const alert = document.getElementById('login-alert');
        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.classList.remove('hidden');
        
        // Auto-esconder após 5 segundos
        setTimeout(() => {
            alert.classList.add('hidden');
        }, 5000);
    }
}

// Inicializar a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new GymMasterApp();
});