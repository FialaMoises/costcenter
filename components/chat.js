// Chat Interface Component
class ChatManager {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.currentSession = null;
        this.messageHistory = new Map(); // Store message history per session
        
        this.initializeChat();
    }

    initializeChat() {
        this.setupMessageHandlers();
        this.setupTypingIndicator();
        this.setupAutoScroll();
        console.log('💬 Chat Manager inicializado');
    }

    initialize(session) {
        this.currentSession = session;
        this.loadSessionMessages();
        this.showWelcomeMessage();
    }

    setupMessageHandlers() {
        // Handle message input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });

            // Show typing indicator when user is typing
            messageInput.addEventListener('input', () => {
                this.handleUserTyping();
            });
        }

        // Handle send button
        const sendButton = document.getElementById('send-btn');
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.handleSendMessage();
            });
        }

        // Handle command buttons
        document.querySelectorAll('.cmd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleCommand(btn.dataset.command);
            });
        });
    }

    setupTypingIndicator() {
        this.typingTimeout = null;
        this.isUserTyping = false;
    }

    setupAutoScroll() {
        // Auto-scroll to bottom when new messages arrive
        this.messagesObserver = new MutationObserver(() => {
            this.scrollToBottom();
        });

        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            this.messagesObserver.observe(messagesContainer, {
                childList: true,
                subtree: true
            });
        }
    }

    async handleSendMessage() {
        console.log('💬 ChatManager.handleSendMessage chamado');
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();

        console.log('📝 Mensagem capturada:', message);
        console.log('🔍 Sessão atual COMPLETA:', {
            sessionId: this.currentSession?.sessionId,
            currentCostCenter: this.currentSession?.currentCostCenter,
            isComplete: this.currentSession?.isComplete,
            costCenters: this.currentSession?.costCenters?.length || 0,
            fullSession: this.currentSession
        });

        if (!message || !this.currentSession) {
            console.warn('⚠️ Mensagem vazia ou sessão não encontrada');
            return;
        }

        // Disable input while processing
        this.setInputEnabled(false);

        // Add user message to chat
        this.addMessage({
            type: 'user',
            content: message,
            timestamp: new Date()
        });

        // Clear input
        messageInput.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Verify session synchronization
            console.log('🔍 VERIFICANDO SINCRONIZAÇÃO:');
            console.log('  ChatManager session:', this.currentSession?.sessionId);
            console.log('  SessionManager session:', window.sessionManager?.currentSession?.sessionId);
            console.log('  App session:', window.app?.currentSession?.sessionId);
            
            if (this.currentSession?.sessionId !== window.sessionManager?.currentSession?.sessionId) {
                console.warn('⚠️ SESSÕES DESSINCRONIZADAS! Tentando sincronizar...');
                if (window.sessionManager) {
                    window.sessionManager.currentSession = this.currentSession;
                }
            }

            // Send message via session manager
            if (window.sessionManager) {
                const response = await window.sessionManager.sendMessage(message);
                
                // Remove typing indicator
                this.hideTypingIndicator();
                
                // Log response details before processing
                console.log('📦 RESPOSTA DETALHADA:', {
                    success: response.success,
                    data: response.data,
                    botMessage: response.data?.botMessage,
                    updatedCenter: response.data?.updatedCenter,
                    nextCenter: response.data?.nextCenter,
                    finished: response.data?.finished
                });

                // Validate response consistency
                this.validateResponseConsistency(message, response.data);

                // Add bot response
                this.addMessage({
                    type: 'bot',
                    content: response.data.botMessage,
                    timestamp: new Date()
                });

                // Update main app session state
                if (window.app) {
                    console.log('🔄 ATUALIZANDO estado da sessão...');
                    const oldState = JSON.parse(JSON.stringify(window.app.currentSession));
                    
                    if (response.data.updatedCenter) {
                        console.log('📋 Atualizando centro atual:', response.data.updatedCenter);
                        window.app.currentSession.currentCostCenter = response.data.updatedCenter;
                    }
                    if (response.data.nextCenter) {
                        console.log('➡️ Movendo para próximo centro:', response.data.nextCenter);
                        window.app.currentSession.currentCostCenter = response.data.nextCenter;
                    }
                    if (response.data.finished) {
                        console.log('✅ Sessão marcada como finalizada');
                        window.app.currentSession.isComplete = response.data.finished;
                    }
                    
                    console.log('🔀 COMPARAÇÃO DE ESTADOS:');
                    console.log('  Antes:', oldState.currentCostCenter);
                    console.log('  Depois:', window.app.currentSession.currentCostCenter);
                    
                    // Update progress
                    window.app.updateProgress();
                    
                    // Check if session is complete
                    if (response.data.finished && !response.data.nextCenter) {
                        window.app.handleSessionComplete();
                    }
                }

                // Handle special responses
                this.handleSpecialResponse(response);

            } else {
                throw new Error('Session Manager não disponível');
            }

        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage({
                type: 'system',
                content: `Erro ao enviar mensagem: ${error.message}`,
                timestamp: new Date()
            });
            console.error('❌ Erro no chat:', error);
        } finally {
            this.setInputEnabled(true);
        }
    }

    async handleCommand(command) {
        if (!this.currentSession) {
            return;
        }

        // Special debug commands
        if (command.toLowerCase() === 'debug estado') {
            this.showDebugInfo();
            return;
        }
        
        if (command.toLowerCase() === 'reset sessão') {
            this.handleSessionReset();
            return;
        }

        // Add command message to chat
        this.addMessage({
            type: 'command',
            content: `Comando: ${command}`,
            timestamp: new Date()
        });

        // Show typing indicator
        this.showTypingIndicator();

        try {
            if (window.sessionManager) {
                const response = await window.sessionManager.sendCommand(command);
                
                this.hideTypingIndicator();
                
                this.addMessage({
                    type: 'bot',
                    content: response.data.result,
                    timestamp: new Date()
                });

                if (response.data.botMessage) {
                    this.addMessage({
                        type: 'bot',
                        content: response.data.botMessage,
                        timestamp: new Date()
                    });
                }

                // Update progress after command
                if (window.app) {
                    window.app.updateProgress();
                }

                this.handleSpecialResponse(response);

            } else {
                throw new Error('Session Manager não disponível');
            }

        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage({
                type: 'system',
                content: `Erro ao executar comando: ${error.message}`,
                timestamp: new Date()
            });
            console.error('❌ Erro no comando:', error);
        }
    }

    addMessage(messageData) {
        // Safety check for message data
        if (!messageData || typeof messageData !== 'object') {
            console.error('❌ Invalid message data:', messageData);
            return;
        }

        const { type, content, timestamp } = messageData;
        
        // Validate required fields
        if (!type || content === undefined || content === null) {
            console.error('❌ Missing required message fields:', messageData);
            return;
        }

        // Check for duplicate bot messages (avoid spam)
        if (type === 'bot' && this.messages.length > 0) {
            const lastMessage = this.messages[this.messages.length - 1];
            if (lastMessage.type === 'bot' && lastMessage.content === content) {
                console.warn('⚠️ Duplicate bot message detected, skipping:', content);
                return;
            }
        }
        
        // Store message in history
        this.messages.push(messageData);
        if (this.currentSession) {
            const sessionId = this.currentSession.sessionId;
            if (!this.messageHistory.has(sessionId)) {
                this.messageHistory.set(sessionId, []);
            }
            this.messageHistory.get(sessionId).push(messageData);
        }

        // Create message element
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageElement = this.createMessageElement(messageData);
        messagesContainer.appendChild(messageElement);

        // Animate message appearance
        this.animateMessage(messageElement);

        // Auto-scroll to bottom
        this.scrollToBottom();

        // Trigger message event
        this.triggerChatEvent('messageAdded', messageData);
    }

    createMessageElement(messageData) {
        const { type, content, timestamp } = messageData;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.setAttribute('data-timestamp', timestamp.toISOString());

        // Create message content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (type === 'bot') {
            contentDiv.innerHTML = this.formatBotMessage(content);
        } else {
            contentDiv.textContent = content;
        }

        messageDiv.appendChild(contentDiv);

        // Add timestamp for certain message types
        if (type === 'user' || type === 'bot') {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            timeDiv.textContent = this.formatTime(timestamp);
            messageDiv.appendChild(timeDiv);
        }

        // Add message actions for bot messages
        if (type === 'bot') {
            const actionsDiv = this.createMessageActions(messageData);
            if (actionsDiv) {
                messageDiv.appendChild(actionsDiv);
            }
        }

        return messageDiv;
    }

    formatBotMessage(content) {
        // Safety check for undefined/null content
        if (!content || typeof content !== 'string') {
            console.warn('⚠️ Invalid bot message content:', content);
            return content || '';
        }

        // Format bot message with basic markdown support
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/`(.*?)`/g, '<code>$1</code>') // Code
            .replace(/\n/g, '<br>'); // Line breaks

        // Format currency values
        formatted = formatted.replace(/R\$\s*([\d,.]+)/g, '<span class="currency">R$ $1</span>');

        // Format percentages
        formatted = formatted.replace(/(\d+)%/g, '<span class="percentage">$1%</span>');

        return formatted;
    }

    createMessageActions(messageData) {
        const content = messageData.content;
        
        // Different action types based on message content
        if (content.includes('Registrado') && content.includes('R$')) {
            // Value confirmation message
            return this.createConfirmationActions();
        } else if (content.includes('qual') && (content.includes('gasto') || content.includes('valor'))) {
            // Question asking for input - no actions needed
            return null;
        } else if (content.includes('próximo') || content.includes('Agora vamos')) {
            // Bot saying it's moving to next item - add a continue button
            return this.createContinueActions();
        }
        
        return null;
    }

    createConfirmationActions() {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'quick-reply-btn';
        confirmBtn.textContent = '✓ Confirmar e Continuar';
        confirmBtn.onclick = () => this.sendQuickReply('confirmar');

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'quick-reply-btn';
        cancelBtn.textContent = '✗ Corrigir Valor';
        cancelBtn.onclick = () => this.sendQuickReply('corrigir');

        actionsDiv.appendChild(confirmBtn);
        actionsDiv.appendChild(cancelBtn);

        return actionsDiv;
    }

    createContinueActions() {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';

        const continueBtn = document.createElement('button');
        continueBtn.className = 'quick-reply-btn';
        continueBtn.textContent = '➡️ Próximo Item';
        continueBtn.onclick = () => this.sendQuickReply('próximo');

        actionsDiv.appendChild(continueBtn);

        return actionsDiv;
    }

    async sendQuickReply(reply) {
        console.log('🔘 Quick reply selecionado:', reply);
        
        const messageInput = document.getElementById('message-input');
        
        // Map reply to more descriptive messages
        let message = reply;
        if (reply === 'confirmar') {
            message = 'sim, confirmo e vamos para o próximo item';
        } else if (reply === 'corrigir') {
            message = 'não, quero corrigir este valor';
        } else if (reply === 'próximo') {
            message = 'próximo item por favor';
        }
        
        messageInput.value = message;
        await this.handleSendMessage();
    }

    formatTime(timestamp) {
        return timestamp.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    animateMessage(messageElement) {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(20px)';
        
        // Trigger animation
        requestAnimationFrame(() => {
            messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        });
    }

    showTypingIndicator() {
        if (this.isTyping) return;

        this.isTyping = true;
        const messagesContainer = document.getElementById('chat-messages');
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (!this.isTyping) return;

        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    handleUserTyping() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        this.isUserTyping = true;
        
        this.typingTimeout = setTimeout(() => {
            this.isUserTyping = false;
        }, 1000);
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    setInputEnabled(enabled) {
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-btn');

        if (messageInput) {
            messageInput.disabled = !enabled;
        }
        if (sendButton) {
            sendButton.disabled = !enabled;
        }

        if (enabled && messageInput) {
            messageInput.focus();
        }
    }

    handleSpecialResponse(response) {
        // Handle session completion
        if (response.data && response.data.finished && !response.data.nextCenter) {
            this.addMessage({
                type: 'success',
                content: '🎉 Sessão finalizada com sucesso! Você pode exportar os dados agora.',
                timestamp: new Date()
            });

            // Enable export functionality
            this.enableExportFeatures();
        }

        // Handle cost center completion
        if (response.data && response.data.nextCenter) {
            this.addMessage({
                type: 'success',
                content: '✅ Centro de custo finalizado!',
                timestamp: new Date()
            });
        }

        // Handle errors
        if (response.error) {
            this.addMessage({
                type: 'system',
                content: `⚠️ ${response.error}`,
                timestamp: new Date()
            });
        }
    }

    enableExportFeatures() {
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.style.display = 'block';
        }
    }

    showWelcomeMessage() {
        if (!this.currentSession) return;

        const welcomeMessage = this.currentSession.currentQuestion || 
            `Olá! Vamos começar a coleta de dados para os centros de custo selecionados. ${this.currentSession.costCenters?.length || 0} centro(s) de custo foram carregados.`;

        this.addMessage({
            type: 'bot',
            content: welcomeMessage,
            timestamp: new Date()
        });
    }

    loadSessionMessages() {
        if (!this.currentSession) return;

        const sessionId = this.currentSession.sessionId;
        const storedMessages = this.messageHistory.get(sessionId);

        if (storedMessages && storedMessages.length > 0) {
            // Clear current messages
            this.clearMessages();
            
            // Reload stored messages
            storedMessages.forEach(messageData => {
                const messageElement = this.createMessageElement(messageData);
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    messagesContainer.appendChild(messageElement);
                }
            });
        }
    }

    clearMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        this.messages = [];
    }

    exportChatHistory(format = 'json') {
        if (!this.currentSession) {
            throw new Error('Nenhuma sessão ativa');
        }

        const sessionId = this.currentSession.sessionId;
        const messages = this.messageHistory.get(sessionId) || [];

        const exportData = {
            sessionId: sessionId,
            exportedAt: new Date().toISOString(),
            messageCount: messages.length,
            messages: messages.map(msg => ({
                type: msg.type,
                content: msg.content,
                timestamp: msg.timestamp.toISOString()
            }))
        };

        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        } else if (format === 'txt') {
            return this.formatMessagesAsText(messages);
        }

        return exportData;
    }

    formatMessagesAsText(messages) {
        return messages.map(msg => {
            const time = this.formatTime(new Date(msg.timestamp));
            const type = msg.type.toUpperCase();
            return `[${time}] ${type}: ${msg.content}`;
        }).join('\n');
    }

    // Event system for chat
    addEventListener(eventType, callback) {
        if (!this.eventListeners) {
            this.eventListeners = {};
        }
        
        if (!this.eventListeners[eventType]) {
            this.eventListeners[eventType] = [];
        }
        
        this.eventListeners[eventType].push(callback);
    }

    triggerChatEvent(eventType, data = null) {
        if (!this.eventListeners || !this.eventListeners[eventType]) {
            return;
        }
        
        this.eventListeners[eventType].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Erro no evento de chat ${eventType}:`, error);
            }
        });
    }

    showDebugInfo() {
        const debugInfo = {
            sessionId: this.currentSession?.sessionId,
            currentCenter: this.currentSession?.currentCostCenter,
            isComplete: this.currentSession?.isComplete,
            messagesCount: this.messages.length,
            sessionManagerSync: window.sessionManager?.currentSession?.sessionId === this.currentSession?.sessionId,
            appSync: window.app?.currentSession?.sessionId === this.currentSession?.sessionId
        };

        const debugText = `🔍 **Estado de Debug:**
        
**Sessão:** ${debugInfo.sessionId || 'Não definida'}
**Centro Atual:** ${debugInfo.currentCenter?.name || 'Não definido'} (ID: ${debugInfo.currentCenter?.id || 'N/A'})
**Completa:** ${debugInfo.isComplete ? 'Sim' : 'Não'}
**Mensagens:** ${debugInfo.messagesCount}
**SessionManager Sincronizado:** ${debugInfo.sessionManagerSync ? 'Sim' : 'Não'}
**App Sincronizado:** ${debugInfo.appSync ? 'Sim' : 'Não'}

Digite "reset sessão" se houver problemas de sincronização.`;

        this.addMessage({
            type: 'system',
            content: debugText,
            timestamp: new Date()
        });
    }

    handleSessionReset() {
        this.addMessage({
            type: 'system',
            content: '⚠️ Resetando sessão... Recarregue a página para começar uma nova sessão.',
            timestamp: new Date()
        });
        
        // Clear current session data
        this.currentSession = null;
        if (window.sessionManager) {
            window.sessionManager.currentSession = null;
        }
        if (window.app) {
            window.app.currentSession = null;
        }
        
        // Redirect to setup after 2 seconds
        setTimeout(() => {
            if (window.app) {
                window.app.resetToSetup();
            } else {
                location.reload();
            }
        }, 2000);
    }

    validateResponseConsistency(userMessage, responseData) {
        console.log('🔍 VALIDANDO CONSISTÊNCIA da resposta...');
        
        // Check if user sent a number but bot is asking for a number again
        if (/^\d+(\.\d+)?$/.test(userMessage) && responseData.botMessage?.includes('informe um valor numérico')) {
            console.error('❌ INCONSISTÊNCIA: Usuário enviou número mas bot pede número novamente');
            console.error('  User input:', userMessage);
            console.error('  Bot response:', responseData.botMessage);
        }
        
        // Check if user confirmed but got same question again
        if ((userMessage.includes('confirmo') || userMessage.includes('próximo')) && 
            responseData.botMessage?.includes('valor numérico')) {
            console.error('❌ INCONSISTÊNCIA: Usuário confirmou mas bot pede valor novamente');
            console.error('  User input:', userMessage);
            console.error('  Bot response:', responseData.botMessage);
            
            // Add a recovery suggestion message
            this.addMessage({
                type: 'system',
                content: '⚠️ Detectada inconsistência no fluxo. Tente usar o comando "mostrar resumo" ou recarregue a página se o problema persistir.',
                timestamp: new Date()
            });
        }
        
        // Check if field/center information seems inconsistent
        if (this.currentSession?.currentCostCenter) {
            const expectedCenter = this.currentSession.currentCostCenter.name;
            if (responseData.botMessage?.includes('Registrado') && 
                !responseData.botMessage.includes(expectedCenter)) {
                console.warn('⚠️ POSSÍVEL INCONSISTÊNCIA: Campo registrado pode não corresponder ao centro atual');
                console.warn('  Expected center:', expectedCenter);
                console.warn('  Bot message:', responseData.botMessage);
            }
        }
    }

    // Cleanup
    cleanup() {
        if (this.messagesObserver) {
            this.messagesObserver.disconnect();
        }
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        this.clearMessages();
        this.currentSession = null;
    }
}

// Add CSS for typing indicator and other chat features
const chatStyles = `
    .typing-indicator .typing-dots {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .typing-indicator .typing-dots span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #a0aec0;
        animation: typing 1.4s infinite ease-in-out;
    }

    .typing-indicator .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes typing {
        0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
    }

    .message-actions {
        margin-top: 0.5rem;
        display: flex;
        gap: 0.5rem;
    }

    .quick-reply-btn {
        background: #edf2f7;
        border: 1px solid #e2e8f0;
        border-radius: 15px;
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .quick-reply-btn:hover {
        background: #667eea;
        color: white;
        border-color: #667eea;
    }

    .message-time {
        font-size: 0.7rem;
        opacity: 0.6;
        margin-top: 0.25rem;
    }

    .currency {
        color: #38a169;
        font-weight: 600;
    }

    .percentage {
        color: #3182ce;
        font-weight: 600;
    }

    .message.command {
        background: #e6fffa;
        border: 1px solid #81e6d9;
        color: #234e52;
        align-self: center;
        font-style: italic;
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = chatStyles;
document.head.appendChild(styleSheet);

// Make ChatManager available globally
window.ChatManager = ChatManager;

// Initialize global chat manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.chatManager) {
        window.chatManager = new ChatManager();
    }
});