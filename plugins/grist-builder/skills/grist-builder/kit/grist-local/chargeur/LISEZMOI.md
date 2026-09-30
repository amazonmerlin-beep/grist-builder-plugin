Copie du « Custom widget builder » de Grist Labs (https://gristlabs.github.io/grist-widget/custom-widget-builder/),
servie par le Grist local sous /v/local/chargeur/custom-widget-builder/index.html.

Pourquoi : avec le chargeur public (github.io), Chrome bloque les appels du widget vers http://localhost
(protection « réseau local ») : l'aperçu des pièces jointes échoue en local, et seulement en local.
Servi par le Grist local, le widget est sur le même réseau que Grist : plus de blocage.
Sur une instance publique, le chargeur public convient (tout est public) ; cette copie peut aussi y être hébergée
si l’hébergeur ou le client préfère ne pas dépendre de github.io. Seule modification : grist-plugin-api.js chargé depuis
l'instance elle-même (/grist-plugin-api.js) au lieu de docs.getgrist.com.
