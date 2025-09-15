// Main Application Controller
class CostCenterApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000';
        this.currentSession = null;
        this.currentScreen = 'setup';
        this.costCenters = [];
        this.selectedCenters = new Set();
        
        this.initializeApp();
    }

    async initializeApp() {
        console.log('🚀 Inicializando Cost Center App...');
        
        // Load default cost centers
        await this.loadDefaultCostCenters();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check API health
        await this.checkApiHealth();
        
        // Initialize screens
        this.showScreen('setup');
        
        console.log('✅ App inicializado com sucesso');
    }

    async loadDefaultCostCenters() {
        try {
            // Try to load from onboardingCostCenters.json
            const response = await fetch('../onboardingCostCenters.json');
            if (response.ok) {
                this.costCenters = await response.json();
            } else {
                // Fallback to default cost centers
                this.costCenters = this.getDefaultCostCenters();
            }
            this.renderCostCenters();
        } catch (error) {
            console.warn('⚠️ Não foi possível carregar centros de custo, usando padrão:', error);
            this.costCenters = this.getDefaultCostCenters();
            this.renderCostCenters();
        }
    }

    getDefaultCostCenters() {
        return [
            {
                id: 1,
                name: "Administrativo",
                totalAmount: 0,
                costCenterRoutineExpenses: [
                    { id: 1, name: "Água", amount: 0 },
                    { id: 2, name: "Energia Elétrica", amount: 0 },
                    { id: 3, name: "Telefone", amount: 0 },
                    { id: 4, name: "Internet", amount: 0 },
                    { id: 5, name: "Aluguel", amount: 0 }
                ],
                costCenterEmployeeExpenses: [],
                costCenterEquipmentExpenses: []
            },
            {
                id: 2,
                name: "Comercial",
                totalAmount: 0,
                costCenterRoutineExpenses: [
                    { id: 1, name: "Marketing", amount: 0 },
                    { id: 2, name: "Vendas", amount: 0 },
                    { id: 3, name: "Comissões", amount: 0 }
                ],
                costCenterEmployeeExpenses: [],
                costCenterEquipmentExpenses: []
            },
            {
                id: 3,
                name: "Produção",
                totalAmount: 0,
                costCenterRoutineExpenses: [
                    { id: 1, name: "Matéria Prima", amount: 0 },
                    { id: 2, name: "Mão de Obra", amount: 0 },
                    { id: 3, name: "Manutenção", amount: 0 }
                ],
                costCenterEmployeeExpenses: [],
                costCenterEquipmentExpenses: []
            }
        ];
    }

    renderCostCenters() {
        const container = document.getElementById('cost-centers-list');
        container.innerHTML = '';

        this.costCenters.forEach(center => {
            const card = document.createElement('div');
            card.className = 'cost-center-card';
            card.dataset.centerId = center.id;
            
            card.innerHTML = `
                <h3>${center.name}</h3>
                <p>${center.costCenterRoutineExpenses.length} despesas rotineiras</p>
                <p>${center.costCenterEmployeeExpenses.length} funcionários</p>
                <p>${center.costCenterEquipmentExpenses.length} equipamentos</p>
            `;

            card.addEventListener('click', () => this.toggleCostCenter(center.id, card));
            container.appendChild(card);
        });
    }

    toggleCostCenter(centerId, cardElement) {
        if (this.selectedCenters.has(centerId)) {
            this.selectedCenters.delete(centerId);
            cardElement.classList.remove('selected');
        } else {
            this.selectedCenters.add(centerId);
            cardElement.classList.add('selected');
        }

        // Enable/disable start button
        const startBtn = document.getElementById('start-session-btn');
        startBtn.disabled = this.selectedCenters.size === 0;
    }

    setupEventListeners() {
        // Start session button
        document.getElementById('start-session-btn').addEventListener('click', () => {
            this.startSession();
        });

        // Chat input/send/command events are handled by ChatManager
        // No duplicate event listeners needed here

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            if (window.exportManager) {
                window.exportManager.showExportModal();
            }
        });

        // Error screen buttons
        document.getElementById('retry-btn').addEventListener('click', () => {
            location.reload();
        });

        document.getElementById('new-session-btn').addEventListener('click', () => {
            this.resetToSetup();
        });

        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    async checkApiHealth() {
        try {
            console.log('🔍 Verificando saúde da API:', `${this.apiBaseUrl}/api/health/`);
            const response = await fetch(`${this.apiBaseUrl}/api/health/`);
            const status = document.getElementById('api-status');
            
            console.log('📡 Resposta health check:', {
                status: response.status,
                ok: response.ok,
                url: response.url
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ API health data:', data);
                status.textContent = '🟢 Conectado';
                status.style.color = '#48bb78';
                return true;
            } else {
                throw new Error(`API respondeu com status ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Erro ao verificar API:', {
                message: error.message,
                apiUrl: this.apiBaseUrl,
                stack: error.stack
            });
            const status = document.getElementById('api-status');
            status.textContent = '🔴 Desconectado';
            status.style.color = '#f56565';
            return false;
        }
    }

    async startSession() {
        if (this.selectedCenters.size === 0) {
            alert('Selecione pelo menos um centro de custo!');
            return;
        }

        this.showScreen('loading');

        try {
            const userId = document.getElementById('user-id').value || undefined;
            const selectedCostCenters = this.costCenters.filter(c => 
                this.selectedCenters.has(c.id)
            );

            const payload = {
                costCenters: selectedCostCenters,
                selectedCenters: Array.from(this.selectedCenters),
                userId: userId
            };

            console.log('📤 Enviando payload de criação de sessão:', payload);
            console.log('🎯 URL da requisição:', `${this.apiBaseUrl}/api/sessions/`);

            const response = await fetch(`${this.apiBaseUrl}/api/sessions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('📡 Status da resposta:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro HTTP detalhado:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}\nDetalhes: ${errorText}`);
            }

            const data = await response.json();
            console.log('📡 Resposta da API:', data);
            
            if (data.success && data.data) {
                // Map backend response to frontend session format
                this.currentSession = {
                    sessionId: data.data.sessionId,
                    currentCostCenter: data.data.currentCenter,
                    currentQuestion: data.data.botMessage,
                    isActive: true,
                    isComplete: false,
                    createdAt: new Date().toISOString(),
                    costCenters: selectedCostCenters
                };
                
                this.initializeChat();
                this.showScreen('chat');
                
                // Initialize chat and session managers
                if (window.chatManager) {
                    console.log('🔧 Inicializando ChatManager com sessão:', this.currentSession);
                    window.chatManager.initialize(this.currentSession);
                }
                if (window.sessionManager) {
                    console.log('🔧 Inicializando SessionManager com sessão:', this.currentSession);
                    window.sessionManager.initialize(this.currentSession);
                    // Set the current session in SessionManager
                    window.sessionManager.currentSession = this.currentSession;
                }
                
                console.log('✅ Sessão iniciada:', this.currentSession.sessionId);
            } else {
                throw new Error(data.error || 'Erro ao criar sessão');
            }

        } catch (error) {
            console.error('❌ Erro detalhado ao iniciar sessão:', {
                message: error.message,
                stack: error.stack,
                apiBaseUrl: this.apiBaseUrl,
                selectedCenters: Array.from(this.selectedCenters),
                costCentersCount: this.costCenters.length
            });
            this.showError(`Erro ao iniciar sessão: ${error.message}`);
        }
    }

    initializeChat() {
        if (!this.currentSession) return;

        // Update session info
        document.getElementById('session-id').textContent = 
            `Sessão: ${this.currentSession.sessionId}`;
        
        // Clear previous messages
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
        
        // Enable input
        this.enableInput();
        
        // Add welcome message  
        const welcomeMessage = this.currentSession.currentQuestion || 'Sessão iniciada! Como posso ajudá-lo?';
        
        if (window.chatManager) {
            window.chatManager.addMessage({
                type: 'bot',
                content: welcomeMessage,
                timestamp: new Date()
            });
        } else {
            this.addMessage('bot', welcomeMessage);
        }
        
        // Update progress
        this.updateProgress();
    }

    // Message sending is now handled by ChatManager
    // These methods have been moved to avoid duplication

    addMessage(type, content) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = content;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateProgress() {
        if (!this.currentSession) return;

        // Update current center info with detailed state
        const currentCenterSpan = document.getElementById('current-center');
        if (this.currentSession.currentCostCenter) {
            const centerInfo = `Centro: ${this.currentSession.currentCostCenter.name} (ID: ${this.currentSession.currentCostCenter.id})`;
            currentCenterSpan.textContent = centerInfo;
            
            // Log current state for debugging
            console.log('📊 ESTADO ATUAL DO PROGRESSO:', {
                centro: this.currentSession.currentCostCenter.name,
                centroId: this.currentSession.currentCostCenter.id,
                sessaoId: this.currentSession.sessionId,
                completa: this.currentSession.isComplete
            });
        } else {
            currentCenterSpan.textContent = 'Centro: Não definido';
            console.warn('⚠️ Centro atual não está definido na sessão');
        }

        // Calculate and update progress
        let totalFields = 0;
        let completedFields = 0;

        this.selectedCenters.forEach(centerId => {
            const center = this.costCenters.find(c => c.id === centerId);
            if (center) {
                totalFields += center.costCenterRoutineExpenses.length;
                totalFields += center.costCenterEmployeeExpenses.length;
                totalFields += center.costCenterEquipmentExpenses.length;
            }
        });

        // This is a simplified progress calculation
        // In a real implementation, you'd track actual completion from the session state
        const progressPercent = Math.min(100, (completedFields / totalFields) * 100);
        
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        progressFill.style.width = `${progressPercent}%`;
        progressText.textContent = `${Math.round(progressPercent)}% completo`;
    }

    handleSessionComplete() {
        if (window.chatManager) {
            window.chatManager.addMessage({
                type: 'success',
                content: '🎉 Sessão finalizada com sucesso! Você pode exportar os dados agora.',
                timestamp: new Date()
            });
        } else {
            this.addMessage('success', '🎉 Sessão finalizada com sucesso! Você pode exportar os dados agora.');
        }
        
        // Enable export button
        const exportBtn = document.getElementById('export-btn');
        exportBtn.style.display = 'block';
        exportBtn.disabled = false;
    }

    enableInput() {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }

    disableInput() {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        input.disabled = true;
        sendBtn.disabled = true;
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        this.showScreen('error');
    }

    resetToSetup() {
        this.currentSession = null;
        this.selectedCenters.clear();
        
        // Reset UI
        document.querySelectorAll('.cost-center-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.getElementById('start-session-btn').disabled = true;
        document.getElementById('user-id').value = '';
        
        this.showScreen('setup');
    }

    // Utility method for formatting currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount);
    }

    // Utility method for API requests
    async apiRequest(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`❌ API Request failed for ${endpoint}:`, error);
            throw error;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CostCenterApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
    
    if (window.app) {
        window.app.showError(`Erro inesperado: ${event.error.message}`);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    
    if (window.app) {
        window.app.showError(`Erro de promessa: ${event.reason}`);
    }
});