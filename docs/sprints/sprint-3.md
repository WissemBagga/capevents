# Sprint 3 - Optimisations, Analytics, rôles avancés et événements passés

## Objectif
Faire monter CapEvents en maturité :
- analytics RH / Manager
- optimisations admin
- gestion plus fine des rôles
- événements passés
- feedback public enrichi
- base pour la gamification, le calendrier et l'IA

## 1. Analytics avancées RH / Manager
### Vue overview
Le backend calcule notamment :
- totalEvents
- publishedEvents
- totalRegistrations
- totalCapacity
- registrationRate
- totalPresent
- totalAbsent
- attendanceRate
- totalFeedbacks
- averageRating
- feedbackResponseRate

### Restitution enrichie
- top rated events
- top engaging events
- active members
- pending proposals
- top members
- member rows
- monthly trend
- department rows

## 2. Monthly trend
Le projet calcule une tendance mensuelle des inscriptions :
- agrégation par mois
- restitution chronologique
- base de visualisation manager / RH

## 3. Top members
Le projet calcule les membres les plus engagés selon :
- nombre d'inscriptions
- nombre de présences
- taux de présence

## 4. Department rows
Le RH dispose d'une vue comparative par département :
- total employees
- active employees
- participation rate
- average rating

## 5. Événements passés
### Fonctionnalités
- page `Événements passés`
- filtres catégorie / département / audience / recherche
- pagination
- cartes d'événements passés
- affichage note moyenne / nombre d'avis / présents

## 6. Feedback public enrichi
### But
Valoriser les événements passés et inspirer les futurs participants.

### Structure
- note moyenne
- nombre d'avis
- taux de retour
- highlights
- improvement points
- commentaires publics anonymisés

### Règle importante
Le commentaire n'est public que si :
- un commentaire existe
- l'utilisateur l'a explicitement autorisé
- le partage est anonyme

## 7. Gestion fine des rôles
### Évolutions importantes
- promotion RH avec confirmation
- contrôle manager unique par département
- cohérence entre rôle admin et participation
- réparation des comptes admin qui doivent aussi avoir `ROLE_EMPLOYEE`

## 8. Optimisations admin
### Départements
- page de gestion des départements

### Utilisateurs et rôles
- page RH de gestion des rôles
- warning et feedback utilisateur
- cohérence de l'expérience admin

### Stats
- filtres date / département / catégorie
- export Excel
- restitution plus professionnelle

## 9. Ce qui reste encore dans l'esprit Sprint 3
- calendrier
- gamification avancée
- IA / recommandations
- polish final global

## Résultat du Sprint 3
Le Sprint 3 fait évoluer CapEvents vers :
- un outil plus pilotable pour RH / managers
- une meilleure gouvernance des rôles
- une meilleure lecture de la performance des événements
- une expérience plus riche autour de l'historique et du feedback
