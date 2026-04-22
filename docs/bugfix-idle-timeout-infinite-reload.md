# Bugfix : rechargement en boucle au démarrage

## Symptôme

La page se recharge en continu (boucle), notamment sur l’écran de connexion ou juste après le chargement.

## Cause

`AppContent` désactive le timer d’inactivité en passant `Infinity` à `useIdleTimeout` :

```js
useIdleTimeout(
  idleActive ? IDLE_TIMEOUT_MS : Infinity,
  ...
)
```

En JavaScript, `setTimeout(fn, Infinity)` n’attend pas indéfiniment : la valeur est hors plage 32 bits et est **clampée** (souvent à ~1 ms). Les callbacks d’avertissement et de déconnexion s’exécutaient donc quasi immédiatement, ce qui appelait `handleLogout` → `window.location.href = '/'` → rechargement complet, en boucle.

## Correctif

Dans `src/hooks/useIdleTimeout.js` :

- Ne pas programmer de `setTimeout` si `timeoutMs` n’est pas fini ou si `timeoutMs <= warningMs`.
- Ne pas enregistrer les écouteurs d’activité dans ce cas, et nettoyer les timeouts au démontage / changement de configuration.

Date : 2026-04-22
