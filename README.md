# Frontend - Cost Center Data Collection

Interface web para o sistema de coleta interativa de dados de centros de custo.

## 🎯 Visão Geral

Este frontend oferece uma interface moderna e intuitiva para interagir com a API Cost Center, permitindo aos usuários configurar sessões, coletar dados através de chat com IA e exportar os resultados.

## 🚀 Características

### 📊 Interface Principal
- **Design Responsivo**: Funciona em desktop, tablet e mobile
- **Interface Chat**: Conversa natural com assistente IA
- **Seleção de Centros**: Interface visual para escolher centros de custo
- **Progresso Visual**: Barras de progresso e indicadores de status

### 💬 Sistema de Chat
- **Chat em Tempo Real**: Comunicação fluida com o backend
- **Comandos Administrativos**: Botões para voltar, pular, resumo, finalizar
- **Histórico de Mensagens**: Mantém histórico por sessão
- **Indicador de Digitação**: Mostra quando a IA está processando
- **Respostas Rápidas**: Botões de confirmação/correção

### 📥 Funcionalidades de Export
- **JSON Consolidado**: Todos os centros em um arquivo
- **JSONs Individuais**: Arquivo separado por centro
- **Export ZIP**: Múltiplos arquivos empacotados
- **Resumo da Sessão**: Estatísticas e histórico completo

## 📁 Estrutura do Projeto

```
frontend/
├── index.html              # Página principal
├── assets/
│   ├── css/
│   │   └── styles.css      # Estilos CSS
│   └── js/
│       └── app.js          # Lógica principal da aplicação
├── components/
│   ├── session.js          # Gerenciamento de sessões
│   ├── chat.js             # Interface de chat
│   └── export.js           # Funcionalidades de export
└── README.md               # Esta documentação
```

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica moderna
- **CSS3**: Estilos com Flexbox/Grid, animações e responsividade
- **JavaScript ES6+**: Programação moderna com classes e async/await
- **Fetch API**: Comunicação com o backend
- **JSZip**: Criação de arquivos ZIP (carregado dinamicamente)

## 🚀 Como Usar

### 1. Configuração Inicial

1. **Certifique-se que o backend está rodando**:
   ```bash
   # No diretório raiz do projeto
   python application.py
   ```

2. **Abra o frontend**:
   ```bash
   # Servir arquivos (use um servidor local)
   npx serve frontend
   # ou
   python -m http.server 8080 --directory frontend
   ```

3. **Acesse no navegador**:
   ```
   http://localhost:8080
   ```

### 2. Iniciando uma Sessão

1. **Selecione Centros de Custo**: Clique nos cards dos centros desejados
2. **ID do Usuário** (opcional): Digite um identificador
3. **Iniciar Sessão**: Clique no botão para começar

### 3. Interagindo com o Chat

1. **Responda as Perguntas**: Digite valores quando solicitado
2. **Use Comandos**:
   - 📋 **Resumo**: Veja progresso atual
   - ↩️ **Voltar**: Retorne a um campo anterior
   - ⏭️ **Pular**: Pule item atual (mantém valor zero)
   - ✅ **Finalizar**: Complete centro atual

3. **Confirmações Rápidas**: Use botões ✓/✗ quando disponíveis

### 4. Exportando Dados

1. **Clique em Exportar** quando a sessão estiver completa
2. **Escolha o Formato**:
   - JSON Consolidado (todos os centros)
   - JSONs Individuais (um arquivo por centro)
3. **Download**: Arquivo(s) será baixado automaticamente

## 🔧 Configuração

### API Backend
O frontend está configurado para conectar em:
```javascript
// Em assets/js/app.js
this.apiBaseUrl = 'http://localhost:8000';
```

Para alterar a URL da API, modifique esta variável.

### Personalização Visual
Estilos podem ser customizados em `assets/css/styles.css`:

```css
/* Cores principais */
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success-color: #48bb78;
  --error-color: #f56565;
}
```

## 📱 Recursos Responsivos

### Desktop (> 768px)
- Layout em duas colunas durante setup
- Chat em tela cheia com sidebar de comandos
- Grid de centros de custo

### Mobile (≤ 768px)
- Layout em coluna única
- Comandos em linha horizontal
- Cards empilhados verticalmente

## 🔌 Integração com API

### Endpoints Utilizados

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/api/health` | GET | Verificar status da API |
| `/api/sessions` | POST | Criar nova sessão |
| `/api/sessions/{id}/message` | POST | Enviar mensagem |
| `/api/sessions/{id}/command` | POST | Executar comando |
| `/api/sessions/{id}/state` | GET | Obter estado da sessão |
| `/api/sessions/{id}/finalize` | POST | Finalizar centro |
| `/api/sessions/{id}/export` | GET | Exportar dados |

### Tratamento de Erros

```javascript
// Exemplo de tratamento de erro
try {
    const response = await fetch(`${this.apiBaseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
} catch (error) {
    console.error('Erro na API:', error);
    this.showError(error.message);
}
```

## 🎨 Componentes Principais

### CostCenterApp (app.js)
Controlador principal da aplicação:
- Gerencia telas e navegação
- Coordena outros componentes
- Controla fluxo da aplicação

### SessionManager (session.js)
Gerencia sessões com a API:
- Criação e sincronização de sessões
- Estados e progresso
- Comunicação com backend

### ChatManager (chat.js)
Interface de chat interativo:
- Envio/recebimento de mensagens
- Indicadores visuais (digitação, etc.)
- Histórico de conversas

### ExportManager (export.js)
Funcionalidades de export:
- Downloads em múltiplos formatos
- Criação de ZIP
- Resumos e estatísticas

## 🚨 Solução de Problemas

### Problemas Comuns

**1. API não conecta**
- Verifique se o backend está rodando em `localhost:8000`
- Verifique CORS no backend
- Console do navegador mostra erros de rede

**2. Sessão não inicia**
- Selecione pelo menos um centro de custo
- Verifique dados no `onboardingCostCenters.json`
- Veja logs do console

**3. Export não funciona**
- Verifique se sessão está completa
- Problemas de CORS podem afetar downloads
- JSZip pode não carregar (verificar rede)

### Debug

Ative logs detalhados:
```javascript
// No console do navegador
localStorage.setItem('debug', 'true');
location.reload();
```

### Status da API

O footer sempre mostra o status da conexão:
- 🟢 **Conectado**: API funcionando
- 🔴 **Desconectado**: Problemas de conexão

## 🔐 Segurança

### Medidas Implementadas
- **Validação de Input**: Sanitização de dados do usuário
- **HTTPS Ready**: Funciona com conexões seguras
- **CSP Friendly**: Compatível com Content Security Policy
- **No Eval**: Não usa código dinâmico perigoso

### Dados Sensíveis
- Não armazena credenciais no cliente
- Session IDs são temporários
- Dados exportados ficam apenas localmente

## 🔄 Atualizações Futuras

### Planejado
- [ ] Suporte a PWA (Progressive Web App)
- [ ] Modo offline com sincronização
- [ ] Temas personalizáveis
- [ ] Notificações push
- [ ] Relatórios visuais (gráficos)
- [ ] Integração com Excel/Google Sheets

### Contribuições
Para contribuir com melhorias:
1. Fork do projeto
2. Crie branch para feature
3. Implemente mudanças
4. Teste thoroughly
5. Submeta pull request

## 📄 Licença

Este projeto está sob a mesma licença do backend (MIT License).

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique esta documentação
2. Consulte logs do console
3. Verifique status da API
4. Abra issue no repositório

---

**Frontend Version**: 1.0.0  
**Compatible Backend**: v1.0.0  
**Last Updated**: 2024