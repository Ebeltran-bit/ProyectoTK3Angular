/**
 * Ids de las escenas que tienen versión 3D. Va en un archivo aparte, sin three.js, para
 * que el reproductor pueda saberlo sin descargar la librería.
 * Hoy están las nueve; una escena que no esté aquí usaría su versión plana.
 */
export const CON_3D: readonly string[] = [
  'puerto',
  'bar',
  'huerto',
  'ramen',
  'correos',
  'patitos',
  'observatorio',
  'barberia',
  'mecanografa',
];
