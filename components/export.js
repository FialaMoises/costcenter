// Export Functionality Component
class ExportManager {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl || 'https://holdprintwebonboardingai-test.azurewebsites.net/';
        this.currentSession = null;
        
        this.initializeExport();
    }

    initializeExport() {
        this.setupEventListeners();
        console.log('📥 Export Manager inicializado');
    }

    setupEventListeners() {
        // Export button in main interface
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showExportModal();
            });
        }

        // Download button in modal
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.handleDownload();
            });
        }

        // Modal close events
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideExportModal();
            });
        });

        // Export type radio buttons
        document.querySelectorAll('input[name="export-type"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateExportPreview();
            });
        });
    }

    showExportModal() {
        const modal = document.getElementById('export-modal');
        if (modal) {
            modal.classList.add('active');
            this.updateExportPreview();
        }
    }

    hideExportModal() {
        const modal = document.getElementById('export-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    updateExportPreview() {
        // Update modal content based on selected export type
        const selectedType = document.querySelector('input[name="export-type"]:checked').value;
        const downloadBtn = document.getElementById('download-btn');
        
        if (downloadBtn) {
            if (selectedType === 'consolidated') {
                downloadBtn.textContent = 'Download JSON Consolidado';
            } else {
                downloadBtn.textContent = 'Download JSONs Individuais';
            }
        }
    }

    async handleDownload() {
        if (!this.currentSession) {
            this.showError('Nenhuma sessão ativa para exportar');
            return;
        }

        const selectedType = document.querySelector('input[name="export-type"]:checked').value;
        const isConsolidated = selectedType === 'consolidated';

        try {
            // Show loading state
            this.setDownloadLoading(true);

            // Get export data from API
            const exportData = await this.getExportData(isConsolidated);
            
            if (isConsolidated) {
                // Download single consolidated file
                this.downloadFile(
                    JSON.stringify(exportData, null, 2),
                    `cost_centers_${this.currentSession.sessionId}_consolidated.json`,
                    'application/json'
                );
            } else {
                // Download individual files as ZIP
                await this.downloadIndividualFiles(exportData);
            }

            // Show success message
            this.showSuccessMessage('Export realizado com sucesso!');
            
            // Hide modal after successful download
            setTimeout(() => {
                this.hideExportModal();
            }, 1000);

        } catch (error) {
            console.error('❌ Erro no export:', error);
            this.showError(`Erro no export: ${error.message}`);
        } finally {
            this.setDownloadLoading(false);
        }
    }

    async getExportData(consolidated = true) {
        if (!this.currentSession) {
            throw new Error('Sessão não encontrada');
        }

        try {
            const response = await fetch(
                `${this.apiBaseUrl}/api/sessions/${this.currentSession.sessionId}/export?consolidated=${consolidated}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                return data.data;
            } else {
                throw new Error(data.error || 'Falha no export');
            }

        } catch (error) {
            console.error('❌ Erro ao obter dados de export:', error);
            throw error;
        }
    }

    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    async downloadIndividualFiles(exportData) {
        // Check if we have JSZip available
        if (typeof JSZip === 'undefined') {
            // Fallback: download files individually
            this.downloadFilesSequentially(exportData);
            return;
        }

        try {
            const zip = new JSZip();
            
            // Add each cost center as a separate file
            if (exportData.costCenters && Array.isArray(exportData.costCenters)) {
                exportData.costCenters.forEach((center, index) => {
                    const filename = `cost_center_${center.id}_${this.sanitizeFilename(center.name)}.json`;
                    zip.file(filename, JSON.stringify(center, null, 2));
                });
            }

            // Add session summary
            const sessionSummary = this.createSessionSummary(exportData);
            zip.file('session_summary.json', JSON.stringify(sessionSummary, null, 2));

            // Generate ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Download ZIP
            this.downloadFile(
                zipBlob,
                `cost_centers_${this.currentSession.sessionId}_individual.zip`,
                'application/zip'
            );

        } catch (error) {
            console.error('❌ Erro ao criar ZIP:', error);
            // Fallback to individual downloads
            this.downloadFilesSequentially(exportData);
        }
    }

    downloadFilesSequentially(exportData) {
        if (!exportData.costCenters || !Array.isArray(exportData.costCenters)) {
            throw new Error('Dados de centros de custo não encontrados');
        }

        // Download each cost center individually
        exportData.costCenters.forEach((center, index) => {
            setTimeout(() => {
                const filename = `cost_center_${center.id}_${this.sanitizeFilename(center.name)}.json`;
                this.downloadFile(
                    JSON.stringify(center, null, 2),
                    filename,
                    'application/json'
                );
            }, index * 500); // Delay downloads to avoid browser blocking
        });

        // Download session summary
        setTimeout(() => {
            const sessionSummary = this.createSessionSummary(exportData);
            this.downloadFile(
                JSON.stringify(sessionSummary, null, 2),
                `session_summary_${this.currentSession.sessionId}.json`,
                'application/json'
            );
        }, exportData.costCenters.length * 500);
    }

    createSessionSummary(exportData) {
        const summary = {
            sessionInfo: {
                sessionId: this.currentSession.sessionId,
                userId: this.currentSession.userId,
                createdAt: this.currentSession.createdAt,
                exportedAt: new Date().toISOString()
            },
            statistics: {
                totalCostCenters: exportData.costCenters?.length || 0,
                totalAmount: 0,
                routineExpensesCount: 0,
                employeeExpensesCount: 0,
                equipmentExpensesCount: 0
            },
            costCenterSummary: []
        };

        // Calculate statistics
        if (exportData.costCenters) {
            exportData.costCenters.forEach(center => {
                summary.statistics.totalAmount += center.totalAmount || 0;
                summary.statistics.routineExpensesCount += center.costCenterRoutineExpenses?.length || 0;
                summary.statistics.employeeExpensesCount += center.costCenterEmployeeExpenses?.length || 0;
                summary.statistics.equipmentExpensesCount += center.costCenterEquipmentExpenses?.length || 0;

                // Add center summary
                summary.costCenterSummary.push({
                    id: center.id,
                    name: center.name,
                    totalAmount: center.totalAmount || 0,
                    routineExpenses: center.costCenterRoutineExpenses?.length || 0,
                    employeeExpenses: center.costCenterEmployeeExpenses?.length || 0,
                    equipmentExpenses: center.costCenterEquipmentExpenses?.length || 0
                });
            });
        }

        // Add chat history if available
        if (window.chatManager && window.chatManager.currentSession) {
            try {
                summary.chatHistory = JSON.parse(window.chatManager.exportChatHistory());
            } catch (error) {
                console.warn('⚠️ Não foi possível incluir histórico do chat:', error);
            }
        }

        return summary;
    }

    sanitizeFilename(filename) {
        // Remove or replace invalid filename characters
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .toLowerCase();
    }

    setDownloadLoading(loading) {
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.disabled = loading;
            downloadBtn.textContent = loading ? 'Exportando...' : 'Download';
        }
    }

    showSuccessMessage(message) {
        // Create or update success message
        let successDiv = document.querySelector('.export-success-message');
        
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.className = 'export-success-message';
            successDiv.style.cssText = `
                background: #c6f6d5;
                border: 1px solid #68d391;
                color: #2f855a;
                padding: 1rem;
                border-radius: 8px;
                margin-top: 1rem;
                text-align: center;
                animation: fadeIn 0.3s ease;
            `;
            
            const modalBody = document.querySelector('#export-modal .modal-body');
            if (modalBody) {
                modalBody.appendChild(successDiv);
            }
        }
        
        successDiv.textContent = message;
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.querySelector('.export-error-message');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'export-error-message';
            errorDiv.style.cssText = `
                background: #fed7d7;
                border: 1px solid #fc8181;
                color: #c53030;
                padding: 1rem;
                border-radius: 8px;
                margin-top: 1rem;
                text-align: center;
                animation: fadeIn 0.3s ease;
            `;
            
            const modalBody = document.querySelector('#export-modal .modal-body');
            if (modalBody) {
                modalBody.appendChild(errorDiv);
            }
        }
        
        errorDiv.textContent = message;
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // Export to different formats
    async exportToCSV() {
        if (!this.currentSession) {
            throw new Error('Nenhuma sessão ativa');
        }

        try {
            const exportData = await this.getExportData(true);
            const csvContent = this.convertToCSV(exportData);
            
            this.downloadFile(
                csvContent,
                `cost_centers_${this.currentSession.sessionId}.csv`,
                'text/csv'
            );
            
            return true;
        } catch (error) {
            console.error('❌ Erro no export CSV:', error);
            throw error;
        }
    }

    convertToCSV(exportData) {
        if (!exportData.costCenters) {
            throw new Error('Dados não encontrados');
        }

        const headers = [
            'Centro de Custo ID',
            'Nome do Centro',
            'Valor Total',
            'Tipo de Despesa',
            'Item',
            'Valor'
        ];

        const rows = [headers.join(',')];

        exportData.costCenters.forEach(center => {
            // Routine expenses
            if (center.costCenterRoutineExpenses) {
                center.costCenterRoutineExpenses.forEach(expense => {
                    rows.push([
                        center.id,
                        `"${center.name}"`,
                        center.totalAmount || 0,
                        'Rotina',
                        `"${expense.name}"`,
                        expense.amount || 0
                    ].join(','));
                });
            }

            // Employee expenses
            if (center.costCenterEmployeeExpenses) {
                center.costCenterEmployeeExpenses.forEach(employee => {
                    rows.push([
                        center.id,
                        `"${center.name}"`,
                        center.totalAmount || 0,
                        'Funcionário',
                        `"${employee.name}"`,
                        employee.totalAmount || 0
                    ].join(','));
                });
            }

            // Equipment expenses
            if (center.costCenterEquipmentExpenses) {
                center.costCenterEquipmentExpenses.forEach(equipment => {
                    rows.push([
                        center.id,
                        `"${center.name}"`,
                        center.totalAmount || 0,
                        'Equipamento',
                        `"${equipment.name}"`,
                        equipment.monthDepreciation || 0
                    ].join(','));
                });
            }
        });

        return rows.join('\n');
    }

    // Set current session reference
    setSession(session) {
        this.currentSession = session;
    }

    // Get export statistics
    getExportStatistics() {
        if (!this.currentSession) {
            return null;
        }

        return {
            sessionId: this.currentSession.sessionId,
            canExport: this.currentSession.isComplete || false,
            costCentersCount: this.currentSession.costCenters?.length || 0,
            availableFormats: ['JSON', 'CSV', 'ZIP']
        };
    }

    // Preview export data
    async previewExportData() {
        if (!this.currentSession) {
            throw new Error('Nenhuma sessão ativa');
        }

        try {
            const exportData = await this.getExportData(true);
            return {
                preview: JSON.stringify(exportData, null, 2).substring(0, 1000) + '...',
                fullSize: JSON.stringify(exportData).length,
                costCentersCount: exportData.costCenters?.length || 0
            };
        } catch (error) {
            console.error('❌ Erro no preview:', error);
            throw error;
        }
    }
}

// Add JSZip support check and fallback
function loadJSZip() {
    return new Promise((resolve) => {
        if (typeof JSZip !== 'undefined') {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

// Make ExportManager available globally
window.ExportManager = ExportManager;

// Initialize global export manager when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Load JSZip for ZIP functionality
    await loadJSZip();
    
    if (!window.exportManager) {
        window.exportManager = new ExportManager();
    }
});