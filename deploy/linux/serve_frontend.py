from __future__ import annotations

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class SpaRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self) -> None:
        requested_path = Path(self.translate_path(self.path))
        if self.path.startswith("/assets/") or requested_path.exists():
            super().do_GET()
            return

        self.path = "/index.html"
        super().do_GET()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8788)
    parser.add_argument("--root", default="/var/www/generator/site")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    handler = functools.partial(SpaRequestHandler, directory=str(root))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
