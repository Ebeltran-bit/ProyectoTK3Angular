/**
 * Dirección base de la API Python (FastAPI).
 *
 * Es relativa: el navegador pide «/api/...» al mismo servidor que le sirve la web, y `ng serve`
 * la reenvía a FastAPI (http://127.0.0.1:8000) según `proxy.conf.json`. Así funciona igual en
 * http://localhost:4200 que a través del enlace de Cloudflare, donde «localhost» sería el
 * ordenador de quien abre el enlace y no el de Eva.
 */
export const API_URL = '/api';
