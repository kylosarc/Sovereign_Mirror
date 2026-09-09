#!/usr/bin/env python3
"""
free_agents.py - Multi-agent fallacy comparison service

Queries multiple free LLM APIs concurrently to validate RoBERTa detections.
Falls back to dynamically fetching available free models from OpenRouter if
all preferred models fail.

Endpoints:
  POST /validate - Validate statement with all agents concurrently
  GET  /health   - Health check with agent configuration status
"""

import os
import json
import re
import argparse
import urllib.request
import urllib.error
from typing import Optional
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, jsonify

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai/chat/completions"

# Preferred free models - queried serially with fallback
PREFERRED_FREE_MODELS = [
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

SYSTEM_PROMPT = """You are a logical fallacy detection expert. Analyze the statement and determine if it contains a logical fallacy.

Supported fallacies:
- ad_hominem: Attack on the person rather than the argument
- false_dilemma: Presenting only two options when more exist
- appeal_to_emotion: Using emotions instead of logic
- false_causality: Assuming cause when only correlation exists
- circular_reasoning: Argument repeats itself as proof
- hasty_generalization: Making broad conclusions from limited data
- strawman: Misrepresenting opponent's position
- slippery_slope: Small step leads to extreme conclusion

Respond ONLY with valid JSON:
{"detected": true/false, "fallacy_type": "type or null", "confidence": 0.0-1.0, "reasoning": "brief explanation"}"""

app = Flask(__name__)


def _get_openrouter_key() -> str:
    return (
        os.environ.get("OPENROUTER_API_KEY", "")
        or os.environ.get("FREE_OPENROUTER", "")
        or os.environ.get("GEN_OPENROUTER", "")
    )


def _get_groq_key() -> str:
    return os.environ.get("GROQ_API_KEY", "")


@dataclass
class AgentResult:
    agent: str
    model: str
    detected: bool
    fallacy_type: Optional[str]
    confidence: float
    reasoning: str
    error: Optional[str] = None


def _parse_llm_json(content: str) -> Optional[dict]:
    """Extract JSON from LLM response, handling markdown code blocks."""
    content = content.strip()
    # Strip markdown code blocks
    content = re.sub(r"```(?:json)?\s*", "", content).strip("` \n")
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        match = re.search(r"\{[^{}]+\}", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return None


def _query_llm_provider(
    provider: str,
    url: str,
    model: str,
    text: str,
    key: str,
    timeout: int = 10,
) -> AgentResult:
    """Generic LLM query function with curl fallback for WSL DNS issues."""
    payload = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Analyze this statement for logical fallacies: {text}",
                },
            ],
            "temperature": 0.1,
            "max_tokens": 500,
            "stream": False,
        }
    )

    # Try urllib first, fall back to curl subprocess (WSL DNS workaround)
    response_text = None

    try:
        req = urllib.request.Request(
            url,
            data=payload.encode("utf-8"),
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            response_text = response.read().decode("utf-8")
    except Exception:
        # Fallback: use curl subprocess (works even when WSL urllib DNS fails)
        try:
            import subprocess

            result = subprocess.run(
                [
                    "curl",
                    "-s",
                    "--max-time",
                    str(timeout + 2),
                    "-X",
                    "POST",
                    url,
                    "-H",
                    f"Authorization: Bearer {key}",
                    "-H",
                    "Content-Type: application/json",
                    "-d",
                    payload,
                ],
                capture_output=True,
                text=True,
                timeout=timeout + 4,
            )
            if result.returncode == 0 and result.stdout:
                response_text = result.stdout
        except Exception as curl_err:
            return AgentResult(
                agent=provider,
                model=model,
                detected=False,
                fallacy_type=None,
                confidence=0.0,
                reasoning="",
                error=f"Both urllib and curl failed: {str(curl_err)[:80]}",
            )

    if not response_text:
        return AgentResult(
            agent=provider,
            model=model,
            detected=False,
            fallacy_type=None,
            confidence=0.0,
            reasoning="",
            error="Empty response",
        )

    try:
        data = json.loads(response_text)
        if "error" in data:
            return AgentResult(
                agent=provider,
                model=model,
                detected=False,
                fallacy_type=None,
                confidence=0.0,
                reasoning="",
                error=str(data["error"])[:100],
            )
        message = data["choices"][0]["message"]
        content = message.get("content") or ""
        if not content:
            reasoning_text = message.get("reasoning") or ""
            json_match = re.search(
                r'\{[^{}]*"detected"[^{}]*\}', reasoning_text, re.DOTALL
            )
            if json_match:
                content = json_match.group()
            else:
                return AgentResult(
                    agent=provider,
                    model=model,
                    detected=False,
                    fallacy_type=None,
                    confidence=0.0,
                    reasoning=reasoning_text[:200] if reasoning_text else "",
                    error="Model returned only reasoning with no JSON output - increase max_tokens",
                )
        result = _parse_llm_json(content)
        if result:
            return AgentResult(
                agent=provider,
                model=model,
                detected=bool(result.get("detected", False)),
                fallacy_type=result.get("fallacy_type"),
                confidence=float(result.get("confidence", 0.0)),
                reasoning=result.get("reasoning", ""),
            )
        return AgentResult(
            agent=provider,
            model=model,
            detected=False,
            fallacy_type=None,
            confidence=0.0,
            reasoning="",
            error="Could not parse JSON response",
        )
    except Exception as e:
        return AgentResult(
            agent=provider,
            model=model,
            detected=False,
            fallacy_type=None,
            confidence=0.0,
            reasoning="",
            error=str(e)[:100],
        )


def _query_openrouter_model(model: str, text: str, key: str) -> AgentResult:
    """Query a single OpenRouter model."""
    return _query_llm_provider("openrouter", OPENROUTER_URL, model, text, key)


def _fetch_dynamic_free_models(key: str, limit: int = 6) -> list[str]:
    """Fetch available free models from OpenRouter API."""
    try:
        req = urllib.request.Request(
            OPENROUTER_MODELS_URL,
            headers={"Authorization": f"Bearer {key}"},
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            models = data.get("data", [])
            free_models = [
                m["id"]
                for m in models
                if ":free" in m.get("id", "") and m.get("context_length", 0) >= 4096
            ]
            return free_models[:limit]
    except Exception:
        return []


def query_openrouter_concurrent(text: str) -> list[AgentResult]:
    """Query preferred free models with fallback. Returns first successful result."""
    key = _get_openrouter_key()
    if not key:
        return [
            AgentResult(
                agent="openrouter",
                model="none",
                detected=False,
                fallacy_type=None,
                confidence=0.0,
                reasoning="",
                error="OPENROUTER_API_KEY not set",
            )
        ]

    for model in PREFERRED_FREE_MODELS:
        result = _query_openrouter_model(model, text, key)
        # Return on success (no error) or if this is the last model
        if not result.error or model == PREFERRED_FREE_MODELS[-1]:
            return [result]

    # Should not reach here, but return last result
    return [result]


def query_groq(text: str) -> AgentResult:
    """Query Groq API via curl (avoids Cloudflare 403 on Python urllib User-Agent)."""
    key = _get_groq_key()
    if not key:
        return AgentResult(
            agent="groq",
            model="llama-3.1-8b-instant",
            detected=False,
            fallacy_type=None,
            confidence=0.0,
            reasoning="",
            error="GROQ_API_KEY not set",
        )
    return _query_llm_provider("groq", GROQ_URL, "llama-3.1-8b-instant", text, key)


def query_deepinfra(text: str) -> AgentResult:
    """Query DeepInfra API - fast, cheap, reliable."""
    key = os.environ.get("DEEPINFRA_API_KEY", "")
    if not key:
        return AgentResult(
            agent="deepinfra",
            model="meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
            detected=False,
            fallacy_type=None,
            confidence=0.0,
            reasoning="",
            error="DEEPINFRA_API_KEY not set",
        )
    return _query_llm_provider(
        "deepinfra",
        DEEPINFRA_URL,
        "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        text,
        key,
    )


def compute_consensus(results: list[AgentResult]) -> dict:
    """Compute consensus across agent results."""
    total = len(results)
    valid = [r for r in results if not r.error]

    if not valid:
        return {
            "detected": False,
            "confidence": 0.0,
            "agreement_rate": 0.0,
            "agents_queried": total,
            "agents_detected": 0,
            "fallacy_type": None,
            "reasoning": "All agents failed or unavailable",
        }

    detections = [r for r in valid if r.detected]
    agreement_rate = len(detections) / len(valid)
    avg_confidence = (
        sum(r.confidence for r in detections) / len(detections) if detections else 0.0
    )

    fallacy_types = [r.fallacy_type for r in detections if r.fallacy_type]
    top_fallacy = (
        max(set(fallacy_types), key=fallacy_types.count) if fallacy_types else None
    )

    return {
        "detected": agreement_rate >= 0.5,
        "confidence": avg_confidence,
        "agreement_rate": round(agreement_rate, 2),
        "agents_queried": len(valid),
        "agents_detected": len(detections),
        "fallacy_type": top_fallacy,
        "reasoning": detections[0].reasoning
        if detections
        else "No fallacy detected by any agent",
    }


@app.route("/validate", methods=["POST"])
def validate():
    """Validate statement with all agents concurrently."""
    data = request.get_json() or {}
    text = data.get("text", "")

    if len(text.strip()) < 5:
        return jsonify({"error": "Text too short"}), 400

    # Run all three agents concurrently
    with ThreadPoolExecutor(max_workers=3) as executor:
        groq_future = executor.submit(query_groq, text)
        deepinfra_future = executor.submit(query_deepinfra, text)
        openrouter_future = executor.submit(query_openrouter_concurrent, text)

    groq_result = groq_future.result()
    deepinfra_result = deepinfra_future.result()
    openrouter_results = openrouter_future.result()

    all_results = [groq_result, deepinfra_result] + openrouter_results
    consensus = compute_consensus(all_results)

    return jsonify(
        {
            "text": text,
            "consensus": consensus,
            "agents": {
                "groq": {
                    "detected": groq_result.detected,
                    "model": groq_result.model,
                    "fallacy_type": groq_result.fallacy_type,
                    "confidence": groq_result.confidence,
                    "reasoning": groq_result.reasoning,
                    "error": groq_result.error,
                },
                "openrouter": [
                    {
                        "detected": r.detected,
                        "model": r.model,
                        "fallacy_type": r.fallacy_type,
                        "confidence": r.confidence,
                        "reasoning": r.reasoning,
                        "error": r.error,
                    }
                    for r in openrouter_results
                ],
            },
        }
    )


@app.route("/health", methods=["GET"])
def health():
    """Health check."""
    return jsonify(
        {
            "status": "ok",
            "groq_configured": bool(_get_groq_key()),
            "openrouter_configured": bool(_get_openrouter_key()),
            "preferred_models": PREFERRED_FREE_MODELS,
        }
    )


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


def main():
    parser = argparse.ArgumentParser(description="Free agents fallacy validation")
    parser.add_argument("--text", help="Statement to validate")
    parser.add_argument("--port", type=int, default=5003, help="Port to run server")
    args = parser.parse_args()

    if args.text:
        print(f"Analyzing: {args.text}\n")

        with ThreadPoolExecutor(max_workers=3) as executor:
            groq_future = executor.submit(query_groq, args.text)
            deepinfra_future = executor.submit(query_deepinfra, args.text)
            openrouter_future = executor.submit(query_openrouter_concurrent, args.text)

        groq_result = groq_future.result()
        deepinfra_result = deepinfra_future.result()
        openrouter_results = openrouter_future.result()

        print("--- Groq ---")
        print(f"Detected: {groq_result.detected}")
        print(f"Type: {groq_result.fallacy_type}")
        print(f"Confidence: {groq_result.confidence}")
        print(f"Reasoning: {groq_result.reasoning}")
        if groq_result.error:
            print(f"Error: {groq_result.error}")

        print("\n--- DeepInfra ---")
        print(f"Detected: {deepinfra_result.detected}")
        print(f"Type: {deepinfra_result.fallacy_type}")
        print(f"Confidence: {deepinfra_result.confidence}")
        print(f"Reasoning: {deepinfra_result.reasoning}")
        if deepinfra_result.error:
            print(f"Error: {deepinfra_result.error}")

        print("\n--- OpenRouter ---")
        for r in openrouter_results:
            print(f"\n  [{r.model}]")
            print(f"  Detected: {r.detected}")
            print(f"  Type: {r.fallacy_type}")
            print(f"  Confidence: {r.confidence}")
            print(f"  Reasoning: {r.reasoning}")
            if r.error:
                print(f"  Error: {r.error}")

        consensus = compute_consensus(
            [groq_result, deepinfra_result] + openrouter_results
        )
        print(f"\n--- CONSENSUS ---")
        print(f"Detected: {consensus['detected']}")
        print(
            f"Agreement: {consensus['agents_detected']}/{consensus['agents_queried']} agents"
        )
        print(f"Confidence: {consensus['confidence']:.2f}")
        print(f"Fallacy: {consensus['fallacy_type']}")
    else:
        print(f"Starting Free Agents server on port {args.port}")
        print("Endpoints:")
        print("  POST /validate - Validate statement with all agents")
        print("  GET  /health   - Health check")
        print(f"\nGroq configured: {bool(_get_groq_key())}")
        print(f"DeepInfra configured: {bool(os.environ.get('DEEPINFRA_API_KEY'))}")
        print(f"OpenRouter configured: {bool(_get_openrouter_key())}")
        print(f"Preferred models: {len(PREFERRED_FREE_MODELS)}")
        app.run(host="0.0.0.0", port=args.port, debug=False)


if __name__ == "__main__":
    main()
