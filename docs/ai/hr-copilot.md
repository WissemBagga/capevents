# IA 2 — Copilote RH CapEvents

## 1. Objectif

Le Copilote RH est un module d’intelligence artificielle destiné aux utilisateurs RH.  
Il analyse les données réelles de CapEvents afin de proposer des actions concrètes pour améliorer la participation, l’engagement et la qualité des événements internes.

Le Copilote RH ne remplace pas la décision humaine.  
Il détecte des signaux métier, propose une action, puis laisse le RH valider ou non.

---

## 2. Architecture générale

```txt
Angular Dashboard KPI RH
  → Spring Boot Backend
      → FastAPI AI Service
          → PostgreSQL CapEvents
          → Rule Engine
          → Qwen3 via Ollama
          → Logs Copilote RH


# Tests d’acceptation — IA 2 Copilote RH

## 1. Suggestions

- [ ] Le dashboard RH affiche le Copilote RH.
- [ ] Les suggestions sont variées.
- [ ] Les suggestions ne se répètent pas inutilement.
- [ ] Chaque suggestion contient un insight clair.
- [ ] Chaque suggestion contient une action recommandée.
- [ ] Chaque suggestion contient un brouillon propre.
- [ ] Aucun prompt brut n’est affiché.

## 2. Relances

- [ ] Le bouton “Relancer les invités” apparaît seulement pour PENDING_INVITATIONS.
- [ ] Une confirmation s’ouvre avant envoi.
- [ ] Le RH peut modifier le message.
- [ ] Le backend ne crée pas de nouvelle invitation.
- [ ] Seules les invitations PENDING sans RSVP sont relancées.
- [ ] Une invitation relancée depuis moins de 24h n’est pas relancée à nouveau.
- [ ] Une ligne est créée dans event_invitation_reminders.
- [ ] Une notification interne est créée pour l’employé.

## 3. Côté employee

- [ ] L’employé reçoit une notification.
- [ ] La notification mène vers /my-invitations?invitationId=...
- [ ] La carte invitation est mise en évidence.
- [ ] Le bouton “message de relance” apparaît seulement si une relance existe.
- [ ] Le modal affiche le message envoyé par RH.
- [ ] L’employé peut répondre YES / MAYBE / NO.

## 4. Historique admin

- [ ] event-details-admin affiche l’historique des relances.
- [ ] Chaque relance affiche le destinataire.
- [ ] Chaque relance affiche le RH émetteur.
- [ ] Chaque relance affiche le canal.
- [ ] Chaque relance affiche le statut.
- [ ] Chaque relance affiche le message envoyé.
- [ ] Les invitations affichent le nombre de relances.

## 5. Monitoring

- [ ] Le monitoring Copilote RH affiche total_calls.
- [ ] Le monitoring affiche successful_calls.
- [ ] Le monitoring affiche failed_calls.
- [ ] Le monitoring affiche qwen_usage_rate.
- [ ] Le monitoring affiche top_suggestion_types.
- [ ] Le monitoring affiche recent_calls.
- [ ] Le monitoring affiche usefulness_rate.

## 6. Feedback RH

- [ ] RH peut cliquer “Utile”.
- [ ] RH peut cliquer “Pas utile”.
- [ ] Le feedback est enregistré dans les logs.
- [ ] Le taux d’utilité est mis à jour dans le monitoring.