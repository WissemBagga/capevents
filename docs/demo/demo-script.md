# CapEvents — Script de démonstration

## Objectif
Faire une démonstration fluide, courte et convaincante de la plateforme.

## Durée estimé
7 à 10 minutes.

---

## 1. Introduction rapide
- Présenter CapEvents comme une plateforme interne de gestion et participation à des événements d’entreprise.
- Expliquer brièvement les 3 rôles : RH, Manager, Employé.

---

## 2. Démonstration Employé
### Étapes
1. Connexion en tant qu’employé
2. Afficher le dashboard employé
3. Aller sur la liste des événements
4. Ouvrir le détail d’un événement publié
5. S’inscrire à l’événement
6. Montrer la notification reçue
7. Aller sur `Mes événements`
8. Montrer `Mes invitations`
9. Proposer un événement
10. Aller sur `Mes demandes`
11. Montrer la page `Mes points`
12. Montrer la page `Événements passés`
13. Ouvrir un détail passé avec feedback public

### Message à expliquer
- participation simple
- invitations
- proposition d’événement
- engagement et points

---

## 3. Démonstration Manager
### Étapes
1. Connexion en tant que manager
2. Afficher dashboard / stats manager
3. Montrer le périmètre départemental
4. Ouvrir un événement administrable
5. Inviter des collaborateurs
6. Voir les participants
7. Marquer une présence
8. Montrer la page `Demandes en attente`
9. Approuver ou refuser une proposition

### Message à expliquer
- administration locale du département
- suivi de l’engagement équipe
- validation des demandes

---

## 4. Démonstration RH
### Étapes
1. Connexion en tant que RH
2. Afficher dashboard / stats RH
3. Montrer les analytics globales
4. Créer un événement global
5. Modifier / publier si nécessaire
6. Montrer `Utilisateurs & rôles`
7. Changer un rôle utilisateur
8. Montrer `Départements`
9. Montrer la comparaison par département dans les analytics

### Message à expliquer
- administration globale
- pilotage global de la plateforme
- gouvernance des rôles et départements

---

## 5. Partie technique courte à expliquer
- Backend Spring Boot + PostgreSQL + Flyway
- Frontend Angular standalone
- JWT + refresh token cookie HttpOnly
- rôles `ROLE_EMPLOYEE`, `ROLE_MANAGER`, `ROLE_HR`
- architecture simple et progressive adaptée au PFE

---

## 6. Conclusion
- Les objectifs atteints
- La plateforme couvre l’ensemble du cycle :
  - création
  - publication
  - participation
  - invitation
  - feedback
  - analytics
  - calendrier
  - gamification avancée
  - IA / recommandations
