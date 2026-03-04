// API Configuration - Claude API only
// API key is loaded from config.js (gitignored)
const API_MODEL_ANTHROPIC = 'claude-haiku-4-5-20251001';
const CLSI_PROXY = 'http://localhost:3014'; // Proxy for CORS and LaTeX compilation


// State
let worksheetState = {
  prompt: '',
  gradeLevel: '',
  subject: '',
  worksheetType: '',
  currentLaTeX: '',
  history: [],
  pdfContext: null // Base64 string of uploaded PDF
};

// Page load animations and initialization
document.addEventListener('DOMContentLoaded', () => {
  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    console.error('Error message:', event.message);
    console.error('Error stack:', event.error?.stack);
    // Prevent default to avoid page crash
    event.preventDefault();
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    console.error('Promise:', event.promise);
    // Prevent default to avoid page crash
    event.preventDefault();
  });

  initializeAnimations();
  setupEventListeners();
  checkCLSIService(); // Check connection on load
});

function initializeAnimations() {
  // Animate name label - fade in from left
  anime({
    targets: '#name-label',
    opacity: [0, 1],
    translateX: [-20, 0],
    duration: 600,
    easing: 'easeOutCubic',
    delay: 200
  });

  // Animate central text - fade in with scale
  const centralText = document.getElementById('central-text');
  centralText.style.transform = 'translate(-50%, -50%) scale(0.9)';
  anime({
    targets: centralText,
    opacity: [0, 1],
    scale: [0.9, 1],
    duration: 800,
    easing: 'easeOutCubic',
    delay: 400,
    update: function (anim) {
      const scale = anim.animatables[0].target.scale;
      centralText.style.transform = `translate(-50%, -50%) scale(${scale})`;
    },
    complete: function () {
      centralText.style.transform = 'translate(-50%, -50%) scale(1)';
    }
  });

  // Animate input container - pop up from bottom with fade
  const inputContainer = document.getElementById('input-container');
  const inputContainerAnim = { translateY: 20, opacity: 0 };
  anime({
    targets: inputContainerAnim,
    translateY: [20, 0],
    opacity: [0, 1],
    duration: 700,
    easing: 'easeOutCubic',
    delay: 800,
    update: function (anim) {
      const translateY = inputContainerAnim.translateY;
      const opacity = inputContainerAnim.opacity;
      inputContainer.style.transform = `translate(-50%, ${translateY}px)`;
      inputContainer.style.opacity = opacity;
    },
    complete: function () {
      inputContainer.style.transform = 'translate(-50%, 0)';
      inputContainer.style.opacity = '1';
    }
  });

  // Animate filter selects - stagger fade in
  anime({
    targets: '.filter-select',
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: 500,
    easing: 'easeOutCubic',
    delay: anime.stagger(100, { start: 1200 })
  });

  // Animate arrow button - fade in with slight scale
  anime({
    targets: '.arrow-btn',
    opacity: [0, 1],
    scale: [0.8, 1],
    duration: 500,
    easing: 'easeOutBack',
    delay: 1500
  });

  // Background floating shapes animations
  const shapes = document.querySelectorAll('.floating-shape');
  shapes.forEach((shape, index) => {
    const randomX = (Math.random() - 0.5) * 200;
    const randomY = (Math.random() - 0.5) * 200;
    const randomDuration = 8000 + Math.random() * 4000;
    const randomDelay = index * 100;

    anime({
      targets: shape,
      opacity: [0, 0.15],
      duration: 600,
      delay: 600 + randomDelay,
      easing: 'easeOutQuad'
    });

    const animObj = { x: 0, y: 0, rotation: 0 };
    function floatShape() {
      anime({
        targets: animObj,
        x: [0, randomX, -randomX, 0],
        y: [0, randomY, -randomY, 0],
        rotation: 360,
        duration: randomDuration * 2,
        easing: 'easeInOutSine',
        delay: 600 + randomDelay,
        update: function () {
          shape.style.transform = `translate(${animObj.x}px, ${animObj.y}px) rotate(${animObj.rotation}deg)`;
        },
        complete: function () {
          animObj.rotation = 0;
          floatShape();
        }
      });
    }
    floatShape();
  });
}

function setupEventListeners() {
  // Generate Button Click
  const generateBtn = document.getElementById('generate-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerate);
  }

  // Input Enter Key
  const input = document.getElementById('worksheet-input');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleGenerate();
      }
    });
  }

  // Chat Input Enter Key
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });
  }

  // Send Chat Button
  const sendChatBtn = document.getElementById('send-chat-btn');
  if (sendChatBtn) {
    sendChatBtn.addEventListener('click', sendChatMessage);
  }

  // Download Button
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadPDF);
  }

  // Check Connection Button removed


  // Back to Home Button
  const backBtn = document.getElementById('back-home-btn');
  if (backBtn) {
    backBtn.addEventListener('click', transitionToHome);
  }

  // Initial File Upload
  const initialFileInput = document.getElementById('initial-file-input');
  const initialUploadBtn = document.getElementById('initial-upload-btn');
  if (initialUploadBtn && initialFileInput) {
    initialUploadBtn.addEventListener('click', () => initialFileInput.click());
    initialFileInput.addEventListener('change', (e) => handleFileSelect(e, 'initial'));
  }

  // Chat File Upload
  const chatFileInput = document.getElementById('chat-file-input');
  const chatUploadBtn = document.getElementById('chat-upload-btn');
  if (chatUploadBtn && chatFileInput) {
    chatUploadBtn.addEventListener('click', () => chatFileInput.click());
    chatFileInput.addEventListener('change', (e) => handleFileSelect(e, 'chat'));
  }

  // Remove File Buttons
  document.querySelectorAll('.remove-file-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const indicator = e.target.closest('.file-indicator');
      const isChat = indicator.id === 'chat-file-indicator';
      clearFileSelection(isChat ? 'chat' : 'initial');
    });
  });

  // Setup Editor
  setupEditor();
}

function handleFileSelect(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    alert('Please select a PDF file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const base64 = e.target.result.split(',')[1];
    worksheetState.pdfContext = base64;
    updateFileIndicator(type, file.name);
  };
  reader.readAsDataURL(file);
}

function updateFileIndicator(type, fileName) {
  const indicatorId = type === 'initial' ? 'initial-file-indicator' : 'chat-file-indicator';
  const indicator = document.getElementById(indicatorId);
  const nameSpan = indicator.querySelector('.file-name');

  nameSpan.textContent = fileName;
  indicator.classList.remove('hidden');
}

function clearFileSelection(type) {
  worksheetState.pdfContext = null;

  const indicatorId = type === 'initial' ? 'initial-file-indicator' : 'chat-file-indicator';
  const inputId = type === 'initial' ? 'initial-file-input' : 'chat-file-input';

  document.getElementById(indicatorId).classList.add('hidden');
  document.getElementById(inputId).value = '';
}

function handleGenerate() {
  const prompt = document.getElementById('worksheet-input').value;
  if (!prompt.trim()) return;

  // Update State
  worksheetState.prompt = prompt;
  worksheetState.gradeLevel = document.getElementById('grade-select').value;
  worksheetState.subject = document.getElementById('subject-select').value;
  worksheetState.worksheetType = document.getElementById('type-select').value;

  // Transition to Workspace
  transitionToWorkspace();

  // Start Generation
  generateWorksheet();
}

function transitionToWorkspace() {
  const inputContainer = document.getElementById('input-container');
  const centralText = document.getElementById('central-text');
  const workspaceContainer = document.getElementById('workspace-container');

  // Animate Central Text Out
  anime({
    targets: centralText,
    opacity: 0,
    scale: 0.8,
    duration: 500,
    easing: 'easeInCubic',
    complete: () => {
      centralText.style.display = 'none';
    }
  });

  // Animate Input Container Out
  anime({
    targets: inputContainer,
    opacity: 0,
    translateY: 20,
    duration: 500,
    easing: 'easeInCubic',
    complete: () => {
      inputContainer.style.display = 'none';
    }
  });

  // Fade In Workspace
  workspaceContainer.classList.remove('hidden');
  anime({
    targets: workspaceContainer,
    opacity: [0, 1],
    duration: 800,
    delay: 300,
    easing: 'easeOutCubic',
    begin: () => {
      workspaceContainer.classList.add('active');
      document.body.classList.add('workspace-active'); // Add class to body
    }
  });
}

function transitionToHome() {
  const inputContainer = document.getElementById('input-container');
  const centralText = document.getElementById('central-text');
  const workspaceContainer = document.getElementById('workspace-container');

  // Fade Out Workspace
  anime({
    targets: workspaceContainer,
    opacity: 0,
    duration: 500,
    easing: 'easeInCubic',
    complete: () => {
      workspaceContainer.classList.add('hidden');
      workspaceContainer.classList.remove('active');
      document.body.classList.remove('workspace-active'); // Remove class from body

      // Reset Workspace State
      resetWorkspace();
    }
  });

  // Fade In Central Text
  centralText.style.display = 'block';
  anime({
    targets: centralText,
    opacity: [0, 1],
    scale: [0.8, 1],
    duration: 800,
    delay: 300,
    easing: 'easeOutCubic'
  });

  // Fade In Input Container
  inputContainer.style.display = 'flex';
  anime({
    targets: inputContainer,
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 800,
    delay: 400,
    easing: 'easeOutCubic'
  });
}

function resetWorkspace() {
  // Clear chat history except initial message
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = `
    <div class="chat-bubble ai-bubble">
      Hi! I'm generating your worksheet. Once it's ready, you can ask me to make changes!
    </div>
  `;

  // Clear preview
  const pdfViewer = document.getElementById('pdf-viewer');
  const htmlPreview = document.getElementById('html-preview');
  const loadingState = document.getElementById('loading-state');

  pdfViewer.src = '';
  pdfViewer.classList.add('hidden');
  htmlPreview.innerHTML = '';
  htmlPreview.classList.add('hidden');
  loadingState.classList.remove('hidden');

  // Reset buttons
  document.getElementById('download-btn').disabled = true;
  document.getElementById('chat-input').disabled = true;
  document.getElementById('send-chat-btn').disabled = true;

  // Reset state
  worksheetState.currentLaTeX = null;
  window.currentPdfBlob = null;
}

async function generateWorksheet() {
  setLoadingState(true);

  try {
    console.log('Starting worksheet generation...');

    const systemPrompt = `You are an expert LaTeX worksheet generator. Generate a complete, valid LaTeX document for a worksheet based on the user's requirements. The LaTeX should be ready to compile and should include:
- Proper document structure with necessary packages
- Professional formatting
- Questions appropriate for the specified grade level
- Answer key section
- Proper mathematical notation using LaTeX math mode

Generate ONLY the raw LaTeX code. Do NOT use markdown code blocks (no \`\`\`latex). Do NOT include any introductory or concluding text. Start immediately with \\documentclass and end with \\end{document}.`;

    const userPrompt = `Create a ${worksheetState.worksheetType || 'practice'} for ${worksheetState.gradeLevel || 'general'} ${worksheetState.subject || 'general'} with the following description: "${worksheetState.prompt}".
    
    Make sure the worksheet is age-appropriate and curriculum-aligned. Include a variety of question types where appropriate.`;

    console.log('Calling API...');
    // Call API with retry logic
    const latexContent = await callAPIWithRetry(systemPrompt, userPrompt);
    console.log('API call successful, LaTeX received');

    worksheetState.currentLaTeX = latexContent;

    console.log('Rendering preview...');
    // Render Preview
    await renderPreview(latexContent);
    console.log('Preview rendered');

    // Enable Chat
    enableChat();

    // Add initial AI message
    addChatMessage("I've generated your worksheet! Let me know if you'd like any changes.", 'ai');
    console.log('Generation complete!');

  } catch (error) {
    console.error('Error generating worksheet:', error);
    console.error('Error stack:', error.stack);

    // Make sure we show an error message and don't crash
    try {
      addChatMessage(`Sorry, I encountered an error: ${error.message}. Please try again.`, 'ai');
      setLoadingState(false);
    } catch (e) {
      console.error('Error showing error message:', e);
      alert(`Error generating worksheet: ${error.message}`);
      setLoadingState(false);
    }
  }
}

async function callAPIWithRetry(systemPrompt, userPrompt, maxRetries = 3) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      attempts++;
      console.log(`API Attempt ${attempts}/${maxRetries}`);

      const content = await callAPI(systemPrompt, userPrompt);

      // Basic validation - check if it looks like LaTeX
      if (content && content.includes('\\documentclass') && content.includes('\\end{document}')) {
        return content;
      } else {
        console.warn('API returned invalid LaTeX, retrying...');
        throw new Error('Invalid LaTeX response');
      }
    } catch (error) {
      console.warn(`Attempt ${attempts} failed:`, error);

      // Don't retry on authentication errors
      if (error.message.includes('API Authentication Error')) {
        throw error;
      }

      if (attempts >= maxRetries) throw error;

      // Wait before retry (exponential backoff with higher initial delay for 429s)
      const delay = Math.min(2000 * Math.pow(2, attempts), 10000);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function callAPI(systemPrompt, userPrompt) {
  console.log('Calling Claude API...');
  console.log('API Key loaded:', typeof ANTHROPIC_API_KEY !== 'undefined' ? 'Yes' : 'No');
  console.log('API Key starts with:', ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.substring(0, 15) + '...' : 'undefined');

  let messages = [];

  if (worksheetState.pdfContext) {
    console.log('Attaching PDF context...');
    messages.push({
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: worksheetState.pdfContext
          }
        },
        {
          type: 'text',
          text: userPrompt
        }
      ]
    });
  } else {
    messages.push({ role: 'user', content: userPrompt });
  }

  const response = await fetch(`${CLSI_PROXY}/anthropic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: API_MODEL_ANTHROPIC,
      system: systemPrompt,
      messages: messages,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Claude API Auth Error (${response.status}): Check your API Key in config.js`);
    }
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errText}`);
  }

  console.log('Response OK, parsing JSON...');
  const data = await response.json();
  console.log('Response data:', data);

  if (data.error) {
    console.error('API returned error:', data.error);
    throw new Error(data.error.message);
  }

  if (!data.content || !data.content.length) {
    console.error('Invalid response structure:', data);
    throw new Error('Invalid Claude response');
  }

  console.log('Extracting content...');
  let content = data.content[0].text.trim();
  console.log('Content length:', content.length);
  console.log('Content preview:', content.substring(0, 200));

  const cleaned = cleanLatex(content);
  console.log('Cleaned LaTeX length:', cleaned.length);
  return cleaned;
}

// Removed old callAnthropicAPI function - now integrated into callAPI

function cleanLatex(content) {
  // Remove markdown code blocks
  content = content.replace(/```latex\s*/gi, '').replace(/```tex\s*/gi, '').replace(/```\s*/g, '');

  // Extract content between documentclass and end{document} if present
  const startMatch = content.indexOf('\\documentclass');
  const endMatch = content.lastIndexOf('\\end{document}');

  if (startMatch !== -1 && endMatch !== -1) {
    return content.substring(startMatch, endMatch + 14); // 14 is length of \end{document}
  }

  return content.trim();
}

async function renderPreview(latexContent) {
  console.log('renderPreview called with LaTeX length:', latexContent.length);

  const pdfViewer = document.getElementById('pdf-viewer');
  const htmlPreview = document.getElementById('html-preview');
  const loadingState = document.getElementById('loading-state');
  const downloadBtn = document.getElementById('download-btn');

  // Show loading
  loadingState.classList.remove('hidden');
  pdfViewer.classList.add('hidden');
  htmlPreview.classList.add('hidden');

  try {
    console.log('Attempting PDF compilation...');
    // Try CLSI Compilation
    const pdfBlob = await compileLaTeXToPDF(latexContent);

    if (pdfBlob) {
      console.log('PDF compilation successful, displaying...');
      const pdfUrl = URL.createObjectURL(pdfBlob) + '#toolbar=0&navpanes=0&scrollbar=0';
      pdfViewer.src = pdfUrl;
      pdfViewer.classList.remove('hidden');
      loadingState.classList.add('hidden');
      window.currentPdfBlob = pdfBlob;
      downloadBtn.disabled = false;
      console.log('PDF preview ready');
      return;
    }
  } catch (error) {
    console.warn('PDF compilation failed, falling back to HTML:', error);
  }

  // Fallback to HTML
  console.log('Using HTML fallback...');
  loadingState.classList.add('hidden');
  htmlPreview.classList.remove('hidden');
  htmlPreview.innerHTML = convertLaTeXToHTML(latexContent);

  if (window.MathJax) {
    console.log('Typesetting with MathJax...');
    window.MathJax.typesetPromise([htmlPreview]).catch(err => {
      console.error('MathJax error:', err);
    });
  }

  downloadBtn.disabled = false; // Allow download (will use html2pdf)
  console.log('HTML preview ready');
}

async function compileLaTeXToPDF(latexContent) {
  const CLSI_PROXY = 'http://localhost:3014';
  const projectId = 'worknest-' + Date.now();

  try {
    console.log('Sending LaTeX to CLSI:', latexContent.substring(0, 100) + '...');
    const response = await fetch(`${CLSI_PROXY}/project/${projectId}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compile: {
          options: { compiler: 'pdflatex', timeout: 60 },
          rootResourcePath: 'main.tex',
          resources: [{ path: 'main.tex', content: latexContent }]
        }
      })
    });

    if (!response.ok) throw new Error(`CLSI compilation failed with status ${response.status}`);

    const result = await response.json();
    console.log('CLSI Result:', result);

    if (result.compile && result.compile.status === 'success') {
      const pdfFile = result.compile.outputFiles.find(f => f.type === 'pdf');
      if (pdfFile) {
        const pdfUrl = `${CLSI_PROXY}${pdfFile.url.replace(/^https?:\/\/[^\/]+/, '')}`;
        const pdfResponse = await fetch(pdfUrl);
        return await pdfResponse.blob();
      }
    } else {
      console.error('CLSI Compilation Error:', result.compile ? result.compile.logs : 'Unknown error');
      if (result.compile && result.compile.logs) {
        // Log the first few error lines
        const errors = result.compile.logs.filter(l => l.type === 'error');
        console.error('LaTeX Errors:', errors);
      }
    }
  } catch (error) {
    console.warn('CLSI error:', error);
    return null;
  }
}

// Chat Functionality
function enableChat() {
  document.getElementById('chat-input').disabled = false;
  document.getElementById('send-chat-btn').disabled = false;
  document.getElementById('chat-upload-btn').disabled = false;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  addChatMessage(message, 'user');
  input.value = '';

  // Show typing indicator (simplified)
  const typingId = addChatMessage('...', 'ai');

  try {
    const response = await callChatAPI(message);

    // Remove typing indicator
    const typingBubble = document.querySelector(`[data-msg-id="${typingId}"]`);
    if (typingBubble) typingBubble.remove();

    addChatMessage(response.message, 'ai');

    if (response.latex) {
      worksheetState.currentLaTeX = response.latex;
      renderPreview(response.latex);
    }
  } catch (error) {
    console.error('Chat error:', error);
    addChatMessage('Sorry, something went wrong.', 'ai');
  }
}

function addChatMessage(text, sender) {
  const container = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  const id = Date.now();
  bubble.className = `chat-bubble ${sender === 'user' ? 'user-bubble' : 'ai-bubble'}`;
  bubble.textContent = text;
  bubble.dataset.msgId = id;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return id;
}

async function callChatAPI(userMessage) {
  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      attempts++;
      console.log(`Chat API Attempt ${attempts}/${maxRetries}`);

      const response = await _makeChatRequest(userMessage, attempts);

      // Validation
      if (response.latex) {
        if (!response.latex.includes('\\documentclass') || !response.latex.includes('\\end{document}')) {
          console.warn('Chat API returned incomplete LaTeX, retrying...');
          throw new Error('Incomplete LaTeX response');
        }
      }

      return response;
    } catch (error) {
      console.warn(`Chat Attempt ${attempts} failed:`, error);

      if (attempts >= maxRetries) throw error;

      // Exponential backoff
      const delay = Math.min(2000 * Math.pow(2, attempts), 10000);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function _makeChatRequest(userMessage, attempt = 1) {
  let systemPrompt = `You are an AI assistant helping to edit a LaTeX worksheet. 
  Return JSON ONLY: {"message": "brief explanation", "latex": "COMPLETE updated latex code or null if no changes"}.
  
  CRITICAL RULES:
  1. If you provide 'latex', it MUST be the COMPLETE document from \\documentclass to \\end{document}.
  2. NEVER truncate the LaTeX code.
  3. NEVER return partial code snippets.
  4. Ensure the 'latex' field contains ONLY raw LaTeX code. Do NOT use markdown code blocks.
  5. Keep the "message" field extremely brief (under 20 words) to ensure the full LaTeX fits in the response.
  
  Current LaTeX: ${worksheetState.currentLaTeX ? worksheetState.currentLaTeX : 'None'}`;

  // If this is a retry, add stronger warnings
  if (attempt > 1) {
    systemPrompt += `
    
    IMPORTANT: Your previous attempt failed because the LaTeX was incomplete.
    You MUST provide the FULL LaTeX document. Do not stop in the middle.
    Ensure you end with \\end{document}.`;
  }

  let messages = [];

  if (worksheetState.pdfContext) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: worksheetState.pdfContext
          }
        },
        {
          type: 'text',
          text: userMessage
        }
      ]
    });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  const response = await fetch(`${CLSI_PROXY}/anthropic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: API_MODEL_ANTHROPIC,
      system: systemPrompt,
      messages: messages,
      max_tokens: 8192
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  if (!data.content || !data.content.length) {
    throw new Error('Invalid Claude response');
  }

  let content = data.content[0].text.trim();
  return parseChatResponse(content);
}

function parseChatResponse(content) {
  // Try to parse JSON
  try {
    // Remove markdown code blocks if present
    const cleanContent = content.replace(/^```json\n?/g, '').replace(/^```\n?/g, '').replace(/```$/g, '');
    return JSON.parse(cleanContent);
  } catch (e) {
    // If it looks like a JSON object but failed to parse, it's likely truncated/malformed.
    // We should throw so the retry logic catches it.
    if (content.trim().startsWith('{')) {
      throw new Error('Malformed JSON response');
    }

    // If parsing fails and it's NOT JSON, check if it looks like raw LaTeX
    if (content.includes('\\documentclass') || content.includes('\\begin{document}')) {
      return { message: "Here is the updated worksheet.", latex: content };
    }
    // Otherwise treat as plain message
    return { message: content, latex: null };
  }
}

// Utilities
function setLoadingState(loading) {
  const loadingState = document.getElementById('loading-state');
  if (loading) {
    loadingState.classList.remove('hidden');
  } else {
    loadingState.classList.add('hidden');
  }
}

async function checkCLSIService() {
  const statusEl = document.getElementById('connection-status');
  const dot = statusEl.querySelector('.status-dot');
  const text = statusEl.querySelector('.status-text');

  statusEl.classList.add('checking');
  text.textContent = 'Checking...';

  try {
    await fetch('http://localhost:3014');
    statusEl.classList.remove('checking');
    statusEl.classList.add('connected');
    dot.style.background = 'var(--success-color)';
    text.textContent = 'Connected';
  } catch (e) {
    statusEl.classList.remove('checking');
    statusEl.classList.add('disconnected');
    dot.style.background = 'var(--error-color)';
    text.textContent = 'Disconnected';
  }
}

function downloadPDF() {
  if (window.currentPdfBlob) {
    const url = URL.createObjectURL(window.currentPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'worksheet.pdf';
    document.body.appendChild(a); // Append to body to ensure click works
    a.click();
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url); // Free memory
  } else {
    // Fallback html2pdf
    if (typeof html2pdf === 'undefined') {
      alert('PDF generation library not loaded. Please try again.');
      return;
    }
    const element = document.getElementById('html-preview');
    html2pdf().from(element).save('worksheet.pdf');
  }
}

// Simple LaTeX to HTML converter for fallback
function convertLaTeXToHTML(latex) {
  // Basic replacements for demo purposes
  let html = latex
    .replace(/\\documentclass\[.*?\]\{.*?\}/g, '')
    .replace(/\\usepackage\{.*?\}/g, '')
    .replace(/\\begin\{document\}/g, '')
    .replace(/\\end\{document\}/g, '')
    .replace(/\\section\*?\{([^\}]+)\}/g, '<h2>$1</h2>')
    .replace(/\\textbf\{([^\}]+)\}/g, '<strong>$1</strong>')
    .replace(/\\textit\{([^\}]+)\}/g, '<em>$1</em>')
    .replace(/\\begin\{enumerate\}/g, '<ol>')
    .replace(/\\end\{enumerate\}/g, '</ol>')
    .replace(/\\item\s+([^\n]+)/g, '<li>$1</li>')
    .replace(/\\\\/g, '<br>');
  return `<div class="latex-content">${html}</div>`;
}

// Editor Functionality
function setupEditor() {
  const modal = document.getElementById('editor-modal');
  const editBtn = document.getElementById('edit-btn');
  const closeBtn = document.getElementById('close-editor-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const applyBtn = document.getElementById('apply-edit-btn');
  const latexSource = document.getElementById('latex-source');
  const visualContent = document.getElementById('visual-content');
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.editor-pane');

  if (!editBtn || !modal) return;

  // Open Editor
  editBtn.addEventListener('click', () => {
    if (!worksheetState.currentLaTeX) {
      alert('No worksheet to edit. Please generate one first.');
      return;
    }
    latexSource.value = worksheetState.currentLaTeX;
    // Reset to code tab
    switchTab('code');
    modal.classList.remove('hidden');
  });

  // Close/Cancel
  const closeModal = () => modal.classList.add('hidden');
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  // Apply Changes
  applyBtn.addEventListener('click', async () => {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

    try {
      setLoadingState(true);
      closeModal(); // Close first to show loading on main screen

      let newLatex = '';
      if (activeTab === 'code') {
        newLatex = latexSource.value;
      } else {
        // Convert Visual -> LaTeX via AI
        newLatex = await convertHTMLToLaTeX(visualContent.innerHTML);
      }

      if (newLatex) {
        worksheetState.currentLaTeX = newLatex;
        await renderPreview(newLatex);
        addChatMessage("I've updated the worksheet based on your edits.", 'ai');
      }
    } catch (error) {
      console.error('Error applying edits:', error);
      alert('Failed to apply changes: ' + error.message);
      setLoadingState(false);
      modal.classList.remove('hidden'); // Re-open on error
    }
  });

  // Tab Switching
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const target = tab.dataset.tab;
      const current = document.querySelector('.tab-btn.active').dataset.tab;

      if (target === current) return;

      // Sync content before switching
      if (current === 'code' && target === 'visual') {
        // Code -> Visual (Simple conversion)
        visualContent.innerHTML = convertLaTeXToHTML(latexSource.value);
      } else if (current === 'visual' && target === 'code') {
        // Visual -> Code (AI conversion)
        const originalText = tab.textContent;
        tab.textContent = 'Converting...';
        tab.disabled = true;
        try {
          const latex = await convertHTMLToLaTeX(visualContent.innerHTML);
          latexSource.value = latex;
          switchTab(target); // Only switch if successful
        } catch (e) {
          console.error(e);
          alert('Conversion failed: ' + e.message);
        } finally {
          tab.textContent = originalText;
          tab.disabled = false;
        }
        return; // Handled switch inside try
      }

      switchTab(target);
    });
  });

  function switchTab(tabName) {
    tabs.forEach(t => {
      if (t.dataset.tab === tabName) t.classList.add('active');
      else t.classList.remove('active');
    });

    panes.forEach(p => {
      if (p.id === `${tabName}-pane`) p.classList.add('active');
      else p.classList.remove('active');
    });
  }

  // Visual Toolbar
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (cmd === 'h1' || cmd === 'h2' || cmd === 'p') {
        document.execCommand('formatBlock', false, cmd);
      } else if (cmd === 'ul') {
        document.execCommand('insertUnorderedList', false, null);
      } else if (cmd === 'ol') {
        document.execCommand('insertOrderedList', false, null);
      } else {
        document.execCommand(cmd, false, null);
      }
      visualContent.focus();
    });
  });
}

async function convertHTMLToLaTeX(html) {
  const currentLaTeX = worksheetState.currentLaTeX || '';

  const systemPrompt = `You are an expert LaTeX editor. The user has edited the worksheet using a visual HTML editor.
  Your task is to update the original LaTeX code to match the new HTML content.
  
  Rules:
  1. Preserve the original preamble (documentclass, packages, custom commands) from the Original LaTeX.
  2. Update the document body to reflect the content in the HTML.
  3. Return ONLY the complete, valid, raw LaTeX code.
  4. Do not include markdown formatting.`;

  const userPrompt = `Original LaTeX:\n${currentLaTeX}\n\nModified HTML Content:\n${html}`;

  return await callAPIWithRetry(systemPrompt, userPrompt);
}
