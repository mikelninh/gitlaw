#!/usr/bin/env python3
"""Run a pinned, permissively licensed four-task LegalBench reasoning baseline.

This intentionally scores a small open baseline model, not GitLaw's product model.
The purpose is to prove an executable reasoning-evaluation path on frozen external
labels. The slice contains only automatically scored classification tasks whose
LegalBench task pages declare CC-BY-4.0.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import time
from pathlib import Path
from typing import Any

import torch
from datasets import load_dataset
from huggingface_hub import HfApi
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

DATASET = "nguha/legalbench"
DATASET_REVISION = "daec8237410aa23e3faf4bc41ad8b3a7e1696826"
MODEL = "google/flan-t5-small"
TASKS = {
    "hearsay": "Classify whether the evidence described is hearsay. Answer exactly Yes or No.",
    "proa": "Determine whether the statutory text contains an explicit private right of action. Answer exactly Yes or No.",
    "overruling": "Determine whether the sentence from a judicial opinion overrules a previous case. Answer exactly Yes or No.",
    "ucc_v_common_law": "Determine whether the contract is governed by the UCC or the Common Law. Answer exactly UCC or Common Law.",
}


def resolve_model_revision(model_id: str) -> str:
    sha = str(HfApi().model_info(model_id).sha)
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise RuntimeError(f"model revision is not immutable SHA: {sha}")
    return sha


def row_text(row: dict[str, Any]) -> str:
    for key in ("text", "question", "input"):
        value = row.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    raise RuntimeError(f"row has no supported text field: {sorted(row)}")


def row_label(row: dict[str, Any]) -> str:
    for key in ("answer", "label"):
        value = row.get(key)
        if value is not None:
            return str(value).strip()
    raise RuntimeError(f"row has no supported label field: {sorted(row)}")


def normalize(task: str, value: str) -> str | None:
    s = re.sub(r"\s+", " ", value.strip().lower())
    if task == "ucc_v_common_law":
        if "common law" in s:
            return "Common Law"
        if re.search(r"\bucc\b", s):
            return "UCC"
        return None
    yes = re.search(r"\byes\b", s)
    no = re.search(r"\bno\b", s)
    if yes and not no:
        return "Yes"
    if no and not yes:
        return "No"
    if s in {"true", "1"}:
        return "Yes"
    if s in {"false", "0"}:
        return "No"
    return None


def digest_rows(rows: list[dict[str, Any]]) -> str:
    canonical = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def run_task(
    task: str,
    instruction: str,
    tokenizer: Any,
    model: Any,
    batch_size: int,
) -> dict[str, Any]:
    ds = load_dataset(DATASET, task, split="test", revision=DATASET_REVISION)
    rows = [dict(row) for row in ds]
    if not rows:
        raise RuntimeError(f"{task}: empty test split")

    texts = [row_text(row) for row in rows]
    gold_raw = [row_label(row) for row in rows]
    gold = [normalize(task, value) for value in gold_raw]
    if any(value is None for value in gold):
        bad = [(i, gold_raw[i]) for i, value in enumerate(gold) if value is None][:10]
        raise RuntimeError(f"{task}: unsupported gold labels: {bad}")

    prompts = [f"{instruction}\n\nInput: {text}\nAnswer:" for text in texts]
    predictions_raw: list[str] = []
    started = time.perf_counter()
    for start in range(0, len(prompts), batch_size):
        batch = prompts[start : start + batch_size]
        encoded = tokenizer(
            batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
        )
        with torch.inference_mode():
            generated = model.generate(
                **encoded,
                max_new_tokens=8,
                do_sample=False,
                num_beams=1,
            )
        predictions_raw.extend(tokenizer.batch_decode(generated, skip_special_tokens=True))
    elapsed = time.perf_counter() - started

    parsed = [normalize(task, value) for value in predictions_raw]
    correct = [pred == expected for pred, expected in zip(parsed, gold)]
    parseable = [pred is not None for pred in parsed]
    details = [
        {
            "index": i,
            "gold": gold[i],
            "prediction": parsed[i],
            "prediction_raw": predictions_raw[i],
            "correct": correct[i],
        }
        for i in range(len(rows))
    ]
    return {
        "task": task,
        "n_test": len(rows),
        "test_rows_sha256": digest_rows(rows),
        "accuracy": sum(correct) / len(rows),
        "parse_rate": sum(parseable) / len(rows),
        "seconds": elapsed,
        "details": details,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-out", type=Path, required=True)
    ap.add_argument("--batch-size", type=int, default=16)
    args = ap.parse_args()

    if args.batch_size < 1:
        raise SystemExit("batch size must be >=1")

    torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))
    model_revision = resolve_model_revision(MODEL)
    tokenizer = AutoTokenizer.from_pretrained(MODEL, revision=model_revision)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL, revision=model_revision)
    model.eval()

    results = [
        run_task(task, instruction, tokenizer, model, args.batch_size)
        for task, instruction in TASKS.items()
    ]
    total = sum(item["n_test"] for item in results)
    weighted_accuracy = sum(item["accuracy"] * item["n_test"] for item in results) / total
    macro_accuracy = sum(item["accuracy"] for item in results) / len(results)
    parse_rate = sum(item["parse_rate"] * item["n_test"] for item in results) / total

    out = {
        "schema_version": "1.0",
        "status": "OBSERVED_EXTERNAL_LEGALBENCH_OPEN_BASELINE_SLICE",
        "benchmark": "LegalBench",
        "dataset": DATASET,
        "dataset_revision": DATASET_REVISION,
        "model": MODEL,
        "model_revision": model_revision,
        "model_role": "OPEN_BASELINE_HARNESS_PROOF_NOT_GITLAW_PRODUCT_MODEL",
        "evaluation_mode": "ZERO_SHOT_DETERMINISTIC_GREEDY_GENERATION",
        "tasks": results,
        "summary": {
            "n_tasks": len(results),
            "n_test_total": total,
            "macro_accuracy": macro_accuracy,
            "weighted_accuracy": weighted_accuracy,
            "weighted_parse_rate": parse_rate,
        },
        "claim_boundary": (
            "This is a four-task English LegalBench baseline proving the external reasoning harness. "
            "It is not the full 162-task LegalBench suite, not GitLaw product-model quality, not German-law evidence, "
            "and not a lawyer-reviewed release score."
        ),
    }
    rendered = json.dumps(out, ensure_ascii=False, indent=2)
    print(json.dumps({**out, "tasks": [{k:v for k,v in x.items() if k != "details"} for x in results]}, ensure_ascii=False, indent=2))
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
