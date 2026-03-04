import os
import re
import requests
import base64
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

# Load environment variables (useful for local testing)
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="TailorCV API")

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
# Allow requests from any origin for development. 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://caleb-gawthroupe.github.io"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model to validate incoming JSON payload from script.js
class GenerateRequest(BaseModel):
    provider: str
    apiKey: str
    jobDescription: str
    keywords: Optional[str] = ""
    fileContent: str

class ResumeTailor:
    """
    A service class to rewrite LaTeX resumes based on job descriptions using various AI providers.
    """

    def __init__(self, provider="openai", api_key=None):
        self.provider = provider.lower()
        self.api_key = api_key
        self.system_prompt = (
            "You are a LaTeX expert. Tailor the provided resume LaTeX to match the job description. "
            "Maintain the exact document structure. Return ONLY the raw LaTeX code. "
            "Do not include markdown code blocks (```latex) or explanations."
        )

    def generate(self, job_desc, keywords, base_latex):
        user_content = f"Job Description:\n{job_desc}\n\n"
        if keywords:
            user_content += f"Target Keywords to prioritize:\n{keywords}\n\n"
        user_content += f"Base LaTeX:\n{base_latex}"

        if self.provider == "openai":
            return self._call_openai(user_content)
        elif self.provider == "claude":
            return self._call_claude(user_content)
        elif self.provider == "gemini":
            return self._call_gemini(user_content)
        else:
            raise ValueError("Unsupported provider. Use 'openai', 'claude', or 'gemini'.")

    def _call_openai(self, content):
        from openai import OpenAI
        # Use the API key provided from the frontend, fallback to env variable if empty
        key = self.api_key if self.api_key else os.getenv("OPENAI_API_KEY")
        client = OpenAI(api_key=key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": content}
            ]
        )
        return response.choices[0].message.content

    def _call_claude(self, content):
        import anthropic
        key = self.api_key if self.api_key else os.getenv("ANTHROPIC_API_KEY")
        client = anthropic.Anthropic(api_key=key)
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            system=self.system_prompt,
            messages=[{"role": "user", "content": content}]
        )
        return response.content[0].text

    def _call_gemini(self, content):
        from google import genai
        from google.genai import types
        key = self.api_key if self.api_key else os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=key)
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=content,
            config=types.GenerateContentConfig(
                system_instruction=self.system_prompt
            )
        )
        return response.text

@app.post("/generate")
@limiter.limit("5/minute")
async def generate_resume_endpoint(payload: GenerateRequest, request: Request):
    """
    FastAPI endpoint that receives the JSON payload from the frontend,
    tailors the resume, and returns the raw LaTeX code.
    """
    try:
        # Map frontend provider values ("chatgpt") to backend ("openai")
        provider_map = {
            "chatgpt": "openai",
            "claude": "claude",
            "gemini": "gemini"
        }
        backend_provider = provider_map.get(payload.provider.lower(), "openai")
        
        tailor = ResumeTailor(provider=backend_provider, api_key=payload.apiKey)
        tailored_latex = tailor.generate(payload.jobDescription, payload.keywords, payload.fileContent)
        
        # Optionally clean up markdown code block wrappers
        tailored_latex = re.sub(r"```latex|```", "", tailored_latex).strip()
        
        pdf_base64 = None
        try:
            pdf_bytes = compile_to_pdf(tailored_latex)
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        except Exception as pdf_err:
            print(f"Error generating PDF: {pdf_err}")
        
        return {
            "status": "success", 
            "latex": tailored_latex,
            "pdf_base64": pdf_base64
        }
        
    except Exception as e:
        print(f"Error generating resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def compile_to_pdf(latex_code):
    """
    Sends LaTeX code to a remote compilation API and returns the PDF bytes.
    """
    print("Compiling LaTeX to PDF...")
    url = "https://texapi.ovh/compile"
    response = requests.post(url, json={"latex": latex_code})
    
    if response.status_code == 200:
        return response.content
    else:
        raise Exception(f"PDF compilation failed: {response.text}")