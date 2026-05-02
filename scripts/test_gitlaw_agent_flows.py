#!/usr/bin/env python3
import base64
import json
import sys
import urllib.error
import urllib.request

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "https://gitlaw-xi.vercel.app"
INVITE = sys.argv[2] if len(sys.argv) > 2 else "BETA-NGUYEN"


def request(path, method="GET", data=None, token=None):
    url = BASE_URL.rstrip("/") + path
    body = None
    headers = {}
    if data is not None:
      body = json.dumps(data).encode("utf-8")
      headers["Content-Type"] = "application/json"
    if token:
      headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
      with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
        payload = None
        if raw:
          try:
            payload = json.loads(raw.decode("utf-8"))
          except Exception:
            payload = raw.decode("utf-8", errors="replace")
        return resp.status, payload
    except urllib.error.HTTPError as e:
      raw = e.read()
      payload = None
      if raw:
        try:
          payload = json.loads(raw.decode("utf-8"))
        except Exception:
          payload = raw.decode("utf-8", errors="replace")
      return e.code, payload


def print_result(name, status, detail):
    print(f"[{status}] {name}: {detail}")


def main():
    total = {"PASS": 0, "BETA": 0, "FAIL": 0}

    code, payload = request("/api/pro/session", method="POST", data={"invite": INVITE})
    if code == 200 and isinstance(payload, dict) and payload.get("token") and payload.get("access", {}).get("tenantId"):
        token = payload["token"]
        tenant = payload["access"]["tenantId"]
        print_result("session_exchange", "PASS", f"tenant={tenant} role={payload['access'].get('role')}")
        total["PASS"] += 1
    else:
        print_result("session_exchange", "FAIL", f"HTTP {code} payload={payload}")
        total["FAIL"] += 1
        return

    code, payload = request("/api/pro/session", token=token)
    if code == 200 and isinstance(payload, dict) and payload.get("access", {}).get("tenantId") == tenant:
        print_result("session_resume", "PASS", f"tenant={tenant}")
        total["PASS"] += 1
    else:
        print_result("session_resume", "FAIL", f"HTTP {code} payload={payload}")
        total["FAIL"] += 1

    code, payload = request("/api/ask-pro", method="POST", data={"question": "Testfrage ohne Session"})
    if code == 401:
        print_result("research_unauthorized_guard", "PASS", "HTTP 401 without bearer session")
        total["PASS"] += 1
    else:
        print_result("research_unauthorized_guard", "FAIL", f"expected 401, got {code}")
        total["FAIL"] += 1

    code, payload = request(
        "/api/ask-pro",
        method="POST",
        token=token,
        data={"question": "Welche Verjährungsfristen gelten für Schadensersatzansprüche aus § 823 BGB?"},
    )
    if code == 200 and isinstance(payload, dict) and isinstance(payload.get("antwort"), str) and isinstance(payload.get("zitate"), list):
        print_result("research_structured_output", "PASS", f"zitate={len(payload.get('zitate', []))}")
        total["PASS"] += 1
    else:
        print_result("research_structured_output", "FAIL", f"HTTP {code} payload={payload}")
        total["FAIL"] += 1

    snapshot = {
        "version": "1",
        "exportedAt": "2026-05-02T00:00:00.000Z",
        "settings": {"name": "Testkanzlei", "address": "", "contact": "", "anwaltName": "Test"},
        "cases": [],
        "research": [],
        "letters": [],
        "audit": [],
        "intakes": [],
        "customTemplates": [],
        "paragraphNotes": [],
    }
    code, payload = request("/api/pro/sync", method="PUT", token=token, data=snapshot)
    if code == 200 and isinstance(payload, dict) and payload.get("ok") is True:
        print_result("tenant_sync_write", "PASS", f"ttlDays={payload.get('ttlDays')}")
        total["PASS"] += 1
    else:
        print_result("tenant_sync_write", "FAIL", f"HTTP {code} payload={payload}")
        total["FAIL"] += 1

    code, payload = request("/api/pro/sync", token=token)
    if code == 200 and isinstance(payload, dict) and payload.get("tenantId") == tenant:
        print_result("tenant_sync_read", "PASS", f"tenant={payload.get('tenantId')}")
        total["PASS"] += 1
    else:
        print_result("tenant_sync_read", "FAIL", f"HTTP {code} payload={payload}")
        total["FAIL"] += 1

    sample_bytes = b"GitLaw beta upload test"
    code, payload = request(
        "/api/pro/upload",
        method="POST",
        token=token,
        data={
            "caseId": "case-test",
            "fileName": "test.txt",
            "mimeType": "text/plain",
            "sizeBytes": len(sample_bytes),
            "base64": base64.b64encode(sample_bytes).decode("ascii"),
        },
    )
    if code == 200 and isinstance(payload, dict) and payload.get("documentId"):
        print_result("server_document_vault", "PASS", f"documentId={payload.get('documentId')}")
        total["PASS"] += 1
    else:
        print_result("server_document_vault", "FAIL", f"HTTP {code} payload={payload}")
        total["FAIL"] += 1

    code, payload = request(
        "/api/ocr",
        method="POST",
        token=token,
        data={
            "caseId": "case-test",
            "attachmentInternalName": "test_internal",
            "mode": "ocr",
            "sourceLanguage": "vi",
            "targetLanguage": "de",
        },
    )
    if code == 501 and isinstance(payload, dict) and payload.get("status") == "not_enabled":
        print_result("ocr_beta_stub", "BETA", payload.get("message"))
        total["BETA"] += 1
    else:
        print_result("ocr_beta_stub", "FAIL", f"expected 501/not_enabled, got {code} payload={payload}")
        total["FAIL"] += 1

    print("\nSummary")
    print(json.dumps(total, indent=2))


if __name__ == "__main__":
    main()
