# CapEvents — Documentation projet

## Objectif
Ce dossier regroupe une base documentaire simple et exploitable pour le dépôt Git et pour le PFE.

## Structure recommandée
- `README.md` : vue d'ensemble du projet
- `docs/sprints/sprint-1.md` : socle technique et fonctionnel
- `docs/sprints/sprint-2.md` : participation, invitations, points, feedback, notifications
- `docs/sprints/sprint-3.md` : optimisations, analytics, rôles avancés, événements passés
- `docs/diagrams/` : diagrammes Mermaid versionnés dans Git

## Stack
- Backend : Spring Boot, Spring Security, Spring Data JPA, PostgreSQL, Flyway, JWT
- Frontend : Angular standalone
- Infra locale : Docker Compose, PostgreSQL, pgAdmin
- Tests backend manuels : Swagger / OpenAPI

## Rôles métier
- `ROLE_HR` : administrateur global
- `ROLE_MANAGER` : administrateur de son département
- `ROLE_EMPLOYEE` : participant
- Un manager ou un RH peut aussi avoir `ROLE_EMPLOYEE` pour accéder aux fonctionnalités de participation.

## Répartition par sprint
### Sprint 1
Socle plateforme : auth, sécurité, Docker, PostgreSQL, Flyway, Swagger, dashboards de base, CRUD événements.

### Sprint 2
Invitations, participants, RSVP, points, feedback et notifications.

### Sprint 3
Optimisations, gamification, calendrier, analytics, IA, brouillons et polish.  
Dans l'état actuel du projet, une partie Sprint 3 est déjà avancée sur :
- analytics RH / manager
- monthly trend
- top members
- department rows
- événements passés
- feedback public enrichi
- gestion fine des rôles
- optimisations admin

## Recommandation documentation Git
La structure la plus propre pour ton dépôt est :
1. un fichier global de projet
2. un fichier par sprint
3. un dossier `docs/diagrams` avec les diagrammes Mermaid
4. plus tard, éventuellement un dossier `docs/api` ou `docs/screens`

## Convention utile
Quand une fonctionnalité a commencé dans un sprint mais a été finie plus tard, documente-la dans :
- le sprint où elle a été introduite,
- puis rappelle dans le sprint suivant les enrichissements importants.

## Diagrammes inclus
Voir `docs/diagrams/index.md`.
