# Diagramme 10 - Notifications

```mermaid
flowchart LR
    ACT[Action métier (ex: annulation event)] --> N[NotificationService]
    N --> DB[(Table notifications)]

    USER[Utilisateur] --> TOP[Topbar / Cloche UI]
    TOP --> API[/API Notifications Controller/]
    API --> N
    N --> DB
```
