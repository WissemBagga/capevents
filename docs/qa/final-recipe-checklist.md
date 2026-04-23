# CapEvents — Checklist de recette finale

## Objectif
Validation de la plateforme page par page et flux par flux.

## Pré-requis
- Backend lancé sur `http://localhost:8080`
- Frontend lancé sur `http://localhost:4200`
- Base PostgreSQL disponible
- Données minimales présentes :
  - 1 RH
  - 1 Manager
  - 2 Employés
  - au moins 3 départements
  - plusieurs événements dans différents statuts

---

## 1. Authentification

### 1.1 Login
- [ ] Login RH valide
- [ ] Login Manager valide
- [ ] Login Employé valide
- [ ] Message d’erreur si mot de passe invalide
- [ ] Message d’erreur si email inexistant
- [ ] Redirection correcte selon le rôle principal

### 1.2 Register
- [ ] Création de compte avec email `@capgemini.com`
- [ ] Refus d’un email hors domaine autorisé
- [ ] Vérification des champs obligatoires
- [ ] Message de succès après inscription

### 1.3 Verify email
- [ ] L’écran de vérification s’ouvre correctement
- [ ] Le compte passe en email vérifié
- [ ] Message d’erreur si token/code invalide

### 1.4 Forgot / Reset password
- [ ] Demande de réinitialisation fonctionne
- [ ] Réception du lien/code selon ton implémentation
- [ ] Réinitialisation effective du mot de passe
- [ ] Connexion possible avec le nouveau mot de passe

### 1.5 Session / refresh token
- [ ] L’utilisateur reste connecté après rechargement simple
- [ ] Refresh automatique si access token expiré
- [ ] Logout supprime bien la session
- [ ] Accès refusé après logout sur les pages protégées

---

## 2. Rôles et sécurité

### 2.1 Contrôle d’accès
- [ ] Un employé ne peut pas accéder aux pages admin
- [ ] Un manager ne peut accéder qu’à son périmètre autorisé
- [ ] Un RH peut accéder à toutes les pages admin
- [ ] Les pages 403 / 404 fonctionnent correctement

### 2.2 Gestion des rôles
- [ ] RH peut modifier un rôle utilisateur
- [ ] Warning rouge affiché pour promotion RH
- [ ] Confirmation obligatoire pour promotion RH
- [ ] Notification envoyée à l’utilisateur cible
- [ ] Email envoyé à l’utilisateur cible
- [ ] Un manager réparé garde aussi l’accès participation si `ROLE_EMPLOYEE`

---

## 3. Départements
- [ ] Liste des départements se charge
- [ ] Ajout d’un département fonctionne
- [ ] Refus des champs invalides / vides

---

## 4. Événements — consultation

### 4.1 Liste publique / employé
- [ ] La page événements se charge
- [ ] Les cartes s’affichent correctement
- [ ] Les images s’affichent correctement
- [ ] Les filtres fonctionnent
- [ ] Les événements complets / deadline dépassée sont bien signalés

### 4.2 Détail événement
- [ ] Le détail se charge correctement
- [ ] Les infos principales sont cohérentes
- [ ] Les messages de blocage sont cohérents selon le cas
- [ ] Aucun doublon de messages métier

### 4.3 Événements passés
- [ ] La page `events/past` est accessible
- [ ] Les filtres catégorie / département / audience fonctionnent
- [ ] Les cartes passées s’affichent proprement
- [ ] Le clic sur un événement passé ouvre son détail

---

## 5. Événements — administration

### 5.1 Create event
- [ ] RH peut créer un événement global
- [ ] RH peut créer un événement départemental
- [ ] Manager peut créer un événement de son département
- [ ] Manager ne peut pas créer un global non autorisé
- [ ] Le mode brouillon fonctionne
- [ ] Le mode créer et publier fonctionne

### 5.2 Edit event
- [ ] Modification des champs texte fonctionne
- [ ] Modification date / durée / capacité fonctionne
- [ ] Modification audience / département cible fonctionne
- [ ] Gestion image / couverture fonctionne
- [ ] Le bouton enregistrer se débloque correctement

### 5.3 Statuts événement
- [ ] Publication fonctionne
- [ ] Annulation fonctionne
- [ ] Reprogrammation fonctionne
- [ ] Archivage / fin de cycle cohérent

---

## 6. Participation

### 6.1 Inscription
- [ ] Un employé peut s’inscrire à un événement publié
- [ ] Le statut d’inscription se met à jour
- [ ] Notification “inscription confirmée” reçue
- [ ] Points d’inscription attribués

### 6.2 Désinscription
- [ ] Désinscription possible si règles métier respectées
- [ ] Raison obligatoire bien prise en compte
- [ ] Blocage si invitations envoyées encore en attente
- [ ] Message utilisateur cohérent

### 6.3 Mes événements
- [ ] La page `my-events` charge bien les événements inscrits
- [ ] Les liens de détail fonctionnent
- [ ] Les statuts / badges sont cohérents

---

## 7. Invitations et RSVP

### 7.1 Invitations admin
- [ ] RH peut inviter des utilisateurs
- [ ] Manager peut inviter dans son périmètre
- [ ] Les invitations apparaissent côté admin

### 7.2 Invitations employé
- [ ] Un employé inscrit peut inviter des collègues autorisés
- [ ] La liste des collègues invitables est correcte
- [ ] Les invitations envoyées sont visibles

### 7.3 Mes invitations / RSVP
- [ ] La page `my-invitations` charge correctement
- [ ] Réponse YES fonctionne
- [ ] Réponse MAYBE fonctionne
- [ ] Réponse NO fonctionne
- [ ] L’état se met à jour correctement

---

## 8. Présence / attendance
- [ ] L’admin voit la liste des participants
- [ ] Marquage PRESENT fonctionne
- [ ] Marquage ABSENT fonctionne
- [ ] Les statistiques de présence se mettent à jour
- [ ] Les règles de visibilité selon date / timing choisi sont cohérentes

---

## 9. Notifications in-app
- [ ] La cloche s’affiche
- [ ] Le badge non lus est correct
- [ ] Le panel dropdown s’ouvre
- [ ] Les notifications se chargent
- [ ] Marquer comme lu fonctionne
- [ ] Marquer tout comme lu fonctionne
- [ ] Les `actionPath` redirigent au bon endroit

---

## 10. Emails essentiels
- [ ] Email d’invitation envoyé
- [ ] Email d’inscription envoyé
- [ ] Email d’annulation envoyé
- [ ] Email de reprogrammation envoyé
- [ ] Email de changement de rôle envoyé
- [ ] Email proposition soumise / approuvée / refusée envoyé

---

## 11. Propositions d’événements

### 11.1 Côté employé
- [ ] Un employé peut proposer un événement
- [ ] La logique direct publish / pending fonctionne selon tes règles métier
- [ ] La page `my-submissions` charge correctement
- [ ] Les statuts affichés sont corrects

### 11.2 Côté admin
- [ ] La page `pending-events` charge correctement
- [ ] Approver fonctionne
- [ ] Reject avec raison obligatoire fonctionne
- [ ] Notifications et emails associés partent correctement

---

## 12. Feedback
- [ ] Un utilisateur présent peut envoyer un feedback
- [ ] Un utilisateur absent ne peut pas envoyer un feedback
- [ ] Un seul feedback par événement et utilisateur
- [ ] Le partage public anonyme fonctionne
- [ ] Les points feedback sont attribués

---

## 13. Points
- [ ] La page `my-points` charge correctement
- [ ] Le total est cohérent
- [ ] L’historique est cohérent
- [ ] Les bonus inscription / présence / feedback / proposition sont cohérents

---

## 14. Analytics RH / Manager
- [ ] La page analytics se charge
- [ ] Les KPI globaux sont cohérents
- [ ] Les top events s’affichent
- [ ] Les top members s’affichent
- [ ] Le monthly trend s’affiche
- [ ] Les department rows s’affichent
- [ ] Les filtres `from/to/department/category` fonctionnent ensemble
- [ ] Export Excel fonctionne

---

## 15. Profil / intérêts
- [ ] La page profil charge correctement
- [ ] La mise à jour du profil fonctionne
- [ ] La page intérêts charge correctement
- [ ] La mise à jour des intérêts fonctionne

---

## 16. Vérification finale
- [ ] Aucun bug bloquant connu sur le scénario principal
- [ ] Les rôles RH / Manager / Employé ont été testés
- [ ] Les captures d’écran principales sont prêtes
- [ ] Le script de démo a été testé une fois en entier
- [ ] Le projet build et démarre proprement
