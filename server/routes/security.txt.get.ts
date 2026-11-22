// Ancien emplacement, encore consulté par certains outils
export default defineEventHandler(event => sendRedirect(event, '/.well-known/security.txt', 301))
