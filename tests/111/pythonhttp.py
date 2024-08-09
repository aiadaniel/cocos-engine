from http.server import HTTPServer, SimpleHTTPRequestHandler, BaseHTTPRequestHandler
 
class CORSRequestHandler(SimpleHTTPRequestHandler):
 
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        SimpleHTTPRequestHandler.end_headers(self)
 
httpd = HTTPServer(('localhost', 8000), CORSRequestHandler)
print("Serving at http://localhost:8000")
httpd.serve_forever()