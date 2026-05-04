import re
from collections import Counter
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from transformers import pipeline

from app.schemas.feedback_insights import (
    FeedbackInsightResponse,
    FeedbackTopic,
    SentimentDistribution
)

from sklearn.feature_extraction.text import CountVectorizer


RAW_DIR = Path("datasets/raw/capevents")

SENTIMENT_MODEL_NAME = "cardiffnlp/twitter-xlm-roberta-base-sentiment-multilingual"
EMBEDDING_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

OLLAMA_CHAT_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "qwen3:0.6b"
OLLAMA_TIMEOUT_SECONDS = 60


FRENCH_STOPWORDS = {
    "le", "la", "les", "un", "une", "des", "du", "de", "d", "et", "ou",
    "en", "au", "aux", "avec", "pour", "par", "dans", "sur", "ce", "cet",
    "cette", "ces", "est", "sont", "été", "etre", "être", "plus", "moins",
    "très", "tres", "bien", "bon", "bonne", "mais", "donc", "comme",
    "session", "événement", "evenement", "catégorie", "categorie", "point",
    "référence", "reference", "édition", "edition",

    "trop", "peu", "sujet", "correctement", "directement", "davantage",
    "souhaités", "souhaites", "format", "utile", "correcte", "clair",
    "claire", "excellente", "satisfaisante"
}


class FeedbackInsightsService:
    def __init__(self) -> None:
        self.feedbacks = self._read_csv(RAW_DIR / "event_feedbacks.csv")
        self.events = self._read_csv(RAW_DIR / "events.csv")

        self.sentiment_pipeline = None
        self.embedding_model = None

        self._prepare_dataframes()

    def _read_csv(self, path: Path) -> pd.DataFrame:
        if not path.exists():
            return pd.DataFrame()
        return pd.read_csv(path)

    def _prepare_dataframes(self) -> None:
        if not self.feedbacks.empty:
            self.feedbacks["event_id"] = self.feedbacks["event_id"].fillna("").astype(str)
            self.feedbacks["comment"] = self.feedbacks["comment"].fillna("").astype(str)
            self.feedbacks["rating"] = pd.to_numeric(
                self.feedbacks["rating"],
                errors="coerce"
            ).fillna(0)

        if not self.events.empty:
            self.events["id"] = self.events["id"].fillna("").astype(str)
            self.events["title"] = self.events["title"].fillna("").astype(str)

    def _get_sentiment_pipeline(self):
        if self.sentiment_pipeline is None:
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model=SENTIMENT_MODEL_NAME,
                tokenizer=SENTIMENT_MODEL_NAME
            )
        return self.sentiment_pipeline

    def _get_embedding_model(self):
        if self.embedding_model is None:
            self.embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        return self.embedding_model

    def get_event_feedback_insights(self, event_id: str) -> FeedbackInsightResponse:
        event_id = str(event_id).strip()
        event_title = self._get_event_title(event_id)

        if self.feedbacks.empty:
            return self._empty_response(event_id, event_title, "Aucun fichier feedback disponible.")

        event_feedbacks = self.feedbacks[
            self.feedbacks["event_id"].astype(str) == event_id
        ].copy()

        event_feedbacks = event_feedbacks[
            event_feedbacks["comment"].astype(str).str.strip() != ""
        ].copy()

        if event_feedbacks.empty:
            return self._empty_response(
                event_id,
                event_title,
                "Aucun feedback textuel disponible pour cet événement."
            )

        comments = event_feedbacks["comment"].astype(str).tolist()
        ratings = event_feedbacks["rating"].tolist()
        cleaned_comments = [self._clean_for_nlp(comment) for comment in comments]

        sentiment_results = self._analyze_sentiments(cleaned_comments)
        distribution = self._build_sentiment_distribution(sentiment_results)
        global_sentiment, sentiment_score = self._compute_global_sentiment(distribution)

        topics = self._extract_topics(cleaned_comments)
        keywords = self._extract_keywords_from_topics(topics)

        strengths = self._extract_strengths(event_feedbacks, sentiment_results)
        improvements = self._extract_improvements(event_feedbacks, sentiment_results)

        average_rating = float(pd.Series(ratings).mean()) if ratings else 0.0

        template_summary = self._build_template_summary(
            feedback_count=len(comments),
            average_rating=average_rating,
            global_sentiment=global_sentiment,
            keywords=keywords,
            strengths=strengths,
            improvements=improvements
        )

        summary, qwen_used, summary_source = self._build_qwen_summary(
            event_title=event_title,
            feedback_count=len(comments),
            average_rating=average_rating,
            global_sentiment=global_sentiment,
            distribution=distribution,
            topics=topics,
            strengths=strengths,
            improvements=improvements,
            fallback_summary=template_summary
        )

        return FeedbackInsightResponse(
            event_id=event_id,
            event_title=event_title,
            feedback_count=len(comments),
            average_rating=round(average_rating, 2),
            global_sentiment=global_sentiment,
            sentiment_score=round(sentiment_score, 3),
            sentiment_distribution=SentimentDistribution(**distribution),
            topics=topics,
            keywords=keywords,
            strengths=strengths,
            improvements=improvements,
            summary=summary,
            qwen_used=qwen_used,
            summary_source=summary_source,
            model_info={
                "sentiment": SENTIMENT_MODEL_NAME,
                "topics": "BERTopic",
                "embeddings": EMBEDDING_MODEL_NAME,
                "summary": "qwen3:0.6b"
            }
        )

    def _analyze_sentiments(self, comments: list[str]) -> list[dict[str, Any]]:
        classifier = self._get_sentiment_pipeline()
        truncated_comments = [self._truncate_text(comment) for comment in comments]

        raw_results = classifier(truncated_comments, truncation=True)

        results = []
        for comment, result in zip(comments, raw_results):
            label = str(result.get("label", "neutral"))
            confidence = float(result.get("score", 0))
            sentiment = self._map_sentiment_label(label)

            results.append({
                "comment": comment,
                "label": label,
                "sentiment": sentiment,
                "confidence": confidence
            })

        return results

    def _map_sentiment_label(self, label: str) -> str:
        normalized = label.lower()

        if "negative" in normalized or normalized == "label_0":
            return "negative"

        if "neutral" in normalized or normalized == "label_1":
            return "neutral"

        if "positive" in normalized or normalized == "label_2":
            return "positive"

        return "neutral"

    def _build_sentiment_distribution(self, sentiment_results: list[dict[str, Any]]) -> dict[str, int]:
        counter = Counter(item["sentiment"] for item in sentiment_results)

        return {
            "positive": int(counter.get("positive", 0)),
            "neutral": int(counter.get("neutral", 0)),
            "negative": int(counter.get("negative", 0))
        }

    def _compute_global_sentiment(self, distribution: dict[str, int]) -> tuple[str, float]:
        positive = distribution["positive"]
        neutral = distribution["neutral"]
        negative = distribution["negative"]

        total = positive + neutral + negative
        if total == 0:
            return "NEUTRAL", 0.0

        score = (positive - negative) / total

        if score >= 0.25:
            return "POSITIVE", score

        if score <= -0.25:
            return "NEGATIVE", score

        return "NEUTRAL", score

    def _extract_topics(self, comments: list[str]) -> list[FeedbackTopic]:
        valid_comments = [
            comment for comment in comments
            if comment and len(comment.split()) >= 3
        ]

        if len(valid_comments) < 3:
            return self._fallback_topics(valid_comments)

        try:
            embedding_model = self._get_embedding_model()

            vectorizer_model = CountVectorizer(
                stop_words=list(FRENCH_STOPWORDS),
                ngram_range=(1, 2),
                min_df=1
            )

            topic_model = BERTopic(
                embedding_model=embedding_model,
                vectorizer_model=vectorizer_model,
                language="multilingual",
                calculate_probabilities=False,
                verbose=False,
                min_topic_size=2
            )

            topic_ids, _ = topic_model.fit_transform(valid_comments)
            topic_info = topic_model.get_topic_info()

            results: list[FeedbackTopic] = []

            for _, row in topic_info.iterrows():
                topic_id = int(row["Topic"])

                if topic_id == -1:
                    continue

                count = int(row["Count"])
                words = topic_model.get_topic(topic_id) or []
                keywords = [word for word, _ in words[:5]]

                label = ", ".join(keywords[:3]) if keywords else f"Thème {topic_id}"

                results.append(
                    FeedbackTopic(
                        topic_id=topic_id,
                        label=label,
                        count=count,
                        keywords=keywords
                    )
                )

            if not results:
                return self._fallback_topics(valid_comments)

            return results[:5]

        except Exception:
            return self._fallback_topics(valid_comments)

    def _fallback_topics(self, comments: list[str]) -> list[FeedbackTopic]:
        keywords = self._simple_keywords(comments, limit=5)

        if not keywords:
            return []

        return [
            FeedbackTopic(
                topic_id=0,
                label=", ".join(keywords[:3]),
                count=len(comments),
                keywords=keywords
            )
        ]

    def _extract_keywords_from_topics(self, topics: list[FeedbackTopic], limit: int = 10) -> list[str]:
        keywords: list[str] = []

        for topic in topics:
            for keyword in topic.keywords:
                if keyword not in keywords:
                    keywords.append(keyword)

        return keywords[:limit]

    def _simple_keywords(self, comments: list[str], limit: int = 8) -> list[str]:
        words: list[str] = []

        for comment in comments:
            for word in re.findall(r"[a-zA-ZÀ-ÿ']+", comment.lower()):
                if len(word) < 4:
                    continue
                if word in FRENCH_STOPWORDS:
                    continue
                words.append(word)

        counter = Counter(words)
        return [word for word, _ in counter.most_common(limit)]

    def _extract_strengths(
        self,
        feedbacks: pd.DataFrame,
        sentiment_results: list[dict[str, Any]],
        limit: int = 3
    ) -> list[str]:
        rows = feedbacks.copy()
        rows["sentiment"] = [item["sentiment"] for item in sentiment_results]

        positive_rows = rows[
            (rows["sentiment"] == "positive") | (rows["rating"] >= 4)
        ]

        comments = positive_rows["comment"].astype(str).tolist()
        return self._summarize_comment_points(comments, limit=limit)

    def _extract_improvements(
        self,
        feedbacks: pd.DataFrame,
        sentiment_results: list[dict[str, Any]],
        limit: int = 3
    ) -> list[str]:
        rows = feedbacks.copy()
        rows["sentiment"] = [item["sentiment"] for item in sentiment_results]

        negative_rows = rows[
            (rows["sentiment"] == "negative") | (rows["rating"] <= 2)
        ]

        comments = negative_rows["comment"].astype(str).tolist()
        return self._summarize_comment_points(comments, limit=limit)

    def _summarize_comment_points(self, comments: list[str], limit: int = 3) -> list[str]:
        points: list[str] = []

        for comment in comments:
            cleaned = self._remove_reference_parts(comment)
            if not cleaned:
                continue

            sentence = cleaned.split(".")[0].strip()
            if sentence and sentence not in points:
                points.append(sentence)

            if len(points) >= limit:
                break

        return points

    def _build_template_summary(
        self,
        feedback_count: int,
        average_rating: float,
        global_sentiment: str,
        keywords: list[str],
        strengths: list[str],
        improvements: list[str]
    ) -> str:
        sentiment_fr = {
            "POSITIVE": "positif",
            "NEUTRAL": "neutre",
            "NEGATIVE": "négatif"
        }.get(global_sentiment, "neutre")

        summary = (
            f"L’analyse IA de {feedback_count} feedback(s) indique un sentiment global {sentiment_fr}, "
            f"avec une note moyenne de {average_rating:.2f}/5."
        )

        if keywords:
            summary += f" Les thèmes principaux sont : {', '.join(keywords[:5])}."

        if strengths:
            summary += f" Les points forts concernent : {', '.join(strengths[:2])}."

        if improvements:
            summary += f" Les axes d’amélioration concernent : {', '.join(improvements[:2])}."

        return summary

    def _build_qwen_summary(
        self,
        event_title: str | None,
        feedback_count: int,
        average_rating: float,
        global_sentiment: str,
        distribution: dict[str, int],
        topics: list[FeedbackTopic],
        strengths: list[str],
        improvements: list[str],
        fallback_summary: str
    ) -> tuple[str, bool, str]:
        system_message = (
            "Tu es un assistant RH pour CapEvents. "
            "Tu rédiges des résumés courts, professionnels et en français. "
            "Tu n'inventes aucune donnée. "
            "Tu dois respecter exactement les chiffres fournis. "
            "Ne dis jamais que tous les feedbacks sont positifs si la distribution contient des feedbacks négatifs ou neutres. "
            "Tu réponds directement, sans raisonnement détaillé."
        )

        positive_count = distribution.get("positive", 0)
        neutral_count = distribution.get("neutral", 0)
        negative_count = distribution.get("negative", 0)

        topics_text = [
            {
                "label": topic.label,
                "count": topic.count,
                "keywords": topic.keywords[:3]
            }
            for topic in topics[:5]
        ]

        user_message = f"""
        Rédige un résumé RH en 3 phrases maximum.

        Données exactes à respecter :
        - Événement : {event_title or "Non précisé"}
        - Nombre total de feedbacks analysés : {feedback_count}
        - Note moyenne : {average_rating:.2f}/5
        - Sentiment global calculé : {global_sentiment}
        - Feedbacks positifs : {positive_count}
        - Feedbacks neutres : {neutral_count}
        - Feedbacks négatifs : {negative_count}

        Thèmes détectés :
        {topics_text}

        Points forts :
        {strengths}

        Points à améliorer :
        {improvements}

        Contraintes :
        - Ne dis pas "{feedback_count} feedbacks positifs".
        - Dis plutôt : "{positive_count} positifs, {neutral_count} neutres et {negative_count} négatifs".
        - Ne mentionne que les thèmes, points forts et axes d'amélioration fournis.
        - Réponds en français, style professionnel RH.
        """

        try:
            response = requests.post(
                OLLAMA_CHAT_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": system_message
                        },
                        {
                            "role": "user",
                            "content": user_message
                        }
                    ],
                    "stream": False,
                    "think": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 160
                    },
                    "keep_alive": "10m"
                },
                timeout=OLLAMA_TIMEOUT_SECONDS
            )

            if response.status_code != 200:
                return fallback_summary, False, f"fallback_template_ollama_status_{response.status_code}"

            data = response.json()

            message = data.get("message", {})
            text = str(message.get("content", "")).strip()

            if f"{feedback_count} feedbacks positifs" in text.lower():
                return fallback_summary, False, "fallback_template_qwen_summary_validation_failed"

            if f"{feedback_count} retours positifs" in text.lower():
                return fallback_summary, False, "fallback_template_qwen_summary_validation_failed"

            if not text:
                return fallback_summary, False, "fallback_template_empty_qwen_chat_content"

            return text, True, "qwen3_ollama_chat"

        except Exception as exc:
            return fallback_summary, False, f"fallback_template_ollama_error_{type(exc).__name__}"
    

    def _get_event_title(self, event_id: str) -> str | None:
        if self.events.empty:
            return None

        rows = self.events[self.events["id"].astype(str) == event_id]
        if rows.empty:
            return None

        return str(rows.iloc[0]["title"])

    def _empty_response(
        self,
        event_id: str,
        event_title: str | None,
        message: str
    ) -> FeedbackInsightResponse:
        return FeedbackInsightResponse(
            event_id=event_id,
            event_title=event_title,
            feedback_count=0,
            average_rating=0.0,
            global_sentiment="NEUTRAL",
            sentiment_score=0.0,
            sentiment_distribution=SentimentDistribution(
                positive=0,
                neutral=0,
                negative=0
            ),
            topics=[],
            keywords=[],
            strengths=[],
            improvements=[],
            summary=message,
            qwen_used=False,
            summary_source="empty_response",
            model_info={
                "sentiment": SENTIMENT_MODEL_NAME,
                "topics": "BERTopic",
                "embeddings": EMBEDDING_MODEL_NAME,
                "summary": "qwen3:0.6b"
            }
        )

    def _clean_for_nlp(self, text: str) -> str:
        text = self._remove_reference_parts(text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _remove_reference_parts(self, text: str) -> str:
        text = str(text)
        text = re.sub(r"Catégorie\s*:\s*[^.]+\.?", "", text, flags=re.IGNORECASE)
        text = re.sub(r"Point de référence\s*:\s*[^.]+\.?", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _truncate_text(self, text: str, max_chars: int = 450) -> str:
        text = str(text).strip()
        if len(text) <= max_chars:
            return text
        return text[:max_chars]