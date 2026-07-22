"""
MIRSAD — Multi-LLM Key Rotation Pool
=====================================
Resilient LLM infrastructure with circular-queue rotation across multiple
providers/keys. Prevents rate-limit failures during demos and judging.

Usage:
    from agents.llm_pool import llm_pool
    result = llm_pool.generate("Analyze this risk...", system="You are a geopolitical analyst.")
"""

import os
import re
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

logger = logging.getLogger("mirsad.llm_pool")

@dataclass
class LLMCredential:
    """A single LLM API key entry in the rotation pool."""
    provider: str          # "gemini" | "openai"
    model: str             # "gemini-2.0-flash" | "gpt-4o-mini" | etc.
    api_key: str           # loaded from env, never hardcoded
    daily_limit: int = 1500
    requests_today: int = 0
    last_reset: date = field(default_factory=date.today)
    status: str = "healthy"  # "healthy" | "rate_limited" | "error"
    cooldown_until: Optional[datetime] = None
    total_requests: int = 0
    last_error: Optional[str] = None

    def reset_if_new_day(self):
        """Reset daily counters if a new UTC day has started."""
        today = date.today()
        if self.last_reset < today:
            self.requests_today = 0
            self.last_reset = today
            if self.status in ("rate_limited", "error"):
                self.status = "healthy"
                self.cooldown_until = None
                logger.info(f"[LLMPool] Daily reset: {self.provider}/{self.model} → healthy")

    def is_available(self) -> bool:
        """Check if this credential can accept a request right now."""
        self.reset_if_new_day()
        if self.status != "healthy":
            # Check cooldown expiry
            if self.cooldown_until and datetime.utcnow() >= self.cooldown_until:
                self.status = "healthy"
                self.cooldown_until = None
                logger.info(f"[LLMPool] Cooldown expired: {self.provider}/{self.model} → healthy")
            else:
                return False
        if self.requests_today >= self.daily_limit:
            self.status = "rate_limited"
            logger.warning(f"[LLMPool] Daily limit reached: {self.provider}/{self.model} ({self.requests_today}/{self.daily_limit})")
            return False
        return True

    def mark_used(self):
        self.requests_today += 1
        self.total_requests += 1

    def mark_failed(self, error: str, cooldown_seconds: int = 60):
        self.status = "rate_limited" if "429" in str(error) or "rate" in str(error).lower() else "error"
        self.cooldown_until = datetime.utcnow() + timedelta(seconds=cooldown_seconds)
        self.last_error = str(error)[:200]
        logger.warning(f"[LLMPool] Marked {self.provider}/{self.model} as {self.status} for {cooldown_seconds}s: {self.last_error[:80]}")

    def to_status_dict(self) -> dict:
        return {
            "provider": self.provider,
            "model": self.model,
            "status": self.status,
            "requests_today": self.requests_today,
            "daily_limit": self.daily_limit,
            "total_requests": self.total_requests,
            "last_error": self.last_error,
            "key_preview": f"{self.api_key[:6]}...{self.api_key[-4:]}" if len(self.api_key) > 10 else "***"
        }


class LLMPool:
    """
    Circular-queue LLM key rotation pool.
    
    Loads credentials from environment variables matching the pattern:
        LLM_POOL_{N}_PROVIDER, LLM_POOL_{N}_MODEL, LLM_POOL_{N}_KEY, LLM_POOL_{N}_DAILY_LIMIT
    
    Falls back to GOOGLE_API_KEY if no pool entries are configured.
    """

    def __init__(self):
        self.credentials: List[LLMCredential] = []
        self.pointer: int = 0
        self._load_from_env()

    def _load_from_env(self):
        """Discover LLM_POOL_{N}_* environment variables and build the credential pool."""
        # Scan for numbered pool entries
        pool_indices = set()
        for key in os.environ:
            match = re.match(r"LLM_POOL_(\d+)_", key)
            if match:
                pool_indices.add(int(match.group(1)))

        for idx in sorted(pool_indices):
            provider = os.getenv(f"LLM_POOL_{idx}_PROVIDER", "").strip().lower()
            model = os.getenv(f"LLM_POOL_{idx}_MODEL", "").strip()
            api_key = os.getenv(f"LLM_POOL_{idx}_KEY", "").strip()
            daily_limit = int(os.getenv(f"LLM_POOL_{idx}_DAILY_LIMIT", "1500"))

            if provider and api_key:
                cred = LLMCredential(
                    provider=provider,
                    model=model or self._default_model(provider),
                    api_key=api_key,
                    daily_limit=daily_limit
                )
                self.credentials.append(cred)
                logger.info(f"[LLMPool] Loaded pool entry {idx}: {provider}/{model} (limit={daily_limit})")

        # Fallback: if no pool entries, use legacy GOOGLE_API_KEY
        if not self.credentials:
            legacy_key = os.getenv("GOOGLE_API_KEY", "").strip()
            if legacy_key:
                cred = LLMCredential(
                    provider="gemini",
                    model="gemini-2.0-flash",
                    api_key=legacy_key,
                    daily_limit=1500
                )
                self.credentials.append(cred)
                logger.info("[LLMPool] No pool entries found. Using legacy GOOGLE_API_KEY as sole entry.")

        if not self.credentials:
            logger.warning("[LLMPool] No LLM credentials configured. Will use mock responses.")

    def _default_model(self, provider: str) -> str:
        defaults = {
            "gemini": "gemini-2.0-flash",
            "openai": "gpt-4o-mini",
            "grok": "grok-3-mini",
            "xai": "grok-3-mini"
        }
        return defaults.get(provider, "unknown")

    def _next_available(self) -> Optional[LLMCredential]:
        """Advance the circular queue and return the next available credential."""
        if not self.credentials:
            return None
        n = len(self.credentials)
        for _ in range(n):
            cred = self.credentials[self.pointer % n]
            self.pointer = (self.pointer + 1) % n
            if cred.is_available():
                return cred
        return None  # All exhausted

    def _call_provider(self, cred: LLMCredential, prompt: str, system: str = "", max_tokens: int = 2048) -> str:
        """Dispatch to the correct provider adapter."""
        if cred.provider == "gemini":
            return self._call_gemini(cred, prompt, system, max_tokens)
        elif cred.provider == "openai":
            return self._call_openai(cred, prompt, system, max_tokens)
        elif cred.provider in ("grok", "xai"):
            return self._call_grok(cred, prompt, system, max_tokens)
        else:
            raise ValueError(f"Unsupported provider: {cred.provider}")

    def _call_gemini(self, cred: LLMCredential, prompt: str, system: str, max_tokens: int) -> str:
        """Call Google Gemini via langchain-google-genai."""
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = ChatGoogleGenerativeAI(
            model=cred.model,
            google_api_key=cred.api_key,
            temperature=0,
            max_output_tokens=max_tokens,
            convert_system_message_to_human=True,
            max_retries=0
        )
        messages = []
        if system:
            messages.append(SystemMessage(content=system))
        messages.append(HumanMessage(content=prompt))
        response = llm.invoke(messages)
        return response.content

    def _call_openai(self, cred: LLMCredential, prompt: str, system: str, max_tokens: int) -> str:
        """Call OpenAI-compatible API."""
        from openai import OpenAI

        client = OpenAI(api_key=cred.api_key)
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(
            model=cred.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0
        )
        return response.choices[0].message.content

    def _call_grok(self, cred: LLMCredential, prompt: str, system: str, max_tokens: int) -> str:
        """Call xAI Grok API (OpenAI-compatible with custom base URL)."""
        from openai import OpenAI

        client = OpenAI(
            api_key=cred.api_key,
            base_url="https://api.x.ai/v1"
        )
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(
            model=cred.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0
        )
        return response.choices[0].message.content

    def generate(self, prompt: str, system: str = "", max_tokens: int = 2048) -> Dict[str, Any]:
        """
        Generate text using the next available LLM in the rotation pool.
        
        Returns:
            {"text": str, "provider": str, "model": str, "key_index": int, "fallback": bool}
        """
        max_retries = len(self.credentials) if self.credentials else 1
        last_error = None

        for attempt in range(max_retries):
            cred = self._next_available()
            if not cred:
                break

            key_idx = self.credentials.index(cred)
            logger.debug(f"[LLMPool] Attempt {attempt+1}: Using {cred.provider}/{cred.model} (key #{key_idx}, {cred.requests_today}/{cred.daily_limit} used)")

            try:
                text = self._call_provider(cred, prompt, system, max_tokens)
                cred.mark_used()
                logger.info(f"[LLMPool] Success via {cred.provider}/{cred.model} (key #{key_idx})")
                return {
                    "text": text,
                    "provider": cred.provider,
                    "model": cred.model,
                    "key_index": key_idx,
                    "fallback": False
                }
            except Exception as e:
                last_error = str(e)
                cred.mark_failed(last_error)
                logger.warning(f"[LLMPool] Failed on {cred.provider}/{cred.model}: {last_error[:100]}. Rotating...")

        # All keys exhausted — return fallback signal
        logger.error(f"[LLMPool] All keys exhausted. Last error: {last_error}")
        return {
            "text": None,
            "provider": None,
            "model": None,
            "key_index": -1,
            "fallback": True,
            "error": last_error
        }

    def get_pool_status(self) -> List[Dict[str, Any]]:
        """Return current status of all credentials in the pool."""
        return [c.to_status_dict() for c in self.credentials]

    @property
    def pool_size(self) -> int:
        return len(self.credentials)

    @property
    def healthy_count(self) -> int:
        return sum(1 for c in self.credentials if c.is_available())


# Singleton pool instance
llm_pool = LLMPool()
