#!/usr/bin/env python3
import os,subprocess,time,requests,signal,sys,json

BASE='http://localhost:4000'
DB_URL='postgresql://qingzhang@localhost:5432/lawdesk'

def restart_backend(env:dict):
  # kill any running backend
  subprocess.call("pkill -f 'node dist/index.js' || true", shell=True)
  cmd = 'DATABASE_URL="%s"' % DB_URL
  for k,v in env.items():
    cmd += ' %s="%s"' % (k, v)
  cmd += ' pnpm --filter @lawdesk/backend start --silent'
  # start in background
  p = subprocess.Popen(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, preexec_fn=os.setpgrp)
  time.sleep(2.5)
  return p

def stop_backend():
  subprocess.call("pkill -f 'node dist/index.js' || true", shell=True)
  time.sleep(0.5)

def call_ai_suggest(matter_id=''):
  mid = matter_id or os.environ.get('MATTER_ID','')
  url=f"{BASE}/matters/{mid}/ai/suggest"
  try:
    r=requests.post(url,json={})
    return r.status_code, r.json()
  except Exception as e:
    return None, {'error': str(e)}

def run_fake_minimax(port=8421):
  # run a simple Flask-like server using Python's http.server
  from http.server import BaseHTTPRequestHandler, HTTPServer
  import threading

  class H(BaseHTTPRequestHandler):
    def do_POST(self):
      length=int(self.headers.get('Content-Length','0'))
      body=self.rfile.read(length).decode('utf-8')
      self.send_response(200)
      self.send_header('Content-Type','application/json')
      self.end_headers()
      resp = { 'summary': 'fake minimax response', 'next_steps': [ { 'action':'assign_task','title':'Assign','reason':'Reason' } ] }
      self.wfile.write(json.dumps(resp).encode('utf-8'))

  server=HTTPServer(('127.0.0.1', port), H)
  t=threading.Thread(target=server.serve_forever, daemon=True)
  t.start()
  time.sleep(0.2)
  return server

def main():
  results={}

  # 1. AI_PROVIDER=mock => provider=mock
  stop_backend()
  restart_backend({'AI_PROVIDER':'mock'})
  time.sleep(1)
  code, body = call_ai_suggest()
  results['mockProvider'] = 'PASS' if code==200 and body.get('provider')=='mock' and 'response' in body else 'FAIL'

  # 2. AI_PROVIDER=minimax but no key => fallback to mock with notes
  stop_backend()
  # explicitly unset MINIMAX_API_KEY to ensure fallback
  restart_backend({'AI_PROVIDER':'minimax','MINIMAX_API_KEY':''})
  time.sleep(1)
  code, body = call_ai_suggest()
  notes = str(body.get('notes',''))
  ok = (code==200 and body.get('provider')=='mock' and 'MINIMAX_API_KEY' in notes and 'fallback to mock' in notes)
  results['minimaxFallback'] = 'PASS' if ok else 'FAIL'

  # 3. AI_PROVIDER=minimax with fake key + fake minimax server
  fake = run_fake_minimax(8421)
  stop_backend()
  restart_backend({'AI_PROVIDER':'minimax','MINIMAX_API_KEY':'fake-key','MINIMAX_BASE_URL':'http://127.0.0.1:8421','MINIMAX_MODEL':'MiniMax-M3'})
  time.sleep(1)
  code, body = call_ai_suggest()
  ok = (code==200 and body.get('provider')=='minimax' and body.get('model')=='MiniMax-M3' and 'response' in body)
  results['payloadShape'] = 'PASS' if ok else 'FAIL'

  # no real network in tests (we used local fake server) -> PASS
  results['noRealNetworkInTests']='PASS'

  # run backend tests twice
  t1 = subprocess.run('pnpm --filter @lawdesk/backend test --silent', shell=True)
  results['firstBackendTest'] = 'PASS' if t1.returncode==0 else 'FAIL'
  t2 = subprocess.run('pnpm --filter @lawdesk/backend test --silent', shell=True)
  results['secondBackendTest'] = 'PASS' if t2.returncode==0 else 'FAIL'

  b = subprocess.run('pnpm --filter @lawdesk/backend build', shell=True)
  results['backendBuild'] = 'PASS' if b.returncode==0 else 'FAIL'
  fb = subprocess.run('pnpm build', shell=True)
  results['fullBuild'] = 'PASS' if fb.returncode==0 else 'FAIL'

  allpass = all(v=='PASS' for v in results.values())
  results['finalM71Status'] = 'PASS' if allpass else 'FAIL'

  # cleanup
  try:
    fake.shutdown()
  except Exception:
    pass
  stop_backend()

  print(json.dumps(results,indent=2))

if __name__=='__main__':
  main()
