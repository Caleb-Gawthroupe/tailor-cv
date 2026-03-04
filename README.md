# [TailorCV](https://caleb-gawthroupe.github.io/tailor-cv/)

A full-stack application that leverages AI models (ChatGPT, Claude, Gemini) to automatically tailor LaTeX resumes based on specific job descriptions and target keywords. The backend compiles the generated LaTeX into a PDF, returning both to the user in a seamless, modern interface.

## Note to Viewers
The Backend is hosted on a render environment free tier, meaning that it can take up to 50 seconds to boot-up after a period of innactivity.

---

## 🏗 Architecture & Flow

TailorCV uses a decoupled frontend and backend architecture, perfect for free cloud hosting environments.

**1. The Frontend (Client-Side)**
- **Tech Stack:** Pure HTML, CSS (Vanilla), and JavaScript. 
- **User Flow:** The user selects an AI provider, enters their API key, pastes a job description, adds optional keywords, and uploads their `.tex` resume file.
- **Processing:** `script.js` converts the `.tex` file into a raw text string using a `FileReader` and constructs a JSON payload. This payload is POSTed to the backend `/generate` endpoint.
- **Rendering:** Once the backend returns success, the UI dynamically displays an `iframe` containing the Base64-encoded PDF and provides buttons to download both the PDF and raw LaTeX `.tex` file.

**2. The Backend (API Server)**
- **Tech Stack:** Python, FastAPI, Uvicorn, slowapi.
- **Processing:** The `/generate` endpoint receives the JSON request, validates it using Pydantic, and routes it to the correct AI Model Provider (OpenAI, Anthropic, or Google) using the provided API Key.
- **LLM Prompting:** The AI models are explicitly instructed to return purely structurally accurate LaTeX, without Markdown wrapping.
- **PDF Compilation:** The structured LaTeX string is then passed to a remote LaTeX compilation API (`texapi.ovh`), which returns the compiled PDF byte stream.
- **Output:** The API converts the PDF byte stream into a Base64 string and returns it alongside the text output to the client. The endpoint is rate-limited to 5 requests per minute per IP address.

---

## 🚀 Deployment Practices

The application is structured for completely free, remote deployment by separating the static frontend from the Compute-heavy backend.

### 1. Frontend: GitHub Pages
The static files (`index.html`, `styles.css`, `script.js`) can be hosted for free on GitHub Pages.
1. Push this repository to GitHub.
2. Navigate to your repository **Settings** > **Pages**.
3. Set the deploy branch to `main`.
4. Update `script.js` line 96:
   ```javascript
   // Change from localhost to your new Render backend URL
   const response = await fetch('https://tailorcv-backend.onrender.com/generate', {
   ```

### 2. Backend: Render.com
The Python FastAPI application requires an actual server/compute environment capable of long-running requests (10-30 seconds for LLM + PDF compilation). Render.com is ideal for this.
1. Create an account on Render and select **New Web Service**.
2. Connect your GitHub repository.
3. Configure the environment:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Update CORS in `app.py`:
   - Change `allow_origins=["*"]` to your GitHub Pages URL (e.g., `["https://your-username.github.io"]`).

---

## 🛠 Local Development

To run the application locally on your machine:

**1. Install Dependencies**
Ensure you have Python 3.9+ installed.
```bash
pip install -r requirements.txt
```

**2. Start the FastAPI Server**
```bash
python -m uvicorn app:app --reload
```
The API will be available at `http://127.0.0.1:8000`.

**3. Run the Frontend**
Open `index.html` directly in your browser, or serve it using a simple HTTP server:
```bash
python -m http.server 3000
```
Navigate to `http://localhost:3000` in your browser.

---

## 📦 File Overview
- `app.py` - The FastAPI server handle request routing, AI generation, rate limiting, and PDF compilation.
- `index.html` - The static frontend layout.
- `styles.css` - UI styling including Dark/Light mode support.
- `script.js` - Client-side state management, file uploading, and API communication.
- `requirements.txt` - Python backend dependencies.
