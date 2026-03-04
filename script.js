/**
 * Resume Tailor Frontend Logic
 * Handles file reading, form submission, and UI state management.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Element Selectors ---
    const form = document.getElementById('tailor-form');
    const resumeFileInput = document.getElementById('resume-file');
    const fileNameDisplay = document.getElementById('file-name');
    const fileUploadLabel = document.querySelector('.file-upload-label');
    const submitBtn = document.getElementById('submit-btn');
    const statusArea = document.getElementById('status-area');
    const statusMessage = document.getElementById('status-message');
    const loadingSpinner = document.getElementById('loading-spinner');

    const resultArea = document.getElementById('result-area');
    const pdfViewer = document.getElementById('pdf-viewer');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const downloadTexBtn = document.getElementById('download-tex-btn');

    /** @type {string} Stores the raw text content of the uploaded LaTeX file */
    let fileContent = '';

    let currentPdfBase64 = null;
    let currentLatex = null;

    /**
     * Event Listener: Handle File Selection
     * Triggered when a user selects a file via the input or drag-and-drop.
     * Uses FileReader to convert the file into a string for the API payload.
     */
    resumeFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Update UI to show filename
            fileNameDisplay.textContent = file.name;
            fileUploadLabel.classList.add('has-file');

            // Initialize FileReader to process the .tex file
            const reader = new FileReader();
            reader.onload = (event) => {
                fileContent = event.target.result;
            };
            reader.onerror = () => {
                showStatus('Error reading file. Please try again.', 'error');
                fileContent = '';
            };
            reader.readAsText(file);
        } else {
            // Reset state if selection is cleared
            fileNameDisplay.textContent = 'Upload .tex resume';
            fileUploadLabel.classList.remove('has-file');
            fileContent = '';
        }
    });

    /**
     * Event Listener: Handle Form Submission
     * Intercepts the default submit event, aggregates form data, 
     * and sends a POST request to the backend.
     */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Aggregate current form values
        const provider = document.getElementById('provider').value;
        const apiKey = document.getElementById('api-key').value;
        const jobDescription = document.getElementById('job-description').value;
        const keywords = document.getElementById('keywords').value;

        // Validation check for file content
        if (!fileContent) {
            showStatus('Please upload a valid .tex file.', 'error');
            return;
        }

        /** @type {Object} The data structure sent to the server */
        const payload = {
            provider,
            apiKey,
            jobDescription,
            keywords,
            fileContent
        };

        // UI Loading State: Prevent double-submission and show spinner
        submitBtn.disabled = true;
        resultArea.classList.add('hidden');
        showStatus('Generating tailored resume...', 'loading');

        try {
            /** * Communication with Backend
             * Note: Ensure your backend endpoint matches '/generate'
             */
            const response = await fetch('https://tailor-cv-s9fu.onrender.com/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const data = await response.json();

            // Handle successful processing
            showStatus('Resume tailored successfully!', 'success');
            console.log('Response data:', data);

            currentLatex = data.latex;

            if (data.pdf_base64) {
                currentPdfBase64 = data.pdf_base64;
                pdfViewer.src = `data:application/pdf;base64,${data.pdf_base64}`;
                pdfViewer.classList.remove('hidden');
                downloadPdfBtn.disabled = false;
            } else {
                currentPdfBase64 = null;
                showStatus('Resume tailored, but PDF compilation failed.', 'error');
                pdfViewer.classList.add('hidden');
                downloadPdfBtn.disabled = true;
            }

            resultArea.classList.remove('hidden');

        } catch (error) {
            console.error('Submission error:', error);
            showStatus(`Error generating resume: ${error.message}`, 'error');
        } finally {
            // Re-enable button regardless of success/fail
            submitBtn.disabled = false;
        }
    });

    /**
     * Utility Function: Show Status/Feedback
     * Manages CSS classes for success/error styling and toggles the loading spinner.
     * * @param {string} message - The text to display to the user.
     * @param {string} type - The status type: 'loading', 'success', or 'error'.
     */
    function showStatus(message, type) {
        statusArea.className = `status-container ${type}`;
        statusMessage.textContent = message;

        // Toggle visibility of the loading indicator
        if (type === 'loading') {
            loadingSpinner.classList.remove('hidden');
        } else {
            loadingSpinner.classList.add('hidden');
        }
    }

    // Handle PDF Download
    downloadPdfBtn.addEventListener('click', () => {
        if (!currentPdfBase64) return;
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${currentPdfBase64}`;
        link.download = 'tailored_resume.pdf';
        link.click();
    });

    // Handle LaTeX Download
    downloadTexBtn.addEventListener('click', () => {
        if (!currentLatex) return;
        const blob = new Blob([currentLatex], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'tailored_resume.tex';
        link.click();
    });
});