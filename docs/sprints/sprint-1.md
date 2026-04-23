# Sprint 1 - Socle plateforme

## Objectif
Mettre en place le socle technique et fonctionnel de CapEvents :
- infrastructure locale
- base de données
- sécurité
- authentification
- rôles
- navigation globale
- dashboards de base
- CRUD principal des événements

## Infrastructure et environnement
### Docker Compose
Le projet peut démarrer un environnement local avec :
- PostgreSQL 16
- pgAdmin
- base `capevents`
- port PostgreSQL local `5433`
- pgAdmin sur `5050`

### Base de données
- PostgreSQL
- schéma géré par Flyway
- `ddl-auto: validate` côté JPA
- base de référence stable pour le backend

### Swagger
Swagger / OpenAPI permet de :
- tester les endpoints backend
- valider les routes sécurisées
- accélérer les tests manuels

## Authentification et sécurité
### Principe global
L'architecture correcte à retenir pour le projet est :
- access token côté frontend
- refresh token en cookie HttpOnly
- renouvellement automatique de session
- logout backend + frontend propre

### Flux auth
#### Register
- création d'un compte employé
- validation du domaine email autorisé
- hash du mot de passe
- création de l'utilisateur
- attribution du rôle `ROLE_EMPLOYEE`
- génération d'un token de vérification email

#### Verify email
- vérification du token
- activation du compte
- confirmation de l'adresse email

#### Login
- authentification via Spring Security
- génération d'un access token JWT
- génération d'un refresh token
- stockage de l'access token côté frontend
- récupération du profil courant via `/api/auth/me`

#### Refresh
- quand l'access token expire, le frontend tente un refresh
- le backend lit le cookie refresh
- si valide, il renvoie un nouvel access token

#### Logout
- révocation du refresh token
- suppression du cookie
- nettoyage de la session frontend

### Spring Security
- configuration `STATELESS`
- filtre JWT personnalisé
- routes auth publiques
- routes métier protégées
- rôles gérés via autorités Spring

## Rôles
- `ROLE_EMPLOYEE`
- `ROLE_MANAGER`
- `ROLE_HR`

### Règle métier importante
Le rôle principal frontend suit cette hiérarchie :
- HR -> Manager -> Employee

## Frontend Sprint 1
### Structure
- Angular standalone
- `AppShell`
- `Sidebar`
- `Navbar`
- `auth.service.ts`
- `jwt.interceptor.ts`
- `auth.guard.ts`
- `role.guard.ts`

### Pages principales
- Login
- Register
- Forgot password
- Reset password
- Verify email
- Dashboard employé
- Dashboard RH / Manager de base
- Liste des événements
- Détail public d'événement
- Create event
- Edit event

## Événements
### Fonctionnalités principales
- création d'événement
- édition
- publication
- détail public
- détail admin
- audience `GLOBAL` / `DEPARTMENT`
- département cible
- image d'événement
- capacité
- date / durée / lieu / deadline

### Visibilité
- un employé voit les événements publiés visibles pour lui
- `GLOBAL` : visible globalement
- `DEPARTMENT` : visible selon le département ciblé

## Résultat du Sprint 1
À la fin du Sprint 1, CapEvents dispose :
- d'une base technique propre
- d'une authentification fonctionnelle
- d'une sécurité par rôles
- d'un shell frontend structuré
- d'un premier cycle complet de gestion d'événements
