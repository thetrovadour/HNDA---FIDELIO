**Upgrades wiki**
These are the following upgrades to be considered for FIDELIO. They create a better and accessible FIDELIO experience.
- Auth Security — Password, Passkey (huella dactilar / WebAuthn), and Optional JWT for clients and merchants
- In-app security reminder for optional JWT feature
- A configuration menu for clients/merchants. Allows editing of user information, contact information, etc.
- Inactivity logout — 5min clients, 15min merchants, "Sesión cerrada por inactividad"
- Spanish translation — es-HN, simple t('key') helper, no heavy i18n library
- GCA script — CLI tool: status, vest, set-floor, list-redemptions. Goes hand in hand with the fact that GCA balance is already fetched once on mount in GcaTab via getGcaBalance. Once the GCA script is built, we just add it to the 15-second poll the same way we did for balance and transactions — one setInterval call in that same useEffect.
- An inactivity logout for admin. 5 min.
- Search bar in "Red" tab in client/page.tsx
- When clicking a merchant, pop-up a small box (kinda like an ad when you click a video on youtube). Contains photos, cellphone number, owner's name, physical address and wallet address. Address first 6 characters and last 6 are the shown with three dots dividing them. First 3 and last 3 characters are highlighted in gold to highlight the address.  Add photo/icon/letter option to the small box in the red tab as well. 
- Merchant application page — a dedicated /apply page where clients can apply to become a merchant. Linked from the client Ajustes tab ("Aplicar para Comercio").
- Registration page — a dedicated /register page with a single form that allows users to register as either a client or a merchant. Linked from a "Join Network" button on the main page.tsx (FIDELIO landing).
