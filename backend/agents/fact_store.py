"""
MIRSAD — High-Performance In-Memory BM25 Fact Store
===================================================
Provides fact-grounded retrieval for LLM analysis nodes.
Uses pure-Python Okapi BM25 scoring with domain term weighting.
Optimized for low-memory, zero-dependency production environments
(< 1MB RAM footprint vs 450MB+ for PyTorch/ChromaDB).

Usage:
    from agents.fact_store import fact_store
    facts = fact_store.retrieve("Hormuz strait risk shipping disruption", top_k=8)
"""

import math
import re
import logging
from collections import Counter
from typing import List, Dict, Any, Optional, Set

logger = logging.getLogger("mirsad.fact_store")

# Stop words to filter out common noise during tokenization
STOP_WORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any",
    "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below",
    "between", "both", "but", "by", "can", "can't", "cannot", "could", "couldn't", "did",
    "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few",
    "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having",
    "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in",
    "into", "is", "isn't", "it", "its", "itself", "let's", "me", "more", "most", "mustn't",
    "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "should", "shouldn't", "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to",
    "too", "under", "until", "up", "very", "was", "wasn't", "we", "were", "weren't", "what",
    "when", "where", "which", "while", "who", "whom", "why", "with", "won't", "would",
    "wouldn't", "you", "your", "yours", "yourself", "yourselves", "via", "per", "also"
}


def _tokenize(text: str) -> List[str]:
    """Tokenize and normalize text into clean lowercase terms."""
    if not text:
        return []
    words = re.findall(r"\b[a-zA-Z0-9_\-\.\/]+\b", text.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]


class BM25Index:
    """Lightweight in-memory Okapi BM25 index with k1=1.5 and b=0.75."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.docs: List[Dict[str, Any]] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_len: float = 0.0
        self.doc_term_freqs: List[Counter] = []
        self.doc_freqs: Counter = Counter()
        self.idf: Dict[str, float] = {}

    def build(self, documents: List[Dict[str, Any]]):
        self.docs = documents
        self.doc_lengths = []
        self.doc_term_freqs = []
        self.doc_freqs = Counter()
        total_len = 0

        for doc in documents:
            # Index document text with enriched weight on entity_id, category, and source
            text = f"{doc.get('text', '')} {doc.get('entity_id', '')} {doc.get('category', '')} {doc.get('source', '')}"
            tokens = _tokenize(text)
            tf = Counter(tokens)
            doc_len = len(tokens)

            self.doc_term_freqs.append(tf)
            self.doc_lengths.append(doc_len)
            total_len += doc_len

            for term in tf.keys():
                self.doc_freqs[term] += 1

        n_docs = len(documents)
        self.avg_doc_len = (total_len / n_docs) if n_docs > 0 else 1.0

        # Precompute Okapi BM25 IDF
        self.idf = {}
        for term, df in self.doc_freqs.items():
            self.idf[term] = math.log((n_docs - df + 0.5) / (df + 0.5) + 1.0)

    def search(self, query: str, top_k: int = 8, category_filter: Optional[str] = None) -> List[tuple[float, Dict[str, Any]]]:
        if not self.docs:
            return []

        query_tokens = _tokenize(query)
        if not query_tokens:
            matches = [d for d in self.docs if not category_filter or d.get("category") == category_filter]
            return [(0.5, d) for d in matches[:top_k]]

        scored = []
        for idx, (doc, tf, doc_len) in enumerate(zip(self.docs, self.doc_term_freqs, self.doc_lengths)):
            if category_filter and doc.get("category") != category_filter:
                continue

            score = 0.0
            len_norm = 1.0 - self.b + self.b * (doc_len / self.avg_doc_len)

            for term in query_tokens:
                if term in tf:
                    freq = tf[term]
                    idf = self.idf.get(term, 0.0)
                    tf_component = (freq * (self.k1 + 1.0)) / (freq + self.k1 * len_norm)
                    score += idf * tf_component

            # Bonus boost if query matches entity_id directly
            entity_id = (doc.get("entity_id") or "").lower()
            if entity_id and any(term in entity_id for term in query_tokens):
                score *= 1.25

            if score > 0:
                scored.append((score, doc))

        scored.sort(key=lambda x: -x[0])
        return scored[:top_k]


class FactStore:
    """
    Zero-dependency, pure-Python BM25 fact store for RAG fact retrieval.
    Replaces ChromaDB + PyTorch for memory-constrained environments (<512MB RAM).
    """

    def __init__(self):
        self.facts_cache: List[Dict[str, Any]] = []
        self._index = BM25Index()
        self._initialized = False

    def initialize(self, facts: Optional[List[Dict[str, Any]]] = None):
        """
        Load fact corpus into the in-memory BM25 index.
        """
        if facts is None:
            from .fact_corpus import get_fact_corpus
            facts = get_fact_corpus()

        self.facts_cache = list(facts)
        self._index.build(self.facts_cache)
        self._initialized = True
        logger.info(f"[FactStore] Initialized BM25 index with {len(self.facts_cache)} facts (< 1MB RAM)")

    def retrieve(self, query: str, top_k: int = 8, category_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve most relevant facts for a query.
        
        Args:
            query: The search query (e.g. "Hormuz shipping disruption risk")
            top_k: Number of facts to retrieve
            category_filter: Optional category to filter by (e.g., "supplier", "spr", "route")
        
        Returns:
            List of dicts with keys: text, source, date, category, entity_id, confidence, relevance_score
        """
        if not self._initialized:
            self.initialize()

        raw_results = self._index.search(query, top_k=top_k, category_filter=category_filter)
        if not raw_results:
            return []

        max_score = max(r[0] for r in raw_results) if raw_results else 1.0
        if max_score <= 0:
            max_score = 1.0

        retrieved = []
        for score, fact in raw_results:
            # Normalize relevance to 0.1 - 0.99 range
            normalized = round(min(0.99, max(0.1, score / (max_score * 1.15))), 4)
            retrieved.append({
                "text": fact.get("text", ""),
                "source": fact.get("source", "unknown"),
                "date": fact.get("date", ""),
                "category": fact.get("category", "general"),
                "entity_id": fact.get("entity_id", ""),
                "confidence": fact.get("confidence", 0.5),
                "relevance_score": normalized
            })

        logger.info(f"[FactStore] BM25 retrieved {len(retrieved)} facts for query: '{query[:60]}...'")
        return retrieved

    def upsert_fact(self, fact: Dict[str, Any]):
        """Add or update a single fact in the store."""
        self.facts_cache = [f for f in self.facts_cache if f.get("id") != fact.get("id")]
        self.facts_cache.append(fact)
        self._index.build(self.facts_cache)
        logger.info(f"[FactStore] Upserted fact: {fact.get('id')}")

    def get_stats(self) -> Dict[str, Any]:
        """Return store statistics."""
        return {
            "total_facts": len(self.facts_cache),
            "backend": "bm25_fast_engine",
            "categories": sorted(list(set(f.get("category", "unknown") for f in self.facts_cache))),
            "initialized": self._initialized
        }


# Singleton fact store
fact_store = FactStore()
