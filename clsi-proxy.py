#!/usr/bin/env python3
"""
Simple CORS proxy for CLSI
Run with: python3 clsi-proxy.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import urllib.error
import json
import ssl

CLSI_URL = 'http://localhost:3013'
PROXY_PORT = 3014

# Create unverified SSL context
ssl_context = ssl._create_unverified_context()

class CORSProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()
    
    def do_POST(self):
        """Proxy POST requests to CLSI"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # Check if request is for Anthropic
            if self.path.startswith('/anthropic'):
                url = 'https://api.anthropic.com/v1/messages'
                
                # Only forward specific headers needed by Anthropic
                anthropic_headers = {
                    'content-type': self.headers.get('content-type', 'application/json'),
                    'x-api-key': self.headers.get('x-api-key', ''),
                    'anthropic-version': self.headers.get('anthropic-version', '2023-06-01')
                }
                
                # Debug logging
                print(f"Anthropic request headers: {anthropic_headers}")
                key = anthropic_headers.get('x-api-key', '')
                print(f"Received API Key length: {len(key)}")
                if len(key) > 10:
                    print(f"Key start: {key[:15]}...")

                
                req = urllib.request.Request(url, data=body, method='POST', headers=anthropic_headers)
                
                # Make request with SSL context
                with urllib.request.urlopen(req, timeout=120, context=ssl_context) as response:
                    response_data = response.read()
                    self._send_response_data(response, response_data)
            else:
                # Forward request to CLSI
                url = f"{CLSI_URL}{self.path}"
                req = urllib.request.Request(url, data=body, method='POST')
                
                # Forward headers for CLSI
                for header, value in self.headers.items():
                    if header.lower() not in ['host', 'connection']:
                        req.add_header(header, value)
                
                # Make request to CLSI (no SSL context needed for localhost HTTP)
                with urllib.request.urlopen(req, timeout=120) as response:
                    response_data = response.read()
                    self._send_response_data(response, response_data)
                
        except urllib.error.HTTPError as e:
            # Forward HTTP errors (4xx, 5xx)
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.send_header('Content-Type', e.headers.get('Content-Type', 'application/json'))
            self.end_headers()
            self.wfile.write(e.read())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({'error': str(e)}).encode()
            self.wfile.write(error_response)
            print(f"Error: {e}")
    
    def _send_response_data(self, response, response_data):
        self.send_response(response.getcode())
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
        self.end_headers()
        self.wfile.write(response_data)

    def do_GET(self):
        """Proxy GET requests to CLSI"""
        try:
            # Handle root path for connection checks
            if self.path == '/':
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok', 'service': 'CLSI Proxy'}).encode())
                return
            
            url = f"{CLSI_URL}{self.path}"
            req = urllib.request.Request(url, method='GET')
            
            with urllib.request.urlopen(req, timeout=30) as response:
                response_data = response.read()
                
                self.send_response(response.getcode())
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                self.send_header('Content-Type', response.headers.get('Content-Type', 'text/plain'))
                self.end_headers()
                self.wfile.write(response_data)
                
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Content-Type', e.headers.get('Content-Type', 'text/plain'))
            self.end_headers()
            self.wfile.write(e.read())

        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({'error': str(e)}).encode()
            self.wfile.write(error_response)
            print(f"Error: {e}")
    
    def log_message(self, format, *args):
        """Override to reduce logging noise"""
        pass

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PROXY_PORT), CORSProxyHandler)
    print(f"CLSI CORS proxy running on http://localhost:{PROXY_PORT}")
    print(f"Proxying to CLSI at {CLSI_URL}")
    print("Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping proxy...")
        server.shutdown()
