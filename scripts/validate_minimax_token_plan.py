#!/usr/bin/env python3
import os
import requests

MINIMAX_KEY = os.environ.get('MINIMAX_API_KEY','')
MINIMAX_REGION = os.environ.get('MINIMAX_REGION','')
MINIMAX_AUTH_MODE = os.environ.get('MINIMAX_AUTH_MODE','')
BACKEND_URL = os.environ.get('BACKEND_URL','http://127.0.0.1:4000')
MATTER = os.environ.get('MATTER_ID','demo-001')


def safe_print(label, value):
    if label == 'MINIMAX_API_KEY':
        if value:
            print(label+": [REDACTED] (present)")
        else:
            print(label+": (missing)")
    else:
        print(label+":", value)

if __name__ == '__main__':
    safe_print('MINIMAX_AUTH_MODE', MINIMAX_AUTH_MODE)
    safe_print('MINIMAX_REGION', MINIMAX_REGION)
    safe_print('MINIMAX_API_KEY', MINIMAX_KEY)

    url = f"{BACKEND_URL}/matters/{MATTER}/ai/suggest"
    try:
        r = requests.post(url, json={})
        print('status_code:', r.status_code)
        body = r.json() if r.content else {}
        print('provider:', body.get('provider'))
        print('model:', body.get('model'))
        print('summary_exists:', 'summary' in (body.get('response') or {}))
        if r.status_code == 401:
            print('Received 401: likely Key/Region/AuthMode/Endpoint mismatch')
    except Exception as e:
        print('Request error:', str(e))
