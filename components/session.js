// Session Management Component
class SessionManager {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl || 'https://holdprintwebonboardingai-test.azurewebsites.net/';
        this.currentSession = null;
        this.sessionState = {
            isActive: false,
            isComplete: false,
            currentCostCenter: null,
            currentField: null,
            progress: {
                totalFields: 0,
                completedFields: 0,
                percentage: 0
            }
        };
        
        this.initialize();
    }

    initialize(session = null) {
        if (session) {
            this.currentSession = session;
            this.updateSessionState(session);
        }
        
        this.setupPeriodicSync();
        console.log('📋 Session Manager inicializado');
    }

    // Create new session
    async createSession(costCenters, selectedCenters, userId = null) {
        try {
            const payload = {
                costCenters: costCenters,
                selectedCenters: selectedCenters,
                userId: userId
            };

            const response = await fetch(`${this.apiBaseUrl}/api/sessions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.currentSession = data.session;
                this.updateSessionState(data.session);
                this.triggerSessionEvent('sessionCreated', data.session);
                return data.session;
            } else {
                throw new Error(data.error || 'Falha ao criar sessão');
            }

        } catch (error) {
            console.error('❌ Erro ao criar sessão:', error);
            this.triggerSessionEvent('sessionError', { type: 'creation', error });
            throw error;
        }
    }

    // Get current session state
    async getSessionState(sessionId = null) {
        const id = sessionId || this.currentSession?.sessionId;
        if (!id) {
            throw new Error('Session ID não fornecido');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/sessions/${id}/state`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success && data.data) {
                this.updateSessionState(data.data);
                return data.data;
            } else {
                throw new Error(data.error || 'Falha ao obter estado da sessão');
            }

        } catch (error) {
            console.error('❌ Erro ao obter estado da sessão:', error);
            this.triggerSessionEvent('sessionError', { type: 'stateRetrieval', error });
            throw error;
        }
    }

    // Send message to session
    async sendMessage(message, sessionId = null) {
        const id = sessionId || this.currentSession?.sessionId;
        if (!id) {
            throw new Error('Session ID não fornecido');
        }

        try {
            console.log('📤 SessionManager enviando mensagem:', {
                url: `${this.apiBaseUrl}/api/sessions/${id}/message`,
                message: message,
                sessionId: id
            });

            const response = await fetch(`${this.apiBaseUrl}/api/sessions/${id}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userMessage: message
                })
            });

            console.log('📡 SessionManager resposta status:', {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ SessionManager erro HTTP:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📦 SessionManager dados recebidos:', data);
            
            if (data.success && data.data) {
                console.log('✅ SessionManager resposta SUCCESS:', data.data);
                
                // Map response data to session format
                const sessionUpdate = {
                    currentCostCenter: data.data.updatedCenter || data.data.nextCenter,
                    isComplete: data.data.finished || false
                };
                
                console.log('🔄 SessionManager mapeando estado:', {
                    original: data.data,
                    mapped: sessionUpdate
                });
                
                this.updateSessionState(sessionUpdate);
                this.triggerSessionEvent('messageResponse', {
                    userMessage: message,
                    botResponse: data.data.botMessage,
                    session: sessionUpdate
                });
                return data;
            } else {
                console.error('❌ SessionManager resposta FAILED:', data);
                throw new Error(data.error || 'Falha ao enviar mensagem');
            }

        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
            this.triggerSessionEvent('sessionError', { type: 'messageSending', error });
            throw error;
        }
    }

    // Send command to session
    async sendCommand(command, sessionId = null) {
        const id = sessionId || this.currentSession?.sessionId;
        if (!id) {
            throw new Error('Session ID não fornecido');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/sessions/${id}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    command: command
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success && data.data) {
                this.triggerSessionEvent('commandResponse', {
                    command: command,
                    botResponse: data.data.result,
                    session: this.currentSession
                });
                return data;
            } else {
                throw new Error(data.error || 'Falha ao executar comando');
            }

        } catch (error) {
            console.error('❌ Erro ao executar comando:', error);
            this.triggerSessionEvent('sessionError', { type: 'commandExecution', error });
            throw error;
        }
    }

    // Finalize current cost center
    async finalizeCostCenter(confirm = true, sessionId = null) {
        const id = sessionId || this.currentSession?.sessionId;
        if (!id) {
            throw new Error('Session ID não fornecido');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/sessions/${id}/finalize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    confirm: confirm
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.updateSessionState(data.session);
                this.triggerSessionEvent('costCenterFinalized', data.session);
                return data;
            } else {
                throw new Error(data.error || 'Falha ao finalizar centro de custo');
            }

        } catch (error) {
            console.error('❌ Erro ao finalizar centro de custo:', error);
            this.triggerSessionEvent('sessionError', { type: 'finalization', error });
            throw error;
        }
    }

    // Update internal session state
    updateSessionState(sessionData) {
        if (!sessionData) return;

        this.currentSession = { ...this.currentSession, ...sessionData };
        
        this.sessionState = {
            isActive: sessionData.isActive !== undefined ? sessionData.isActive : true,
            isComplete: sessionData.isComplete || false,
            currentCostCenter: sessionData.currentCostCenter || null,
            currentField: sessionData.currentField || null,
            progress: this.calculateProgress(sessionData)
        };

        this.triggerSessionEvent('stateUpdated', this.sessionState);
    }

    // Calculate session progress
    calculateProgress(sessionData) {
        if (!sessionData || !sessionData.costCenters) {
            return { totalFields: 0, completedFields: 0, percentage: 0 };
        }

        let totalFields = 0;
        let completedFields = 0;

        sessionData.costCenters.forEach(center => {
            // Count routine expenses
            if (center.costCenterRoutineExpenses) {
                totalFields += center.costCenterRoutineExpenses.length;
                completedFields += center.costCenterRoutineExpenses.filter(expense => 
                    expense.amount && expense.amount > 0
                ).length;
            }

            // Count employee expenses
            if (center.costCenterEmployeeExpenses) {
                totalFields += center.costCenterEmployeeExpenses.length;
                completedFields += center.costCenterEmployeeExpenses.filter(employee => 
                    employee.salaryBenefits && employee.salaryBenefits > 0
                ).length;
            }

            // Count equipment expenses
            if (center.costCenterEquipmentExpenses) {
                totalFields += center.costCenterEquipmentExpenses.length;
                completedFields += center.costCenterEquipmentExpenses.filter(equipment => 
                    equipment.currentValue && equipment.currentValue > 0
                ).length;
            }
        });

        const percentage = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

        return {
            totalFields,
            completedFields,
            percentage: Math.round(percentage)
        };
    }

    // Setup periodic session synchronization
    setupPeriodicSync() {
        this.syncInterval = setInterval(async () => {
            if (this.currentSession && this.sessionState.isActive && !this.sessionState.isComplete) {
                try {
                    await this.getSessionState();
                } catch (error) {
                    console.warn('⚠️ Erro na sincronização periódica:', error);
                }
            }
        }, 30000); // Sync every 30 seconds
    }

    // Clean up session
    cleanup() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.currentSession = null;
        this.sessionState = {
            isActive: false,
            isComplete: false,
            currentCostCenter: null,
            currentField: null,
            progress: { totalFields: 0, completedFields: 0, percentage: 0 }
        };
        
        this.triggerSessionEvent('sessionCleaned');
    }

    // Get session summary
    getSessionSummary() {
        if (!this.currentSession) {
            return null;
        }

        const summary = {
            sessionId: this.currentSession.sessionId,
            userId: this.currentSession.userId,
            createdAt: this.currentSession.createdAt,
            costCentersCount: this.currentSession.costCenters?.length || 0,
            progress: this.sessionState.progress,
            currentCostCenter: this.sessionState.currentCostCenter?.name || 'Nenhum',
            isComplete: this.sessionState.isComplete,
            isActive: this.sessionState.isActive
        };

        return summary;
    }

    // Validate session data
    validateSession(sessionData) {
        const required = ['sessionId', 'costCenters'];
        const missing = required.filter(field => !sessionData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Dados da sessão inválidos. Campos obrigatórios ausentes: ${missing.join(', ')}`);
        }

        return true;
    }

    // Event system for session management
    addEventListener(eventType, callback) {
        if (!this.eventListeners) {
            this.eventListeners = {};
        }
        
        if (!this.eventListeners[eventType]) {
            this.eventListeners[eventType] = [];
        }
        
        this.eventListeners[eventType].push(callback);
    }

    removeEventListener(eventType, callback) {
        if (!this.eventListeners || !this.eventListeners[eventType]) {
            return;
        }
        
        this.eventListeners[eventType] = this.eventListeners[eventType].filter(
            listener => listener !== callback
        );
    }

    triggerSessionEvent(eventType, data = null) {
        if (!this.eventListeners || !this.eventListeners[eventType]) {
            return;
        }
        
        this.eventListeners[eventType].forEach(callback => {
            try {
                callback(data, this.sessionState);
            } catch (error) {
                console.error(`❌ Erro no evento ${eventType}:`, error);
            }
        });
    }

    // Get formatted session data for export
    getFormattedSessionData() {
        if (!this.currentSession) {
            return null;
        }

        return {
            session: this.currentSession,
            summary: this.getSessionSummary(),
            state: this.sessionState,
            exportedAt: new Date().toISOString()
        };
    }
}

// Make SessionManager available globally
window.SessionManager = SessionManager;

// Initialize global session manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.sessionManager) {
        window.sessionManager = new SessionManager();
    }
});