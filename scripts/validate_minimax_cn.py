#!/usr/bin/env python3
import os
import requests
import json

MINIMAX_KEY = os.environ.get('MINIMAX_API_KEY','')
MINIMAX_REGION = os.environ.get('MINIMAX_REGION','')
MINIMAX_BASE_URL = os.environ.get('MINIMAX_BASE_URL','')

BACKEND_URL = os.environ.get('BACKEND_URL','http://127.0.0.1:4000')
MATTER = os.environ.get('MATTER_ID','')


def safe_print(label, value):
    # never print full key
    if label == 'MINIMAX_API_KEY':
        if value:
            print(label+": [REDACTED] (present)")
        else:
            print(label+": (missing)")
    else:
        print(label+":", value)


if __name__ == '__main__':
    safe_print('MINIMAX_REGION', MINIMAX_REGION)
    safe_print('MINIMAX_BASE_URL', MINIMAX_BASE_URL)
    safe_print('MINIMAX_API_KEY', MINIMAX_KEY)

    url = f"{BACKEND_URL}/matters/{MATTER}/ai/suggest"
    headers = {'Content-Type':'application/json'}
    try:
        r = requests.post(url, headers=headers, json={})
        ok = r.status_code == 200
        print('status_code:', r.status_code)
        body = r.json() if r.content else {}
        print('provider:', body.get('provider'))
        print('model:', body.get('model'))
        if r.status_code == 401:
            print('Received 401: possible key/region mismatch or invalid key')
        elif not ok:
            print('Request failed, response:', r.text[:500])
        else:
            print('response_keys:', list(body.keys()))
    except Exception as e:
        print('Request error:', str(e))
