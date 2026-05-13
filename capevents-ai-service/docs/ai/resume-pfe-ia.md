# Résumé PFE — Partie Intelligence Artificielle CapEvents

## 1. Objectif général

La partie intelligence artificielle du projet **CapEvents** a pour objectif d'améliorer la gestion des événements internes d'entreprise à travers plusieurs modules IA complémentaires.

Elle permet notamment de :

- recommander des événements personnalisés aux employés ;
- aider les RH et managers à choisir les meilleurs créneaux ;
- analyser les feedbacks des participants ;
- proposer des actions RH via un copilote intelligent ;
- suivre l'état des modèles et des prédictions via des endpoints de monitoring.

L'objectif n'est pas de remplacer la décision humaine, mais de fournir une aide à la décision fiable, traçable et explicable.

---

## 2. Architecture générale

Le service IA est développé comme un service indépendant basé sur **FastAPI**.

Le flux applicatif retenu est :

```text
Angular → Spring Boot → FastAPI IA → PostgreSQL / Modèles IA
```

Le frontend Angular ne communique pas directement avec FastAPI IA.  
Le backend Spring Boot joue le rôle d'intermédiaire sécurisé.

Le service IA utilise :

- PostgreSQL comme source de données runtime ;
- des fichiers CSV pour la préparation et l'entraînement ;
- des modèles CatBoost pour les modules de recommandation et de planning ;
- Ollama avec Qwen pour certaines générations textuelles ;
- des endpoints de diagnostic et de monitoring.

---

## 3. Organisation des données

Les données sont organisées en plusieurs niveaux.

### Données brutes

Les données initiales sont stockées dans :

```text
datasets/raw/capevents/
```

Elles représentent les exports d'origine depuis la base CapEvents.

### Données nettoyées

Les données nettoyées sont stockées dans :

```text
datasets/clean/capevents_v1/
```

Cette version est utilisée comme base propre pour les traitements IA.

### Données rejetées

Les lignes rejetées pendant le nettoyage sont conservées dans :

```text
datasets/rejected/capevents_v1/
```

Cela permet de garder une traçabilité complète du nettoyage.

### Données préparées

Les datasets prêts pour l'entraînement sont stockés dans :

```text
datasets/processed/
```

Exemples :

- `recommendation_train.csv`
- `recommendation_train_hard_negatives.csv`
- `planning_train.csv`

---

## 4. Nettoyage et validation des données

Un script de validation automatique a été mis en place :

```bash
python scripts/validate_clean_csv.py
```

Ce script vérifie notamment :

- la présence des fichiers obligatoires ;
- la cohérence des clés étrangères ;
- les valeurs manquantes importantes ;
- les auto-invitations interdites ;
- les formats invalides ;
- les relations entre utilisateurs, événements, inscriptions, feedbacks et invitations.

Après nettoyage, le résultat final obtenu est :

```text
Erreurs : 0
Warnings : 0
```

Le nettoyage a été réalisé de manière non destructive : les fichiers propres sont conservés dans `datasets/clean/`, et les lignes rejetées sont conservées dans `datasets/rejected/`.

---

## 5. Module IA 1 — Recommandation d'événements

### Objectif

Le module de recommandation propose à chaque employé une liste personnalisée d'événements.

Il prend en compte :

- le profil utilisateur ;
- le département ;
- les centres d'intérêt ;
- l'historique d'inscription ;
- les présences ;
- les feedbacks ;
- les points ;
- les badges ;
- les invitations et réponses RSVP ;
- les caractéristiques des événements.

### Modèle utilisé

Le modèle actif est :

```text
recommendation-v1.0.0
```

Type de modèle :

```text
CatBoostRanker
```

Statut :

```text
Production
```

### Métriques principales

| Métrique | Valeur |
|---|---:|
| Precision@5 | 0.7290 |
| NDCG@5 | 0.8623 |
| Recall@5 | Non mesuré |

`Recall@5` n'était pas calculé dans la première version du pipeline, donc la valeur n'a pas été inventée.

### Versions testées

Plusieurs candidates ont été entraînées :

| Version | Precision@5 | Recall@5 | NDCG@5 | Décision |
|---|---:|---:|---:|---|
| recommendation-v1.0.0 | 0.7290 | Non mesuré | 0.8623 | Conservée en production |
| recommendation-v1.3.0 | 0.7210 | 0.7233 | 0.8564 | Non promue |
| recommendation-v1.4.0 | 0.6850 | 0.7085 | 0.8237 | Non promue |
| recommendation-v1.5.0 | 0.6980 | 0.7087 | 0.8309 | Non promue |

### Décision

La version `recommendation-v1.0.0` reste en production, car elle conserve les meilleures performances sur les métriques principales `Precision@5` et `NDCG@5`.

---

## 6. Module IA 2 — Planning Intelligent

### Objectif

Le module Planning Intelligent aide les RH et managers à choisir les meilleurs créneaux pour organiser des événements internes.

Il permet également de générer des propositions d'événements à partir des tendances observées.

### Modèle utilisé

Le modèle actif est :

```text
planning-regressor-v1.0.0
```

Type de modèle :

```text
CatBoostRegressor
```

Statut :

```text
Production
```

### Métriques principales

| Métrique | Valeur |
|---|---:|
| MAE | 0.0788 |
| RMSE | 0.1060 |
| R² | 0.0344 |

Le modèle est meilleur que les baselines, mais son R² reste faible.  
Il est donc utilisé comme un composant de scoring hybride, et non comme un décideur automatique.

### Approche hybride

Le score final combine :

- prédiction du modèle CatBoostRegressor ;
- règles métier ;
- contraintes de calendrier ;
- historique de participation ;
- pénalités de conflit ;
- validation RH ou manager.

---

## 7. Module IA 3 — Feedback Intelligence

### Objectif

Le module Feedback Intelligence analyse les retours textuels des participants après les événements.

Il produit :

- un sentiment global ;
- une distribution positive, neutre et négative ;
- des thèmes principaux ;
- des mots-clés ;
- des points forts ;
- des axes d'amélioration ;
- un résumé RH.

### Techniques utilisées

Le module utilise :

- un modèle de sentiment multilingue ;
- SentenceTransformer pour les embeddings ;
- BERTopic pour l'extraction de thèmes ;
- Qwen via Ollama pour générer un résumé ;
- un fallback template si le LLM n'est pas disponible.

### Sécurité du résumé

Le résumé généré ne doit pas inventer de données.

Il doit respecter :

- le nombre exact de feedbacks ;
- la note moyenne ;
- la distribution des sentiments ;
- les thèmes détectés ;
- les points forts ;
- les axes d'amélioration.

---

## 8. Module IA 4 — HR Copilot

### Objectif

Le Copilote RH propose automatiquement des actions opérationnelles aux RH.

Il détecte notamment :

- les invitations en attente ;
- les événements avec faible inscription ;
- les événements avec feedback faible ;
- les départements peu engagés ;
- les frictions RSVP.

### Fonctionnement

Le module combine :

- règles métier SQL ;
- scoring de priorité ;
- génération de brouillons RH avec Qwen ;
- fallback sécurisé ;
- journalisation des appels ;
- monitoring d'usage.

### Exemples d'actions proposées

Le Copilote RH peut proposer de :

- relancer les invités sans réponse ;
- renforcer la visibilité d'un événement ;
- analyser les feedbacks négatifs ;
- proposer une action ciblée pour un département ;
- comprendre les réponses négatives ou hésitantes.

---

## 9. Nettoyage des textes et encodage

Un nettoyeur central a été ajouté :

```text
app/core/text_sanitizer.py
```

Il permet de corriger les problèmes d'encodage et de garantir des réponses propres dans :

- Swagger ;
- Angular ;
- les réponses JSON ;
- les logs ;
- les textes générés par le LLM.

Cela permet d'éviter les textes cassés de type :

```text
Ã©vÃ©nement
donnÃ©es
rÃ©ponse
```

et de retourner correctement :

```text
événement
données
réponse
```

---

## 10. Sécurité

Le service IA est protégé par une clé interne :

```text
x-ai-service-key
```

Cette clé doit être utilisée uniquement entre Spring Boot et FastAPI IA.

Elle ne doit jamais être exposée dans Angular.

---

## 11. Monitoring et diagnostics

Le service contient plusieurs endpoints de suivi :

- diagnostic global du service ;
- monitoring des recommandations ;
- monitoring Planning ;
- monitoring HR Copilot ;
- logs JSONL locaux.

Les logs runtime sont ignorés dans Git.

---

## 12. Model Registry

Le fichier central de suivi des modèles est :

```text
models_artifacts/model_registry.json
```

Il contient :

- les tâches IA ;
- les versions ;
- les chemins des modèles ;
- les chemins des features ;
- les métriques ;
- le statut des versions ;
- la version active en production.

Les statuts utilisés sont :

- production ;
- candidate ;
- rejected ;
- archived.

---

## 13. Validation finale

Les validations finales utilisées sont :

```bash
python -m compileall app scripts training
python scripts/validate_clean_csv.py
python scripts/audit_markdown_french_v1.py
```

Résultats attendus :

- aucune erreur de compilation Python ;
- erreurs CSV : 0 ;
- warnings CSV : 0 ;
- fichiers Markdown à corriger : 0.

---

## 14. Nettoyage global du projet IA

Le nettoyage global a permis de :

- supprimer les scripts temporaires de correction ;
- supprimer les snapshots et inventaires intermédiaires ;
- ignorer les logs, backups temporaires et sorties CatBoost ;
- garder les fichiers nécessaires à la reproductibilité ;
- garder les rapports de décision modèle ;
- garder les datasets raw, clean, rejected et processed ;
- garder les artefacts modèles et le model registry.

---

## 15. Limites actuelles

Les limites principales sont :

- certaines données restent partiellement synthétiques ou démonstratives ;
- les historiques réels sont encore limités ;
- le cold-start utilisateur reste un défi ;
- le Planning est un scoring hybride, pas une décision automatique ;
- les performances dépendent fortement de la qualité des données ;
- les résumés LLM doivent rester contrôlés.

---

## 16. Améliorations futures

Les améliorations possibles sont :

- augmenter le volume de données réelles ;
- améliorer les hard negatives pour la recommandation ;
- ajouter une validation temporelle ;
- comparer CatBoost avec LightGBM ;
- enrichir les descriptions d'événements avec des embeddings textuels ;
- améliorer le cold-start ;
- ajouter plus de tests automatisés ;
- centraliser davantage les accès PostgreSQL dans les repositories ;
- documenter chaque endpoint avec des exemples Swagger.

---

## 17. Conclusion

La partie IA de CapEvents est structurée autour de quatre modules :

- Recommandation IA ;
- Planning Intelligent ;
- Feedback Intelligence ;
- HR Copilot.

Les modules Recommandation et Planning utilisent des modèles entraînés, versionnés et suivis dans le model registry.

Les modules Feedback Intelligence et HR Copilot combinent NLP, règles métier, LLM et fallback sécurisé.

L'ensemble forme une architecture IA modulaire, traçable, explicable et adaptée à un projet PFE propre.
