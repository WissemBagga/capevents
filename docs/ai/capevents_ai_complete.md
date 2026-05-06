# CapEvents — Documentation IA complète et plan de finalisation

## 1. Objectif global

CapEvents intègre une couche IA professionnelle autour de la gestion des événements internes. L’objectif n’est pas d’utiliser un seul LLM pour tout faire, mais de construire plusieurs modules spécialisés : recommandation personnalisée, Feedback Intelligence, Copilote RH, monitoring/diagnostics, puis Planning Intelligent.

Principe central :

```txt
Les modèles prédictifs décident.
Les règles métier sécurisent.
Qwen3 rédige.
L’humain valide.
```

---

## 2. Architecture globale IA

```txt
Angular
  → Spring Boot Backend
      → FastAPI AI Service
          → PostgreSQL CapEvents réel
          → Modèles IA / artefacts locaux
          → Ollama / Qwen3
          → Logs JSONL
```

| Couche | Responsabilité |
|---|---|
| Angular | Affichage, interaction utilisateur, dashboards, actions RH |
| Spring Boot | Sécurité JWT, rôles, proxy vers FastAPI, logique métier principale |
| FastAPI | Services IA : recommandation, feedback intelligence, copilote, monitoring |
| PostgreSQL | Source runtime réelle de CapEvents |
| Ollama | Exécution locale de Qwen3 |
| Logs JSONL | Traçabilité IA et monitoring |
| CatBoost / NLP / BERTopic | Modèles spécialisés selon le besoin |

---

## 3. Principe directeur IA

Chaque module IA a un rôle distinct.

```txt
CatBoost / LightGBM
  → scoring, ranking, prédiction tabulaire

XLM-RoBERTa / DistilCamemBERT
  → sentiment, classification NLP

MiniLM / BGE-M3 / Qwen Embedding
  → embeddings, similarité texte

BERTopic
  → extraction des thèmes récurrents

Qwen3
  → résumé, reformulation, brouillon RH
  → jamais utilisé pour décider seul

OR-Tools
  → optimisation calendrier sous contraintes, prévu pour IA 4
```

---

## 4. Les 4 modules IA CapEvents

| Module | Rôle | Modèles / outils | Statut |
|---|---|---|---|
| IA 1 | Recommandation employé — top événements personnalisés | CatBoostRanker + features métier | Fonctionnel |
| IA 3 | Feedback Intelligence — sentiment, thèmes, résumé RH | XLM-RoBERTa + MiniLM + BERTopic + Qwen3 | Fonctionnel |
| IA 2 | Copilote RH — suggestions actionnables | Rule Engine + Qwen3 + logs + feedback RH | Fonctionnellement complet |
| IA 4 | Planning Intelligent — meilleur créneau | CatBoostRegressor / Classifier + OR-Tools | À faire |

---

## 5. Stratégie données

### 5.1 Source runtime

La source runtime utilisée par les endpoints IA doit être PostgreSQL réel :

```txt
users
events
event_registrations
event_feedbacks
event_invitations
interests
user_interests
points_transactions
user_badges
event_invitation_reminders
notifications
```

### 5.2 Données augmentées / synthétiques

Les datasets Kaggle et les données synthétiques sont utiles pour enrichir le dataset initial, entraîner un premier modèle, tester le pipeline et simuler une volumétrie réaliste. Ils ne doivent pas remplacer les vraies données runtime.

Règle recommandée :

```txt
Runtime application = PostgreSQL réel
Training initial = CapEvents + synthétique cohérent + Kaggle curated
Évaluation finale = CapEvents réel
```

### 5.3 Fine-tuning

Dans cette version :

```txt
Pas de fine-tuning LLM.
Pas de LoRA.
Pas d’entraînement Qwen3.
```

Qwen3 est utilisé comme générateur contrôlé, pas comme modèle décisionnel.

---

# PARTIE A — IA 1 : Recommandation personnalisée

## 6. Objectif

Endpoint FastAPI :

```txt
GET /ai/recommendations/users/{user_id}?limit=6
```

Endpoint Spring Boot :

```txt
GET /api/ai/recommendations/users/{userId}?limit=6
```

Objectif : proposer à chaque employé les événements les plus pertinents.

---

## 7. Modèle

Modèle principal :

```txt
CatBoostRanker
```

Artefacts :

```txt
models_artifacts/recommendation/catboost_recommender.cbm
models_artifacts/recommendation/features.json
```

---

## 8. Features principales

Exemples :

```txt
event_category
event_audience
event_location_type
event_capacity
event_duration_minutes
event_day_of_week
event_hour
days_until_event
event_registered_count
event_present_count
event_fill_rate
event_avg_rating
event_feedback_count
same_department
is_global_event
interest_match
user_total_registrations
user_total_attendances
user_attendance_rate
user_avg_rating
user_category_registrations
user_category_attendances
user_category_attendance_rate
points_total
points_events_count
badges_count
was_invited
rsvp_yes
rsvp_maybe
rsvp_no
```

---

## 9. État IA 1

Déjà fait :

- service FastAPI indépendant ;
- training CatBoostRanker ;
- endpoint recommandation ;
- logging des prédictions ;
- connexion Spring Boot ;
- service Angular ;
- affichage dans dashboard employé ;
- runtime_loader PostgreSQL ;
- filtrage événements publiés, futurs, non complets, deadline valide.

À vérifier avant finalisation :

- endpoint retourne des recommandations pour plusieurs profils ;
- pas de recommandation d’événement passé ;
- pas de recommandation d’événement déjà inscrit ;
- logs JSONL créés correctement ;
- monitoring recommandations affiché côté RH.

---

# PARTIE B — IA 3 : Feedback Intelligence

## 10. Objectif

Endpoint FastAPI :

```txt
GET /ai/feedback/events/{event_id}/insights
```

Endpoint Spring Boot :

```txt
GET /api/ai/feedback/events/{eventId}/insights
```

Objectif : fournir une analyse RH des feedbacks d’un événement.

---

## 11. Pipeline

```txt
Feedbacks PostgreSQL
  → nettoyage texte
  → sentiment XLM-RoBERTa
  → embeddings MiniLM
  → topics BERTopic
  → forces / améliorations
  → résumé Qwen3
  → fallback si Qwen échoue
```

---

## 12. Modèles utilisés

| Fonction | Modèle / outil |
|---|---|
| Sentiment | cardiffnlp/twitter-xlm-roberta-base-sentiment-multilingual |
| Embeddings | sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 |
| Topics | BERTopic |
| Résumé | qwen3:0.6b via Ollama |

---

## 13. Règles UX Feedback Intelligence

Dans `event-details-admin` :

```txt
0 feedback
  → Aucun feedback disponible

1 à 4 feedbacks
  → Afficher seulement feedback_count + moyenne
  → Pas d’analyse IA complète

5 feedbacks et plus
  → Analyse IA complète
```

Dans `event-details` côté utilisateur : feedback public/anonyme, affichage simple, pas d’analyse IA complète.

---

## 14. État IA 3

Déjà fait :

- sentiment ;
- topics ;
- keywords ;
- strengths / improvements ;
- résumé Qwen3 ;
- fallback sécurisé ;
- garde-fous Qwen ;
- PostgreSQL réel ;
- connexion Spring Boot ;
- intégration `event-details-admin`.

À vérifier :

- Qwen utilisé quand Ollama disponible ;
- fallback propre si Qwen timeout ;
- seuil `< 5 feedbacks` respecté ;
- pas de résumé trompeur.

---

# PARTIE C — IA 2 : Copilote RH

## 15. Objectif

Endpoint FastAPI :

```txt
GET /ai/hr-copilot/suggestions
```

Endpoint Spring Boot :

```txt
GET /api/ai/hr-copilot/suggestions
```

Objectif : proposer aux RH des actions intelligentes, basées sur les vraies données CapEvents.

---

## 16. Architecture Copilote RH

```txt
PostgreSQL réel
  → Rule Engine
      → détection des problèmes RH
      → priorisation
  → Qwen3
      → rédaction du brouillon
  → fallback sécurisé
  → Angular Dashboard KPI RH
  → actions RH
  → logs et monitoring
```

Principe :

```txt
Rule Engine = décide
Qwen3 = rédige
RH = valide
```

---

## 17. Types de suggestions du Copilote RH

### 17.1 LOW_REGISTRATION

Détection :

```txt
registered_count / capacity < 30%
```

Action : renforcer la visibilité de l’événement, cibler les collaborateurs intéressés, clarifier les bénéfices.

### 17.2 PENDING_INVITATIONS

Détection :

```txt
invitations PENDING
rsvp_response IS NULL
pas de relance SENT depuis moins de 24h
```

Action : relancer les collaborateurs déjà invités et sans réponse.

Important :

```txt
On ne recrée jamais une invitation.
On crée une relance liée à une invitation existante.
```

### 17.3 RSVP_FRICTION

Détection : beaucoup de réponses `NO` ou `MAYBE`.

Action : analyser le créneau, le format, le sujet ou la communication.

### 17.4 LOW_FEEDBACK_SCORE

Détection :

```txt
average_rating < 3.2
feedback_count >= 3
```

Action : consulter Feedback Intelligence et identifier les axes d’amélioration.

### 17.5 LOW_DEPARTMENT_ENGAGEMENT

Détection : faible participation d’un département actif.

Action : proposer une action ciblée adaptée au département.

---

## 18. Interface Copilote RH

Dans dashboard KPI RH :

- liste des suggestions ;
- priorité ;
- insight ;
- action recommandée ;
- chips métier ;
- brouillon RH ;
- bouton contextuel ;
- bouton copier le brouillon ;
- bouton utile / pas utile ;
- bouton relancer les invités si applicable.

Exemples de chips :

```txt
Inscrits 2/20
Taux 10%
Réponses 12
Oui 5
Peut-être 4
Non 3
Friction 58%
En attente 10
Relançables 6
Déjà relancées 4
Cooldown 24h
```

---

## 19. Actions Copilote RH

### 19.1 Navigation contextuelle

| Type | Action UI |
|---|---|
| PENDING_INVITATIONS | Voir les invitations |
| LOW_REGISTRATION | Analyser les inscriptions |
| RSVP_FRICTION | Analyser les réponses |
| LOW_FEEDBACK_SCORE | Voir les feedbacks |
| LOW_DEPARTMENT_ENGAGEMENT | Voir le contexte |

### 19.2 Relancer les invités

Flux :

```txt
RH clique Relancer les invités
  → modal de confirmation
  → RH vérifie/modifie le message
  → Spring Boot sélectionne les invitations éligibles
  → notification interne employé
  → email/log selon profil
  → historique event_invitation_reminders
  → refresh Copilote RH
```

---

## 20. Gestion professionnelle des relances

Tables :

```txt
event_invitations
event_invitation_reminders
notifications
```

Invitation unique dans `event_invitations` :

```sql
unique (event_id, user_id)
```

Historique relances dans `event_invitation_reminders` :

```txt
invitation_id
sent_by
channel
subject
message
status
error_message
sent_at
```

Anti-spam : une invitation déjà relancée en `SENT` depuis moins de 24h n’est pas relancée.

---

## 21. Côté employee

Quand une relance est envoyée :

- notification interne ;
- redirection vers `/my-invitations?invitationId=...` ;
- carte invitation mise en évidence ;
- bouton “message de relance” visible seulement si relance existe ;
- modal avec message RH ;
- réponse YES / MAYBE / NO possible.

---

## 22. Côté admin

Dans `event-details-admin` :

- historique complet des relances ;
- destinataire ;
- envoyé par ;
- canal ;
- statut ;
- message envoyé ;
- erreur éventuelle ;
- nombre de relances sur chaque invitation ;
- dernière relance.

---

## 23. Feedback RH utile / pas utile

Endpoint FastAPI :

```txt
POST /ai/hr-copilot/feedback
```

Endpoint Spring Boot :

```txt
POST /api/ai/hr-copilot/feedback
```

Stockage :

```txt
logs/copilot/hr-copilot-feedback-YYYY-MM-DD.jsonl
```

Indicateurs :

```txt
feedback_count
useful_feedback_count
not_useful_feedback_count
usefulness_rate
```

---

## 24. Monitoring Copilote RH

Endpoint FastAPI :

```txt
GET /ai/monitoring/hr-copilot/summary
```

Endpoint Spring Boot :

```txt
GET /api/ai/monitoring/hr-copilot/summary
```

Indicateurs :

```txt
total_calls
successful_calls
failed_calls
total_suggestions
qwen_used_count
qwen_usage_rate
feedback_count
usefulness_rate
top_suggestion_types
recent_calls
```

---

## 25. Logs Copilote RH

Génération :

```txt
logs/copilot/hr-copilot-YYYY-MM-DD.jsonl
```

Feedback RH :

```txt
logs/copilot/hr-copilot-feedback-YYYY-MM-DD.jsonl
```

Ces logs sont utilisés pour monitoring, traçabilité, rapport PFE et amélioration des règles métier.

---

## 26. État Copilote RH

Fonctionnellement complet :

- suggestions RH ;
- Qwen3 + fallback ;
- actions contextuelles ;
- relances sécurisées ;
- notifications employee ;
- historique admin ;
- feedback utile/pas utile ;
- monitoring avec taux d’utilité.

À vérifier avant clôture :

- logs créés ;
- feedback enregistré ;
- monitoring mis à jour ;
- relance ne crée jamais de doublon ;
- bouton employee visible seulement si relance existe ;
- notification redirige correctement.

---

# PARTIE D — Diagnostics et Monitoring général IA

## 27. Diagnostics IA

Endpoint FastAPI :

```txt
GET /ai/diagnostics/status
```

Endpoint Spring Boot :

```txt
GET /api/ai/diagnostics/status
```

Objectif : vérifier modèle CatBoost, features, PostgreSQL runtime, Ollama, nombre d’events/users/feedbacks.

---

## 28. Monitoring recommandations

Indicateurs : total calls, erreurs, top events recommandés, derniers appels, version modèle, request_id.

## 29. Monitoring Copilote RH

Indicateurs : appels Copilote, suggestions générées, Qwen utilisé, top types de suggestions, feedback RH, taux d’utilité.

---

# PARTIE E — Organisation des fichiers

## 30. Spring Boot

Structure recommandée :

```txt
controller
  AiFeedbackController.java
  AiHrCopilotController.java
  AiHrCopilotFeedbackController.java
  AiHrCopilotMonitoringController.java
  AiDiagnosticsController.java
  EventInvitationReminderController.java
  MyInvitationReminderController.java

dto
  ai
  invitation

entity
  EventInvitationReminder.java
  Notification.java

entity/enums
  ReminderChannel.java
  ReminderStatus.java
  NotificationType.java

repository
  EventInvitationRepository.java
  EventInvitationReminderRepository.java
  NotificationRepository.java

service
  ai
  mail
  EventInvitationReminderService.java
  NotificationService.java
```

## 31. FastAPI

```txt
app
  api
    recommendations.py
    feedback_insights.py
    hr_copilot.py
    hr_copilot_feedback.py
    monitoring.py
    copilot_monitoring.py
    diagnostics.py

  schemas
    recommendation.py
    feedback.py
    hr_copilot.py
    copilot_feedback.py
    monitoring.py
    copilot_monitoring.py
    diagnostics.py

  services
    recommendation_service.py
    feedback_insight_service.py
    hr_copilot_service.py
    copilot_logger.py
    copilot_monitoring_service.py
    diagnostics_service.py

  data
    db.py
    runtime_loader.py
```

## 32. Angular

```txt
core
  models
    ai-hr-copilot.model.ts
    ai-hr-copilot-feedback.model.ts
    ai-hr-copilot-monitoring.model.ts
    invitation-reminder.model.ts
    invitation-reminder-history.model.ts
    my-invitation-reminder.model.ts

  services
    ai-hr-copilot.service.ts
    ai-hr-copilot-feedback.service.ts
    ai-hr-copilot-monitoring.service.ts
    invitation-reminder.service.ts
    my-invitation-reminder.service.ts

features
  admin
    pages
      admin-stats
      admin-event-details

  employee
    my-invitations
```

---

# PARTIE F — Liste complète pour finaliser le projet

## 33. Finalisation technique backend Spring Boot

- [ ] Lancer `mvn clean test`.
- [ ] Vérifier toutes les migrations Flyway.
- [ ] Vérifier que `event_invitation_reminders` existe.
- [ ] Vérifier que les anciennes colonnes `reminder_count` et `last_reminder_sent_at` ont été supprimées si elles avaient été ajoutées.
- [ ] Vérifier la contrainte unique `(event_id, user_id)` sur `event_invitations`.
- [ ] Vérifier `NotificationType.EVENT_INVITATION_REMINDER`.
- [ ] Vérifier que `DevEmailService` ne dépend pas de `JavaMailSender`.
- [ ] Vérifier que `MailtrapEmailService` envoie bien avec Mailtrap.
- [ ] Vérifier les routes Spring Security IA.
- [ ] Vérifier les DTO `@JsonProperty`.
- [ ] Vérifier que ROLE_HR protège les endpoints RH.
- [ ] Vérifier qu’un employee ne peut lire que ses propres relances.

## 34. Finalisation technique FastAPI

- [ ] Lancer `python -m compileall app`.
- [ ] Tester `/ai/diagnostics/status`.
- [ ] Tester `/ai/recommendations/users/{user_id}`.
- [ ] Tester `/ai/feedback/events/{event_id}/insights`.
- [ ] Tester `/ai/hr-copilot/suggestions`.
- [ ] Tester `/ai/hr-copilot/feedback`.
- [ ] Tester `/ai/monitoring/hr-copilot/summary`.
- [ ] Vérifier les logs recommandations.
- [ ] Vérifier les logs Copilote.
- [ ] Vérifier les logs feedback Copilote.
- [ ] Vérifier Ollama `qwen3:0.6b`.
- [ ] Vérifier fallback si Ollama est éteint.

## 35. Finalisation Angular

- [ ] Lancer `ng build`.
- [ ] Vérifier dashboard employé recommandations.
- [ ] Vérifier dashboard KPI RH.
- [ ] Vérifier Copilote RH.
- [ ] Vérifier Monitoring IA recommandations.
- [ ] Vérifier Monitoring Copilote RH.
- [ ] Vérifier `event-details-admin`.
- [ ] Vérifier historique relances admin.
- [ ] Vérifier `my-invitations`.
- [ ] Vérifier modal messages de relance employee.
- [ ] Vérifier bouton message de relance visible seulement si relance existe.
- [ ] Vérifier navigation depuis notification.
- [ ] Vérifier responsive mobile.

## 36. Tests fonctionnels obligatoires

### Recommandations

- [ ] User avec intérêts reçoit événements pertinents.
- [ ] User déjà inscrit ne reçoit pas le même event.
- [ ] Event passé non recommandé.
- [ ] Event complet non recommandé.
- [ ] Deadline dépassée non recommandée.

### Feedback Intelligence

- [ ] Event sans feedback.
- [ ] Event avec 1 à 4 feedbacks.
- [ ] Event avec 5+ feedbacks.
- [ ] Ollama actif.
- [ ] Ollama éteint fallback.

### Copilote RH

- [ ] Suggestions variées.
- [ ] Pas de prompt brut.
- [ ] Bouton relance seulement pour PENDING_INVITATIONS.
- [ ] Confirmation avant relance.
- [ ] Relance ne crée pas de nouvelle invitation.
- [ ] Cooldown 24h fonctionne.
- [ ] Notification interne créée.
- [ ] Historique admin créé.
- [ ] Employee voit le message.
- [ ] Feedback utile/pas utile enregistré.
- [ ] Monitoring taux utilité mis à jour.

## 37. Sécurité

- [ ] JWT obligatoire pour endpoints internes.
- [ ] Clé `x-ai-service-key` obligatoire entre Spring Boot et FastAPI.
- [ ] Pas d’exposition de clé IA côté Angular.
- [ ] CORS correct.
- [ ] Endpoints HR limités à `ROLE_HR`.
- [ ] Endpoints feedback admin limités HR/Manager.
- [ ] Endpoints employee limités à l’utilisateur connecté.
- [ ] Vérifier qu’un utilisateur ne peut pas lire les relances d’une autre invitation.

## 38. Données et qualité

- [ ] Supprimer les faux CSV runtime si inutilisés.
- [ ] Garder les CSV de training séparés.
- [ ] Vérifier PostgreSQL réel.
- [ ] Vérifier cohérence users/events/registrations/feedbacks.
- [ ] Vérifier IDs UUID castés en texte côté FastAPI.
- [ ] Vérifier que les datasets Kaggle ne polluent pas runtime.
- [ ] Documenter les données synthétiques.

## 39. Documentation PFE

À préparer :

- [ ] Architecture générale.
- [ ] Architecture IA.
- [ ] IA 1 Recommandation.
- [ ] IA 3 Feedback Intelligence.
- [ ] IA 2 Copilote RH.
- [ ] Sécurité.
- [ ] Données.
- [ ] Résultats et captures d’écran.
- [ ] Limites.
- [ ] Perspectives : IA 4 Planning Intelligent.

## 40. Captures d’écran à préparer

- [ ] Landing page.
- [ ] Login.
- [ ] Dashboard employé.
- [ ] Recommandations IA.
- [ ] Détail événement.
- [ ] Feedback utilisateur.
- [ ] Dashboard KPI RH.
- [ ] Copilote RH.
- [ ] Confirmation relance.
- [ ] Monitoring Copilote RH.
- [ ] Historique relances admin.
- [ ] Notifications employee.
- [ ] Messages de relance employee.
- [ ] Feedback Intelligence.
- [ ] Swagger FastAPI.
- [ ] Swagger Spring Boot.

## 41. Commits recommandés restants

```bash
git add .
git commit -m "refactor(ai): organize AI copilot files and clean unused imports"

git add .
git commit -m "test(ai): validate full AI integration flow"

git add .
git commit -m "docs(ai): finalize AI architecture documentation"
```

---

# PARTIE G — Ce qui reste après IA 2

## 42. IA 4 — Planning Intelligent

À faire plus tard.

Objectif :

```txt
Aider RH à choisir le meilleur créneau pour un événement.
```

Approche :

```txt
CatBoostClassifier
  → probabilité forte inscription / présence

CatBoostRegressor
  → nombre attendu d’inscrits / taux de participation

OR-Tools
  → optimisation avec contraintes
```

Contraintes possibles : horaire de travail, disponibilité salle, public cible, catégorie, historique participation, conflit avec autres événements, deadline inscription, durée.

Sortie attendue :

```txt
Créneau recommandé : mardi 10h00
Score attendu : 0.82
Raisons : bon historique, faible conflit, public cible disponible
```

## 43. Améliorations futures Copilote RH

- commentaire libre RH sur suggestion ;
- apprentissage de pondération des règles avec le feedback utile/pas utile ;
- tendances hebdomadaires ;
- actions groupées ;
- RAG sur documents RH internes ;
- copilote conversationnel ;
- export PDF du rapport IA ;
- notifications RH pour événements à risque.

---

# Conclusion

À ce stade, CapEvents possède une architecture IA solide :

```txt
IA 1 — Recommandation personnalisée : fonctionnelle
IA 3 — Feedback Intelligence : fonctionnelle
IA 2 — Copilote RH : fonctionnellement complet
Monitoring et diagnostics IA : en place
Relances, notifications, historique : en place
```

La priorité maintenant est :

```txt
1. Tests complets
2. Nettoyage / organisation
3. Documentation PFE
4. IA 4 Planning Intelligent si le temps le permet
```
