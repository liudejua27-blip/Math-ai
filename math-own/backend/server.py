from __future__ import annotations

from argparse import ArgumentParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from typing import Any
from urllib.parse import urlparse

try:
    from .compute_engine import analyze_problem, list_capabilities
except ImportError:
    from compute_engine import analyze_problem, list_capabilities


REPORT_STORE: dict[str, dict[str, Any]] = {}


class MathCoachHandler(BaseHTTPRequestHandler):
    server_version = "MathCoachBackend/0.3"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        if parsed_url.path == "/api/health":
            self.write_json({"ok": True, "service": "math-coach-backend", "version": "0.3", "strict_mode": True})
            return
        if parsed_url.path == "/api/capabilities":
            self.write_json(list_capabilities())
            return
        if parsed_url.path.startswith("/api/report/"):
            job_id = parsed_url.path.rsplit("/", 1)[-1]
            report = REPORT_STORE.get(job_id)
            if report is None:
                self.write_json({"error": "report_not_found", "job_id": job_id}, status=404)
                return
            self.write_json(report)
            return
        self.write_json({"error": "not_found", "path": parsed_url.path}, status=404)

    def do_POST(self) -> None:
        parsed_url = urlparse(self.path)
        if parsed_url.path == "/api/analyze":
            payload = self.read_json()
            result = analyze_problem(payload)
            REPORT_STORE[result["job_id"]] = result["report"]
            self.write_json(result)
            return
        self.write_json({"error": "not_found", "path": parsed_url.path}, status=404)

    def read_json(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0") or 0)
        if content_length <= 0:
            return {}
        raw_body = self.rfile.read(content_length)
        if not raw_body:
            return {}
        return json.loads(raw_body.decode("utf-8"))

    def write_json(self, payload: dict[str, Any], status: int = 200) -> None:
        encoded = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format_message: str, *args: Any) -> None:
        return


def main() -> None:
    parser = ArgumentParser(description="Run the Math-SEARAG local compute backend.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8008, type=int)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), MathCoachHandler)
    print(f"Math coach backend listening on http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
