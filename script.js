const BACKEND_URL = "http://127.0.0.1:5000";

/* ---------- ELEMENTS ---------- */
const recordBtn = document.getElementById("record-btn");
const recordText = document.getElementById("record-text");
const uploadBtn = document.getElementById("upload-btn");
const audioFileInput = document.getElementById("audio-file");
const translateBtn = document.getElementById("translate-btn");
const clearBtn = document.getElementById("clear-btn");
const targetLangSelect = document.getElementById("target-lang");
const inputText = document.getElementById("input-text");
const outputText = document.getElementById("output-text");
const copyBtn = document.getElementById("copy-btn");
const playBtn = document.getElementById("play-btn");
const audioElement = document.getElementById("audio-element") || new Audio();
const progressBar = document.getElementById("progress-bar");
const audioTime = document.getElementById("audio-time");
const audioPlayerDiv = document.getElementById("audio-player");
const noAudioDiv = document.getElementById("no-audio");
const statusMessage = document.getElementById("status-message");
const detectedLang = document.getElementById("detected-lang");
const processTime = document.getElementById("process-time");
const translationStatus = document.getElementById("translation-status");
const targetLangName = document.getElementById("target-lang-name");
const translateSpinner = document.getElementById("translate-spinner");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");

/* ---------- STATE VARIABLES ---------- */
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let currentAudioBlob = null;

/* ---------- STATUS & TOAST ---------- */
function showStatus(text, type = "info") {
    const statusText = document.getElementById("status-text");
    const statusDot = document.getElementById("status-dot");

    statusText.textContent = text;
    statusDot.className = "w-2 h-2 rounded-full " + 
        (type === "error" ? "bg-red-500" : 
         type === "success" ? "bg-green-500" : 
         "bg-yellow-400");
}

function showToast(msg, type = "info") {
    const toast = document.getElementById("toast");
    const toastIcon = document.getElementById("toast-icon");
    const toastMsg = document.getElementById("toast-message");
    
    // Set icon based on type
    toastIcon.className = 
        type === "success" ? "fas fa-check-circle text-green-400" :
        type === "error" ? "fas fa-exclamation-circle text-red-400" :
        type === "warning" ? "fas fa-exclamation-triangle text-yellow-400" :
        "fas fa-info-circle text-blue-400";
    
    toastMsg.textContent = msg;
    
    // Show toast
    toast.classList.remove("translate-x-full");
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.add("translate-x-full");
    }, 3000);
}

/* ---------- WAVE VISUALIZATION ---------- */
function createWaveVisualization() {
    const waveContainer = document.querySelector('.wave-container');
    if (!waveContainer) return;
    
    waveContainer.innerHTML = '';
    
    for (let i = 0; i < 40; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        bar.style.cssText = `
            width: 4px;
            height: ${10 + Math.random() * 20}px;
            --i: ${i};
            border-radius: 2px;
        `;
        waveContainer.appendChild(bar);
    }
}

/* ---------- RECORDING FUNCTIONALITY ---------- */
recordBtn.addEventListener("click", async () => {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
});

async function startRecording() {
    try {
        // Check if browser supports recording
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast("Your browser doesn't support audio recording", "error");
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            // Create audio blob
            currentAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            // Create audio URL for preview (optional)
            const audioUrl = URL.createObjectURL(currentAudioBlob);
            console.log("Recording saved, size:", currentAudioBlob.size, "bytes");
            
            // Create a file from blob for translation
            const audioFile = new File([currentAudioBlob], 'recording.webm', { 
                type: 'audio/webm',
                lastModified: Date.now()
            });
            
            // Automatically translate the recording
            await translateAudio(audioFile);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.onerror = (event) => {
            console.error("Recording error:", event);
            showToast("Recording error occurred", "error");
        };
        
        // Start recording
        mediaRecorder.start(100); // Collect data every 100ms
        isRecording = true;
        
        // Update UI
        recordBtn.classList.add("pulse");
        recordText.innerHTML = '<i class="fas fa-stop mr-2"></i> Stop Recording';
        startTimer();
        
        showToast("Recording started...", "info");
        
    } catch (err) {
        console.error("Recording error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            showToast("Microphone access denied. Please allow microphone access.", "error");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            showToast("No microphone found. Please connect a microphone.", "error");
        } else {
            showToast("Failed to start recording: " + err.message, "error");
        }
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.classList.remove("pulse");
        recordText.innerHTML = '<i class="fas fa-microphone mr-2"></i> Start Recording';
        stopTimer();
        showToast("Recording stopped", "info");
    }
}

function startTimer() {
    let seconds = 0;
    const timer = document.getElementById("timer");
    timer.classList.remove("hidden");
    
    recordingTimer = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        timer.textContent = `${mins}:${secs}`;
        
        // Auto-stop after 60 seconds
        if (seconds >= 60) {
            stopRecording();
            showToast("Recording stopped automatically after 1 minute", "warning");
        }
    }, 1000);
}

function stopTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    const timer = document.getElementById("timer");
    timer.classList.add("hidden");
    timer.textContent = "00:00";
}

/* ---------- FILE UPLOAD ---------- */
uploadBtn.addEventListener("click", () => {
    audioFileInput.click();
});

audioFileInput.addEventListener("change", async () => {
    if (audioFileInput.files.length > 0) {
        const file = audioFileInput.files[0];
        
        // Validate file
        if (!file.type.startsWith('audio/')) {
            showToast("Please select an audio file", "error");
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showToast("Audio file too large (max 10MB)", "error");
            return;
        }
        
        showToast(`Uploading ${file.name}...`, "info");
        await translateAudio(file);
    }
});

/* ---------- TRANSLATION ---------- */
translateBtn.addEventListener("click", async () => {
    // Check if we have audio to translate
    if (!currentAudioBlob && audioFileInput.files.length === 0) {
        showToast("Please record or upload audio first", "warning");
        return;
    }
    
    if (currentAudioBlob) {
        const audioFile = new File([currentAudioBlob], 'recording.webm', { 
            type: 'audio/webm',
            lastModified: Date.now()
        });
        await translateAudio(audioFile);
    } else if (audioFileInput.files.length > 0) {
        await translateAudio(audioFileInput.files[0]);
    }
});

async function translateAudio(file) {
    const startTime = Date.now();
    
    // Update UI
    showStatus("Processing audio...", "info");
    translationStatus.textContent = "Processing...";
    translationStatus.className = "ml-2 font-medium text-yellow-400";
    translateSpinner.classList.remove("hidden");
    translateBtn.disabled = true;
    
    // Create form data
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("lang", targetLangSelect.value);
    
    try {
        console.log("📤 Sending translation request...");
        console.log("File info:", {
            name: file.name,
            type: file.type,
            size: file.size,
            targetLang: targetLangSelect.value
        });
        
        // Show uploading status
        showToast("Uploading audio...", "info");
        
        const response = await fetch(`${BACKEND_URL}/translate`, {
            method: "POST",
            body: formData
        });
        
        console.log("Response status:", response.status, response.statusText);
        
        const result = await response.json();
        console.log("Backend response:", result);
        
        if (!response.ok) {
            throw new Error(result.error || `Translation failed (${response.status})`);
        }
        
        if (!result.success) {
            throw new Error(result.message || "Translation failed");
        }
        
        console.log("✅ Translation successful:", result);
        
        // Update UI with results
        updateUI(result.data, startTime);
        saveToHistory(result.data);
        renderHistory();
        
        showStatus("Translation complete", "success");
        showToast("Translation successful!", "success");
        
    } catch (error) {
        console.error("❌ Translation error:", error);
        
        // Show detailed error message
        let errorMsg = error.message || "Translation failed";
        if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
            errorMsg = "Cannot connect to backend server. Make sure it's running on port 5000.";
        }
        
        showToast(errorMsg, "error");
        showStatus("Translation failed", "error");
        translationStatus.textContent = "Failed";
        translationStatus.className = "ml-2 font-medium text-red-400";
        
        // Try to debug by checking backend health
        checkBackend();
    } finally {
        translateSpinner.classList.add("hidden");
        translateBtn.disabled = false;
    }
}

function updateUI(data, startTime) {
    // Update text areas
    inputText.value = data.original_text || "";
    outputText.value = data.translated_text || "";
    
    // Update language info
    detectedLang.textContent = data.detected_language_name || data.detected_language || "Unknown";
    targetLangName.textContent = data.target_language_name || data.target_language;
    
    // Update processing time
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    processTime.textContent = `${elapsed}s`;
    
    // Update status
    translationStatus.textContent = "Complete";
    translationStatus.className = "ml-2 font-medium text-green-400";
    
    // Handle audio
    if (data.audio_url) {
        // Set audio source
        const audioUrl = `${BACKEND_URL}${data.audio_url}`;
        audioElement.src = audioUrl;
        
        // Show audio player
        audioPlayerDiv.classList.remove("hidden");
        noAudioDiv.classList.add("hidden");
        
        // Setup audio player events
        setupAudioPlayer();
        
        showToast("Audio ready to play", "info");
    } else {
        audioPlayerDiv.classList.add("hidden");
        noAudioDiv.classList.remove("hidden");
        showToast("Translation complete (no audio generated)", "warning");
    }
}

/* ---------- AUDIO PLAYER ---------- */
function setupAudioPlayer() {
    // Reset audio element
    audioElement.currentTime = 0;
    audioElement.volume = 1.0;
    
    // Update play button icon
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    
    // Remove previous event listeners
    audioElement.removeEventListener("timeupdate", updateProgress);
    audioElement.removeEventListener("ended", onAudioEnded);
    
    // Add new event listeners
    audioElement.addEventListener("timeupdate", updateProgress);
    audioElement.addEventListener("ended", onAudioEnded);
    
    // Play button click handler
    playBtn.onclick = togglePlayPause;
    
    // Initial update
    updateProgress();
}

function togglePlayPause() {
    if (audioElement.paused) {
        audioElement.play()
            .then(() => {
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            })
            .catch(error => {
                console.error("Playback error:", error);
                showToast("Failed to play audio", "error");
            });
    } else {
        audioElement.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function updateProgress() {
    if (!audioElement.duration || audioElement.duration === Infinity) return;
    
    const percent = (audioElement.currentTime / audioElement.duration) * 100;
    progressBar.style.width = `${percent}%`;
    
    const current = formatTime(audioElement.currentTime);
    const total = formatTime(audioElement.duration);
    audioTime.textContent = `${current} / ${total}`;
}

function onAudioEnded() {
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    audioElement.currentTime = 0;
    updateProgress();
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

/* ---------- COPY TEXT ---------- */
copyBtn.addEventListener("click", () => {
    if (outputText.value) {
        navigator.clipboard.writeText(outputText.value)
            .then(() => {
                showToast("Text copied to clipboard", "success");
            })
            .catch(err => {
                console.error("Copy failed:", err);
                showToast("Failed to copy text", "error");
            });
    } else {
        showToast("No text to copy", "warning");
    }
});

/* ---------- CLEAR ---------- */
clearBtn.addEventListener("click", () => {
    // Clear text areas
    inputText.value = "";
    outputText.value = "";
    
    // Clear audio
    audioElement.src = "";
    audioPlayerDiv.classList.add("hidden");
    noAudioDiv.classList.remove("hidden");
    
    // Reset info
    detectedLang.textContent = "--";
    processTime.textContent = "--";
    translationStatus.textContent = "Ready";
    translationStatus.className = "ml-2 font-medium text-green-400";
    
    // Clear recording
    currentAudioBlob = null;
    audioFileInput.value = "";
    
    // Reset wave visualization
    createWaveVisualization();
    
    showToast("Cleared all content", "info");
});

/* ---------- HISTORY (UPDATED) ---------- */
function saveToHistory(data) {
    let history = JSON.parse(localStorage.getItem("translationHistory")) || [];
    
    history.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        original: data.original_text,
        translated: data.translated_text,
        from: data.detected_language,
        fromName: data.detected_language_name,
        to: data.target_language,
        toName: data.target_language_name,
        audioUrl: data.audio_url,
        processingTime: data.processing_time
    });
    
    // Keep only last 15 items
    history = history.slice(0, 15);
    localStorage.setItem("translationHistory", JSON.stringify(history));
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem("translationHistory")) || [];
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">No history yet</p>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="bg-black bg-opacity-20 rounded-lg p-4 mb-3 hover:bg-opacity-30 transition-colors group">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-300">${formatHistoryTime(item.timestamp)}</span>
                    <span class="text-xs px-2 py-1 bg-blue-600 rounded">${item.processingTime || '--'}</span>
                </div>
                <button onclick="deleteHistoryItem(${item.id})" 
                        class="text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-3">
                <!-- Input Section -->
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs text-gray-400">Input (${item.fromName || item.from || '??'})</span>
                    </div>
                    <div class="bg-black bg-opacity-20 p-2 rounded text-sm max-h-20 overflow-y-auto">
                        ${item.original || 'No input text'}
                    </div>
                </div>
                
                <!-- Output Section -->
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs text-gray-400">Output (${item.toName || item.to || '??'})</span>
                    </div>
                    <div class="bg-black bg-opacity-20 p-2 rounded text-sm max-h-20 overflow-y-auto">
                        ${item.translated || 'No translation'}
                    </div>
                </div>
            </div>
            
            <div class="flex justify-between items-center">
                <div class="text-xs text-gray-400">
                    ${item.from || '??'} → ${item.to || '??'}
                </div>
                <div class="flex gap-2">
                    ${item.audioUrl ? 
                        `<button onclick="playHistoryAudio('${BACKEND_URL}${item.audioUrl}')" 
                                class="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 rounded transition-colors">
                            <i class="fas fa-play mr-1"></i>Play Audio
                        </button>` : 
                        `<span class="text-xs text-gray-500 px-2 py-1">No Audio</span>`
                    }
                    <button onclick="loadHistoryItem(${item.id})" 
                            class="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors">
                        <i class="fas fa-redo mr-1"></i>Reload
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function formatHistoryTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem("translationHistory")) || [];
    const initialLength = history.length;
    
    // Remove item with matching id
    history = history.filter(item => item.id !== id);
    
    if (history.length < initialLength) {
        localStorage.setItem("translationHistory", JSON.stringify(history));
        renderHistory();
        showToast("Removed from history", "success");
    }
}

function loadHistoryItem(id) {
    const history = JSON.parse(localStorage.getItem("translationHistory")) || [];
    const item = history.find(h => h.id === id);
    
    if (!item) {
        showToast("History item not found", "error");
        return;
    }
    
    // Load into main UI
    inputText.value = item.original || "";
    outputText.value = item.translated || "";
    detectedLang.textContent = item.fromName || item.from || "Unknown";
    targetLangName.textContent = item.toName || item.to || "Unknown";
    
    // Load audio if available
    if (item.audioUrl) {
        const audioUrl = `${BACKEND_URL}${item.audioUrl}`;
        audioElement.src = audioUrl;
        audioPlayerDiv.classList.remove("hidden");
        noAudioDiv.classList.add("hidden");
        setupAudioPlayer();
    } else {
        audioPlayerDiv.classList.add("hidden");
        noAudioDiv.classList.remove("hidden");
    }
    
    // Update target language dropdown
    const targetLang = item.to;
    if (targetLang) {
        targetLangSelect.value = targetLang;
        const selectedOption = targetLangSelect.options[targetLangSelect.selectedIndex];
        targetLangName.textContent = selectedOption.text.replace(/^[^\s]+\s/, '');
    }
    
    showToast("History item loaded", "info");
}

function playHistoryAudio(url) {
    audioElement.src = url;
    audioElement.play()
        .then(() => {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            audioPlayerDiv.classList.remove("hidden");
            noAudioDiv.classList.add("hidden");
            setupAudioPlayer();
            showToast("Playing history audio", "info");
        })
        .catch(error => {
            console.error("Playback error:", error);
            showToast("Failed to play audio", "error");
        });
}

clearHistoryBtn.addEventListener("click", () => {
    const history = JSON.parse(localStorage.getItem("translationHistory")) || [];
    if (history.length === 0) {
        showToast("History is already empty", "info");
        return;
    }
    
    if (confirm("Are you sure you want to clear ALL history? This cannot be undone.")) {
        localStorage.removeItem("translationHistory");
        renderHistory();
        showToast("History cleared", "info");
    }
});

/* ---------- KEYBOARD SHORTCUTS ---------- */
document.addEventListener("keydown", (e) => {
    // Space to start/stop recording (but not when typing in textareas)
    if (e.code === "Space" && !e.target.matches("textarea, input, button, select")) {
        e.preventDefault();
        recordBtn.click();
    }
    
    // Escape to stop recording
    if (e.code === "Escape" && isRecording) {
        e.preventDefault();
        stopRecording();
    }
    
    // Ctrl/Cmd + Enter to translate
    if ((e.ctrlKey || e.metaKey) && e.code === "Enter") {
        e.preventDefault();
        translateBtn.click();
    }
});

/* ---------- BACKEND CHECK ---------- */
async function checkBackend() {
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        const data = await response.json();
        
        if (data.status === "healthy") {
            showStatus("Backend connected", "success");
            
            // Get languages
            try {
                const langResponse = await fetch(`${BACKEND_URL}/languages`);
                const languages = await langResponse.json();
                console.log("Supported languages:", languages);
                
                // Update language dropdown with dynamic data (optional)
                // updateLanguageDropdown(languages);
                
            } catch (langError) {
                console.warn("Could not fetch languages:", langError);
            }
            
        } else {
            showStatus("Backend error", "error");
        }
    } catch (error) {
        console.error("Backend check failed:", error);
        showStatus("Cannot connect to backend", "error");
        showToast("Backend server not running. Please start the backend.", "error");
    }
}

/* ---------- INITIALIZATION ---------- */
window.addEventListener("DOMContentLoaded", () => {
    // Initialize components
    createWaveVisualization();
    renderHistory();
    
    // Check backend connection
    checkBackend();
    
    // Set initial status
    showStatus("Ready to translate", "info");
    
    // Add some event listeners
    targetLangSelect.addEventListener("change", () => {
        const selectedOption = targetLangSelect.options[targetLangSelect.selectedIndex];
        targetLangName.textContent = selectedOption.text.replace(/^[^\s]+\s/, ''); // Remove flag
    });
    
    // Add click to copy for output text (optional)
    outputText.addEventListener("click", () => {
        if (outputText.value) {
            outputText.select();
        }
    });
    
    console.log("Frontend initialized successfully");
});

// Global functions for history operations
window.deleteHistoryItem = deleteHistoryItem;
window.loadHistoryItem = loadHistoryItem;
window.playHistoryAudio = playHistoryAudio;