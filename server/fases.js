
// Calcula la fase sin modificar ni guardar datos.
// "ahora" se recibe como argumento para poder probar distintas horas.
export function calcularFase(carrera, anteriorResuelta, ahora) {
  if (carrera.cancelada) {
    return 'cancelada';
  }

  if (carrera.tieneResultado) {
    return 'finalizada';
  }

  // Hasta que la anterior termine o se cancele, esta no se abre.
  if (!anteriorResuelta) {
    return 'pendiente';
  }

  const cierre = new Date(carrera.horaCierre);

  // A la hora exacta del cierre ya no se permite jugar.
  if (ahora.getTime() >= cierre.getTime()) {
    return 'cerrada';
  }

  return 'abierta';
  
}
// Recibe las carreras de una sola temporada, ordenadas por ronda.
export function obtenerCarreraAbierta(carreras, ahora) {
  for (const carrera of carreras) {
    // Las carreras resueltas no bloquean las siguientes.
    if (carrera.cancelada || carrera.tieneResultado) {
      continue;
    }

    // Es la primera sin resolver: todas las anteriores están resueltas.
    const fase = calcularFase(carrera, true, ahora);

    if (fase === 'abierta') {
      return carrera;
    }

    // Si está cerrada y sin resultado, ninguna posterior se puede jugar.
    return null;
  }

  // No quedan carreras sin resolver.
  return null;
}