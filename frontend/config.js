// Em desenvolvimento, a API roda em :3001; em produção, usa /api na mesma origem.
// Para hospedar a API em outro domínio, altere a URL abaixo e configure CORS_ORIGIN.
const isLocal=['localhost','127.0.0.1'].includes(window.location.hostname);
export const API_BASE_URL=isLocal?'http://localhost:3001/api':window.location.origin+'/api';
