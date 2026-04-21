**Upgrades wiki**
These are the following upgrades to be considered for FIDELIO. They create a better and accessible FIDELIO experience.
- Auth Security — Password, Passkey (huella dactilar / WebAuthn), and Optional JWT for clients and merchants
- In-app security reminder for optional JWT feature
- A configuration menu for clients/merchants. Allows editing of user information, contact information, etc.
- Inactivity logout — 5min clients, 15min merchants, "Sesión cerrada por inactividad"
- Spanish translation — es-HN, simple t('key') helper, no heavy i18n library
- GCA script — CLI tool: status, vest, set-floor, list-redemptions. Goes hand in hand with the fact that GCA balance is already fetched once on mount in GcaTab via getGcaBalance. Once the GCA script is built, we just add it to the 15-second poll the same way we did for balance and transactions — one setInterval call in that same useEffect.
- An inactivity logout for admin. 5 min.