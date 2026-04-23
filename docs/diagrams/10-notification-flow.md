# Diagramme 10 — Notifications

```mermaid
flowchart LR
    ACT[Action métier] --> N[NotificationService]
    N --> DB[(Table notifications)]
    DB --> API[/api/notifications]
    API --> TOP[Topbar / cloche]
    TOP --> USER[Utilisateur]
```
