"""Local Runpod/S3 protocol fixture, not a real inference service."""
import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import threading
from worker_cpu import png


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(self, value, code=200):
        content = json.dumps(value).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
        self.server.calls.append((self.path, body, self.headers.get("Authorization")))
        if self.path.endswith("/run"):
            job = "job-" + str(len(self.server.jobs) + 1)
            self.server.jobs[job] = {"input": body["input"], "polls": 0, "cancelled": False,
                                     "endpoint": self.path.split("/")[-2]}
            if body["input"].get("drop"):
                # Accepted remotely, but response lost: retry would create another job.
                self.close_connection = True
                return
            self.reply({"id": job, "status": "IN_QUEUE"})
        elif "/cancel/" in self.path:
            job = self.path.rsplit("/", 1)[-1]
            if job not in self.server.jobs or self.server.jobs[job]["endpoint"] != self.path.split("/")[-3]:
                return self.reply({"error": "Not found"}, 404)
            self.server.jobs[job]["cancelled"] = True
            self.reply({"id": job, "status": "CANCELLED"})
        else:
            self.reply({"error": "Unknown route"}, 404)

    def do_GET(self):
        if self.path.startswith("/object"):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(self.server.object)
            return
        if self.path.startswith("/redirect"):
            self.send_response(302)
            self.send_header("Location", "http://127.0.0.1:1/private")
            self.end_headers()
            return
        job = self.path.rsplit("/", 1)[-1]
        data = self.server.jobs.get(job)
        if not data or data["endpoint"] != self.path.split("/")[-3]:
            return self.reply({"error": "Missing, expired or wrong endpoint"}, 404)
        data["polls"] += 1
        values = data["input"]
        status = ("CANCELLED" if data["cancelled"] else "FAILED" if values.get("fail")
                  else "TIMED_OUT" if values.get("timeout") else "IN_PROGRESS" if values.get("pending")
                  else "IN_QUEUE" if data["polls"] == 1 else "COMPLETED")
        result = {"id": job, "status": status}
        if status == "FAILED":
            result["error"] = "Deliberate worker failure"
        if status == "COMPLETED":
            image = {"filename": "../../escape.png", "type": "base64", "data": base64.b64encode(png(32, 32)).decode()}
            if values.get("url"):
                image.update(type="s3_url", data=self.server.origin + "/object?X-Amz-Signature=private-signature")
            result["output"] = {"images": [image]}
        self.reply(result)

    def do_PUT(self):
        self.server.object = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        self.send_response(200)
        self.end_headers()


def start():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.jobs, server.calls, server.object = {}, [], png(32, 32)
    server.origin = "http://127.0.0.1:" + str(server.server_port)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


if __name__ == "__main__":
    server = start()
    print(json.dumps({"mock": True, "baseUrl": server.origin + "/v2", "budgetUsd": 0,
                      "endpoints": {"image": {"id": "image"}, "video": {"id": "video"}}}), flush=True)
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        server.shutdown()
