#!/usr/bin/env python3
# Minimal stdlib adapter for /run-case (no external deps).

import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class AgentAdapter:
    def __init__(self, handler):
        self.handler = handler

    def serve(self, host="0.0.0.0", port=8787):
        adapter = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                if self.path == "/health":
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
                    return

                if self.path != "/run-case":
                    self.send_response(404)
                    self.end_headers()
                    return

                try:
                    length = int(self.headers.get("Content-Length", "0"))
                    body = self.rfile.read(length).decode("utf-8")
                    payload = json.loads(body)
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "invalid_json", "message": str(e)}).encode("utf-8"))
                    return

                try:
                    resp = adapter.handler(payload)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(resp).encode("utf-8"))
                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "handler_error", "message": str(e)}).encode("utf-8"))

        httpd = HTTPServer((host, port), Handler)
        print(f"agent-sdk-python listening on http://{host}:{port}")
        httpd.serve_forever()


# Example usage
if __name__ == "__main__":
    def handler(req):
        # req contains: case_id, version, input.user, input.context
        return {
            "case_id": req.get("case_id"),
            "version": req.get("version"),
            "final_output": {"content_type": "text", "content": "ok"},
            "events": [],
        }

    AgentAdapter(handler).serve(port=8787)
