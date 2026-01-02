const API_URL = 'http://localhost:5000';

// Load model info and features on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('predictForm')) {
        // Prevent form submission
        document.getElementById('predictForm').addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        
        await loadModelInfo();
        await loadFeatures();
        await loadClasses();
        setupUploadHandlers();
        setupPredictForm();
    }
});

async function loadModelInfo() {
    try {
        const response = await fetch(`${API_URL}/model-info`);
        const data = await response.json();

        const statsDiv = document.getElementById('modelStats');
        statsDiv.innerHTML = `
            <h3>Model Information</h3>
            <p><strong>Model:</strong> ${data.model_name}</p>
            <p><strong>F1-Score:</strong> ${data.f1_score.toFixed(4)}</p>
            <p><strong>Accuracy:</strong> ${data.accuracy ? data.accuracy.toFixed(4) : 'N/A'}</p>
            <p><strong>Features:</strong> ${data.num_features}</p>
        `;
    } catch (error) {
        console.error('Error loading model info:', error);
        document.getElementById('modelStats').innerHTML = `
            <h3>Model Information</h3>
            <p style="color: red;">Error loading model information. Make sure the backend server is running.</p>
        `;
    }
}

async function loadFeatures() {
    try {
        const response = await fetch(`${API_URL}/features`);
        const data = await response.json();

        const featureInputs = document.getElementById('featureInputs');

        const flagFeatures = [
            'FIN Flag Count', 'SYN Flag Count', 'RST Flag Count',
            'PSH Flag Count', 'ACK Flag Count', 'URG Flag Count',
            'CWE Flag Count', 'ECE Flag Count'
        ];

        featureInputs.innerHTML = data.features.map(feature => {
            let inputAttrs = 'type="number" step="any" value="0" required';

            if (feature === 'hour') {
                inputAttrs = 'type="number" min="0" max="23" step="1" value="0" required';
            } else if (feature === 'minute' || feature === 'second') {
                inputAttrs = 'type="number" min="0" max="59" step="1" value="0" required';
            } else if (flagFeatures.includes(feature)) {
                inputAttrs = 'type="number" min="0" max="1" step="1" value="0" required';
            }

            return `
                <div class="form-group">
                    <label for="${feature}">${feature}</label>
                    <input ${inputAttrs} id="${feature}" name="${feature}">
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading features:', error);
    }
}

async function loadClasses() {
    try {
        const response = await fetch(`${API_URL}/classes`);
        const data = await response.json();
        
        const select = document.getElementById('actualLabel');
        if (select && data.classes) {
            data.classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls;
                option.textContent = cls;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

function setupPredictForm() {
    // Current time button
    const btnCurrentTime = document.getElementById('btnCurrentTime');
    if (btnCurrentTime) {
        btnCurrentTime.addEventListener('click', () => {
            const now = new Date();
            const hourInput = document.getElementById('hour');
            const minuteInput = document.getElementById('minute');
            const secondInput = document.getElementById('second');
            
            if (hourInput) hourInput.value = now.getHours();
            if (minuteInput) minuteInput.value = now.getMinutes();
            if (secondInput) secondInput.value = now.getSeconds();
            
            btnCurrentTime.style.background = '#27ae60';
            btnCurrentTime.textContent = '✓ Time Set!';
            setTimeout(() => {
                btnCurrentTime.style.background = '#9b59b6';
                btnCurrentTime.textContent = '🕐 Set Current Time';
            }, 1000);
        });
    }

    // Sample data buttons
    document.querySelectorAll('.btn-sample[data-type]').forEach(button => {
        button.addEventListener('click', async () => {
            const attackType = button.getAttribute('data-type');
            if (!attackType) return;

            try {
                const response = await fetch(`${API_URL}/sample-data?type=${attackType}`);
                const data = await response.json();

                Object.entries(data.sample).forEach(([feature, value]) => {
                    const input = document.getElementById(feature);
                    if (input) input.value = value;
                });

                button.style.background = '#27ae60';
                button.style.color = 'white';
                setTimeout(() => {
                    button.style.background = '';
                    button.style.color = '';
                }, 1000);

                document.getElementById('featureInputs').scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                console.error('Error loading sample data:', error);
                alert('Error loading sample data.');
            }
        });
    });

    // Predict button
    const btnPredict = document.getElementById('btnPredict');
    if (btnPredict) {
        btnPredict.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const formData = new FormData(document.getElementById('predictForm'));
            const features = {};

            for (let [key, value] of formData.entries()) {
                features[key] = parseFloat(value);
            }

            const actualLabel = document.getElementById('actualLabel')?.value || '';

            try {
                btnPredict.disabled = true;
                btnPredict.textContent = 'Predicting...';

                const response = await fetch(`${API_URL}/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ features, actual_label: actualLabel })
                });

                const data = await response.json();

                btnPredict.disabled = false;
                btnPredict.textContent = 'Predict Attack Type';

                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }

                displayResult(data);
            } catch (error) {
                console.error('Error:', error);
                btnPredict.disabled = false;
                btnPredict.textContent = 'Predict Attack Type';
                alert('Error making prediction.');
            }
        });
    }
}

function setupUploadHandlers() {
    const uploadBtn = document.getElementById('btnUpload');
    const uploadFile = document.getElementById('uploadFile');
    const fileName = document.getElementById('fileName');
    const retrainBtn = document.getElementById('btnRetrain');
    
    if (uploadBtn && uploadFile) {
        uploadBtn.addEventListener('click', () => uploadFile.click());
        
        uploadFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            fileName.textContent = file.name;
            
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadStatus = document.getElementById('uploadStatus');
            uploadStatus.style.display = 'block';
            uploadStatus.innerHTML = '<p style="color: #3498db;">📤 Uploading...</p>';
            
            try {
                const response = await fetch(`${API_URL}/upload-data`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.error) {
                    uploadStatus.innerHTML = `<p style="color: #e74c3c;">❌ Error: ${data.error}</p>`;
                } else {
                    uploadStatus.innerHTML = `
                        <div style="background: rgba(46, 204, 113, 0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #2ecc71;">
                            <p style="color: #2ecc71;">✅ ${data.message}</p>
                            <p style="color: var(--text-light); font-size: 0.9em;">Rows: ${data.rows} | Features: ${data.features}</p>
                        </div>
                    `;
                    document.getElementById('retrainSection').style.display = 'block';
                }
            } catch (error) {
                uploadStatus.innerHTML = `<p style="color: #e74c3c;">❌ Upload failed: ${error.message}</p>`;
            }
        });
    }
    
    if (retrainBtn) {
        retrainBtn.addEventListener('click', async () => {
            const epochs = parseInt(document.getElementById('epochs').value) || 10;
            const batchSize = parseInt(document.getElementById('batchSize').value) || 32;
            
            const retrainStatus = document.getElementById('retrainStatus');
            retrainStatus.innerHTML = '<p style="color: #f39c12;">🔄 Retraining model...</p>';
            retrainBtn.disabled = true;
            
            try {
                const response = await fetch(`${API_URL}/retrain`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ epochs, batch_size: batchSize })
                });
                
                const data = await response.json();
                
                if (data.error) {
                    retrainStatus.innerHTML = `<p style="color: #e74c3c;">❌ Error: ${data.error}</p>`;
                } else {
                    retrainStatus.innerHTML = `
                        <div style="background: rgba(46, 204, 113, 0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #2ecc71;">
                            <p style="color: #2ecc71;">✅ ${data.message}</p>
                            <p style="color: var(--text-light); font-size: 0.9em;">Samples: ${data.samples} | Accuracy: ${(data.final_accuracy * 100).toFixed(2)}%</p>
                        </div>
                    `;
                    await loadModelInfo();
                }
            } catch (error) {
                retrainStatus.innerHTML = `<p style="color: #e74c3c;">❌ Retrain failed: ${error.message}</p>`;
            }
            
            retrainBtn.disabled = false;
        });
    }
}

function displayResult(data) {
    const resultDiv = document.getElementById('result');
    const resultContent = document.getElementById('resultContent');

    const isAttack = data.predicted_class !== 'BENIGN';
    const attackClass = isAttack ? 'attack' : 'normal';

    let saveStatusHTML = '';
    if (data.auto_saved) {
        saveStatusHTML = `
            <div style="margin-top: 12px; padding: 10px; background: rgba(46, 204, 113, 0.1); border-left: 3px solid #2ecc71;">
                <p style="margin: 0; color: #2ecc71; font-size: 0.9em;">💾 Auto-saved | Label: ${data.label_saved}</p>
            </div>
        `;
    }

    let comparisonHTML = '';
    if (data.actual_label) {
        const isCorrect = data.is_correct;
        comparisonHTML = `
            <div style="margin-top: 12px; padding: 12px; background: ${isCorrect ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'}; border-left: 4px solid ${isCorrect ? '#2ecc71' : '#e74c3c'};">
                <p style="margin: 0; color: ${isCorrect ? '#2ecc71' : '#e74c3c'};">
                    ${isCorrect ? '✅ Correct!' : '❌ Incorrect'} Actual: <strong>${data.actual_label}</strong>
                </p>
            </div>
        `;
    }

    const modelBadge = data.ensemble_used
        ? '<span style="background: #9b59b6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">🎯 Rare Model</span>'
        : '<span style="background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">🔵 Main Model</span>';

    // Ensemble info section
    let ensembleInfo = '';
    if (data.rare_model_checked) {
        const modelUsed = data.ensemble_used ? 'Rare Classes Model' : 'Main Model';
        ensembleInfo = `
            <div style="background: transparent; padding: 12px 0; margin-top: 12px; border-left: 4px solid ${data.ensemble_used ? '#9b59b6' : '#F39C12'}; padding-left: 1rem;">
                <h4 style="margin: 0 0 8px 0; font-size: 0.95em; color: #fff;">🤖 Ensemble System Active</h4>
                <div style="font-size: 0.9em; color: #ECF0F1;">
                    <p style="margin: 4px 0;"><strong>Model Used:</strong> ${modelUsed}</p>
                    ${data.rare_model_prediction ? `<p style="margin: 4px 0;"><strong>Rare Model Detected:</strong> ${data.rare_model_prediction} (${(data.rare_model_confidence * 100).toFixed(2)}%)</p>` : ''}
                </div>
            </div>
        `;
    }

    // Main model chart
    let probsHTML = '<div class="probabilities">';
    probsHTML += `
        <h4 style="margin-top: 24px; color: #fff;">Main Model Probabilities:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; margin-top: 1rem;">
            <div style="max-width: 400px; margin: 0 auto;">
                <canvas id="probabilityChart"></canvas>
            </div>
            <div id="chartLegend" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
    `;

    // Rare model chart if checked
    if (data.rare_model_checked) {
        probsHTML += `
            <h4 style="margin-top: 24px; color: #fff;">Rare Model Probabilities:</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; margin-top: 1rem;">
                <div style="max-width: 400px; margin: 0 auto;">
                    <canvas id="rareModelChart"></canvas>
                </div>
                <div id="rareChartLegend" style="display: flex; flex-direction: column; gap: 8px;"></div>
            </div>
        `;
    }
    probsHTML += '</div>';

    resultContent.innerHTML = `
        <div class="prediction-result ${attackClass}">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <strong>Predicted:</strong> ${data.predicted_class}<br>
                    <strong>Confidence:</strong> ${(data.confidence * 100).toFixed(2)}%
                </div>
                ${modelBadge}
            </div>
        </div>
        ${saveStatusHTML}
        ${comparisonHTML}
        ${ensembleInfo}
        ${probsHTML}
    `;

    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
        createProbabilityChart(data.probabilities, data.predicted_class);
        if (data.rare_model_checked) {
            const rareProbs = data.rare_model_probabilities || createRareModelMockData(data);
            createRareModelChart(rareProbs, data.rare_model_prediction || data.predicted_class);
        }
    }, 100);
}

function createRareModelMockData(data) {
    const rareClasses = ['Bot', 'Infiltration', 'Heartbleed', 'Web Attack - SQL Injection', 'Web Attack - XSS', 'Web Attack - Brute Force'];
    const mockProbs = {};
    const predictedClass = data.rare_model_prediction || data.predicted_class;
    mockProbs[predictedClass] = data.rare_model_confidence || 0.85;
    const remaining = 1 - mockProbs[predictedClass];
    rareClasses.forEach((cls, idx) => {
        if (cls !== predictedClass) {
            mockProbs[cls] = remaining / (rareClasses.length - 1) * (1 - idx * 0.1);
        }
    });
    return mockProbs;
}

function createProbabilityChart(probabilities, predictedClass) {
    const canvas = document.getElementById('probabilityChart');
    if (!canvas) return;

    if (window.probabilityChartInstance) {
        window.probabilityChartInstance.destroy();
    }

    const sortedProbs = Object.entries(probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);

    const labels = sortedProbs.map(([name]) => name);
    const values = sortedProbs.map(([, prob]) => prob * 100);

    const colors = ['#F39C12', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'];

    const ctx = canvas.getContext('2d');
    window.probabilityChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: '#2C3E50',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => context.label + ': ' + context.parsed.toFixed(2) + '%'
                    }
                }
            }
        }
    });

    const legendDiv = document.getElementById('chartLegend');
    if (legendDiv) {
        legendDiv.innerHTML = sortedProbs.map(([className, prob], index) => {
            const percentage = (prob * 100).toFixed(2);
            const isSelected = className === predictedClass;
            return `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: ${isSelected ? 'rgba(243, 156, 18, 0.1)' : 'transparent'}; border-left: 3px solid ${colors[index]}; padding-left: 12px;">
                    <div style="width: 16px; height: 16px; background: ${colors[index]}; border-radius: 3px;"></div>
                    <div style="flex: 1; color: #ECF0F1;"><strong>${className}</strong>${isSelected ? ' ✓' : ''}</div>
                    <div style="color: ${colors[index]}; font-weight: 600;">${percentage}%</div>
                </div>
            `;
        }).join('');
    }
}


function createRareModelChart(probabilities, predictedClass) {
    const canvas = document.getElementById('rareModelChart');
    if (!canvas) return;

    if (window.rareModelChartInstance) {
        window.rareModelChartInstance.destroy();
    }

    const sortedProbs = Object.entries(probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);

    const labels = sortedProbs.map(([name]) => name);
    const values = sortedProbs.map(([, prob]) => prob * 100);

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

    const ctx = canvas.getContext('2d');
    window.rareModelChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: '#2C3E50',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => context.label + ': ' + context.parsed.toFixed(2) + '%'
                    }
                }
            }
        }
    });

    const legendDiv = document.getElementById('rareChartLegend');
    if (legendDiv) {
        legendDiv.innerHTML = sortedProbs.map(([className, prob], index) => {
            const percentage = (prob * 100).toFixed(2);
            const isSelected = className === predictedClass;
            return `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: ${isSelected ? 'rgba(155, 89, 182, 0.1)' : 'transparent'}; border-left: 3px solid ${colors[index]}; padding-left: 12px;">
                    <div style="width: 16px; height: 16px; background: ${colors[index]}; border-radius: 3px;"></div>
                    <div style="flex: 1; color: #ECF0F1;"><strong>${className}</strong>${isSelected ? ' ✓' : ''}</div>
                    <div style="color: ${colors[index]}; font-weight: 600;">${percentage}%</div>
                </div>
            `;
        }).join('');
    }
}
