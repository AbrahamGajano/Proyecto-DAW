// Ayuda limitada a autenticación. Álvaro podrá sustituirla por su fetch común.
export async function authRequest(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.');
  }
  if (response.status === 204) return null;
  let result;
  try { result = await response.json(); }
  catch { throw new Error('El servidor ha devuelto una respuesta inesperada.'); }
  if (!response.ok) {
    const error = new Error(result.error?.mensaje ?? 'No se pudo completar la operación.');
    error.campos = result.error?.campos ?? {};
    error.status = response.status;
    throw error;
  }
  return result.data;
}
