/* GIF and Memory · PWA — configuración (único archivo que debes tocar si algo cambia) */
window.GM_CONFIG = {
  // Dirección /exec de tu aplicación web de Apps Script (la misma de la app Android)
  EXEC_URL: "https://script.google.com/macros/s/AKfycbwoMVOMXOXfuzF66EhKNEAl-04jJY3AQf8X_E9g56LWjjP5aYyPcEs_gaU-TODgnhfSKw/exec",
  // ID de cliente de Google (público). Debe ser el mismo que PWA_GOOGLE_CLIENT_IDS en ApiPWA.gs
  GOOGLE_CLIENT_ID: "846284373600-t8lpa9gcr5r6o930d1qtslbkarmgih66.apps.googleusercontent.com",
  // Color de la barra superior
  THEME: "#000000",
  // Ancho de pantalla con el que la app Android dibuja todo (px CSS). La PWA lo copia para verse IDÉNTICA.
  // Si en el celular la ves más grande que en la app Android, SUBE este número (ej. 1080); si más chica, BÁJALO (ej. 980).
  ANCHO_PANTALLA: 1020,
  // Tamaño de ventana al abrir la app instalada en computador (igual a un celular)
  VENTANA_ESCRITORIO: { ancho: 412, alto: 860 }
};
