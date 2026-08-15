# henne.06

Site vitrine et réservation de henné traditionnel, prêt pour Netlify.

## Déploiement Netlify

Connecte le repo GitHub dans Netlify puis utilise ces réglages :

- Build command : `npm run build`
- Publish directory : `dist`
- Branch : `main`

Le formulaire `booking` est configuré avec Netlify Forms. Après le premier
déploiement, les demandes apparaissent dans l'onglet Forms du site Netlify.

## Développement local

```bash
npm install
npm run dev
```

## Vérification

```bash
npm run lint
npm run test
```

La réservation bloque les créneaux localement dans le navigateur après envoi.
Pour un blocage partagé entre tous les visiteurs, il faudra ajouter une base de
données ou un outil externe comme Airtable, Supabase ou Neon.
