"""
MIRSAD — RAG Fact Store (ChromaDB Vector Store)
================================================
Provides fact-grounded retrieval for LLM analysis nodes.
Uses ChromaDB for persistent vector storage with sentence-transformer embeddings.

Usage:
    from agents.fact_store import fact_store
    facts = fact_store.retrieve("Hormuz strait risk shipping disruption", top_k=8)
"""

import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("mirsad.fact_store")

# Lazy imports to handle missing dependencies gracefully
_chromadb = None
_embedding_fn = None
_STORE_READY = False


def _lazy_init():
    """Lazy-initialize ChromaDB and embeddings on first use."""
    global _chromadb, _embedding_fn, _STORE_READY
    if _STORE_READY:
        return True
    try:
        import chromadb
        from chromadb.utils import embedding_functions
        _chromadb = chromadb
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _STORE_READY = True
        logger.info("[FactStore] ChromaDB + sentence-transformers initialized successfully")
        return True
    except ImportError as e:
        logger.warning(f"[FactStore] ChromaDB/sentence-transformers not available: {e}. Using fallback retrieval.")
        return False
    except Exception as e:
        logger.warning(f"[FactStore] Failed to initialize vector store: {e}. Using fallback retrieval.")
        return False


class FactStore:
    """
    ChromaDB-backed vector store for RAG fact retrieval.
    Falls back to keyword matching if ChromaDB is not available.
    """

    def __init__(self):
        self.collection = None
        self.facts_cache: List[Dict[str, Any]] = []
        self._initialized = False

    def initialize(self, facts: Optional[List[Dict[str, Any]]] = None):
        """
        Load fact corpus into vector store.
        
        Args:
            facts: List of fact dicts with keys: id, text, source, category, entity_id, date, confidence
        """
        if facts is None:
            from .fact_corpus import get_fact_corpus
            facts = get_fact_corpus()

        self.facts_cache = facts

        if _lazy_init():
            self._init_chromadb(facts)
        else:
            logger.info(f"[FactStore] Loaded {len(facts)} facts into keyword-fallback cache")

        self._initialized = True

    def _init_chromadb(self, facts: List[Dict[str, Any]]):
        """Initialize ChromaDB collection and upsert facts."""
        persist_dir = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
        os.makedirs(persist_dir, exist_ok=True)

        client = _chromadb.PersistentClient(path=persist_dir)
        self.collection = client.get_or_create_collection(
            name="mirsad_facts",
            embedding_function=_embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

        # Upsert all facts
        ids = [f["id"] for f in facts]
        documents = [f["text"] for f in facts]
        metadatas = [
            {
                "source": f.get("source", "unknown"),
                "category": f.get("category", "general"),
                "entity_id": f.get("entity_id", ""),
                "date": f.get("date", ""),
                "confidence": f.get("confidence", 0.5)
            }
            for f in facts
        ]

        self.collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
        logger.info(f"[FactStore] Upserted {len(facts)} facts into ChromaDB (persist: {persist_dir})")

    def retrieve(self, query: str, top_k: int = 8, category_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve most relevant facts for a query.
        
        Args:
            query: The search query (e.g., "Hormuz shipping disruption risk")
            top_k: Number of facts to retrieve
            category_filter: Optional category to filter by (e.g., "supplier", "spr", "route")
        
        Returns:
            List of dicts with keys: text, source, date, category, relevance_score
        """
        if not self._initialized:
            self.initialize()

        if self.collection is not None:
            return self._retrieve_chromadb(query, top_k, category_filter)
        else:
            return self._retrieve_fallback(query, top_k, category_filter)

    def _retrieve_chromadb(self, query: str, top_k: int, category_filter: Optional[str]) -> List[Dict[str, Any]]:
        """Vector similarity search via ChromaDB."""
        where_filter = None
        if category_filter:
            where_filter = {"category": category_filter}

        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=min(top_k, len(self.facts_cache)),
                where=where_filter
            )

            retrieved = []
            if results and results["documents"]:
                for i, doc in enumerate(results["documents"][0]):
                    meta = results["metadatas"][0][i] if results["metadatas"] else {}
                    distance = results["distances"][0][i] if results["distances"] else 1.0
                    relevance = max(0, 1 - distance)  # cosine distance to similarity

                    retrieved.append({
                        "text": doc,
                        "source": meta.get("source", "unknown"),
                        "date": meta.get("date", ""),
                        "category": meta.get("category", "general"),
                        "entity_id": meta.get("entity_id", ""),
                        "confidence": meta.get("confidence", 0.5),
                        "relevance_score": round(relevance, 4)
                    })

            logger.info(f"[FactStore] ChromaDB retrieved {len(retrieved)} facts for query: '{query[:60]}...'")
            return retrieved

        except Exception as e:
            logger.error(f"[FactStore] ChromaDB query failed: {e}. Falling back to keyword search.")
            return self._retrieve_fallback(query, top_k, category_filter)

    def _retrieve_fallback(self, query: str, top_k: int, category_filter: Optional[str]) -> List[Dict[str, Any]]:
        """Simple keyword-based fallback when ChromaDB is not available."""
        query_terms = set(query.lower().split())
        scored = []

        for fact in self.facts_cache:
            if category_filter and fact.get("category") != category_filter:
                continue

            text_lower = fact["text"].lower()
            # Count term matches
            matches = sum(1 for term in query_terms if term in text_lower)
            if matches > 0:
                score = matches / max(len(query_terms), 1)
                scored.append((score, fact))

        scored.sort(key=lambda x: -x[0])

        return [
            {
                "text": fact["text"],
                "source": fact.get("source", "unknown"),
                "date": fact.get("date", ""),
                "category": fact.get("category", "general"),
                "entity_id": fact.get("entity_id", ""),
                "confidence": fact.get("confidence", 0.5),
                "relevance_score": round(score, 4)
            }
            for score, fact in scored[:top_k]
        ]

    def upsert_fact(self, fact: Dict[str, Any]):
        """Add or update a single fact in the store."""
        self.facts_cache = [f for f in self.facts_cache if f["id"] != fact["id"]]
        self.facts_cache.append(fact)

        if self.collection is not None:
            self.collection.upsert(
                ids=[fact["id"]],
                documents=[fact["text"]],
                metadatas=[{
                    "source": fact.get("source", "unknown"),
                    "category": fact.get("category", "general"),
                    "entity_id": fact.get("entity_id", ""),
                    "date": fact.get("date", ""),
                    "confidence": fact.get("confidence", 0.5)
                }]
            )
            logger.info(f"[FactStore] Upserted fact: {fact['id']}")

    def get_stats(self) -> Dict[str, Any]:
        """Return store statistics."""
        return {
            "total_facts": len(self.facts_cache),
            "backend": "chromadb" if self.collection is not None else "keyword_fallback",
            "categories": list(set(f.get("category", "unknown") for f in self.facts_cache)),
            "initialized": self._initialized
        }


# Singleton fact store
fact_store = FactStore()
