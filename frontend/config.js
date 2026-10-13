// Servidor estático de desenvolvimento (:5500) usa API local (:3001).
// Docker Compose (:8080) e produção usam proxy /api na mesma origem.
const {hostname,port,origin}=window.location;
const localDev=['localhost','127.0.0.1'].includes(hostname)&&port==='5500';
export const API_BASE_URL=localDev?'http://localhost:3001/api':origin+'/api';
