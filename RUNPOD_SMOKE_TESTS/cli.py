#!/usr/bin/env python3
"""Run from any directory; Python 3.9+, no pip packages or AWS CLI."""
import argparse
import json
from pathlib import Path
import sys
from client import Client, SmokeError


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--state", default=str(Path.home() / ".oopsie-smoke"))
    parser.add_argument("--live", action="store_true", help="Permit explicitly authorized configured endpoints")
    sub = parser.add_subparsers(dest="command", required=True)
    submit = sub.add_parser("submit")
    submit.add_argument("endpoint")
    submit.add_argument("request")
    for command in ("status", "poll", "cancel", "download"):
        p = sub.add_parser(command)
        p.add_argument("endpoint")
        p.add_argument("job")
        if command == "poll":
            p.add_argument("--seconds", type=float, default=60)
            p.add_argument("--interval", type=float, default=2)
        if command == "download":
            p.add_argument("--out", required=True)
    sub.add_parser("storage").add_argument("file")
    args = parser.parse_args()
    client = None
    try:
        client = Client(json.loads(Path(args.config).read_text()), args.state, live=args.live)
        if args.command == "submit":
            result = client.submit(args.endpoint, json.loads(Path(args.request).read_text()))
        elif args.command == "poll":
            result = client.poll(args.endpoint, args.job, seconds=args.seconds, interval=args.interval)
        elif args.command == "download":
            result = client.download(args.endpoint, args.job, args.out)
        elif args.command == "storage":
            result = client.storage_roundtrip(args.file)
        else:
            result = getattr(client, args.command)(args.endpoint, args.job)
        print(json.dumps(client.clean(result), indent=2))
        return 0
    except (SmokeError, OSError, ValueError, KeyError, TypeError) as error:
        print(client.clean(str(error)) if client else "Invalid configuration", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
