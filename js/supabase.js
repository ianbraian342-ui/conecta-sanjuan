// ============================================
// SUPABASE - CLIENTE Y OPERACIONES
// Usa la API REST de Supabase (PostgREST) directamente con fetch
// ============================================

// Token actual: si hay sesión iniciada se usa su JWT para que las políticas
// RLS con auth.role() = 'authenticated' funcionen; si no, se usa la anon key.
function tokenActual() {
    return sessionStorage.getItem('sb_access_token') || SUPABASE_ANON_KEY;
}

// Cabeceras básicas necesarias para autenticarse contra Supabase
function headersSupabase(extraHeaders = {}) {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${tokenActual()}`,
        'Content-Type': 'application/json',
        ...extraHeaders
    };
}

// Construir un mensaje de error legible a partir de la respuesta de Supabase.
// Incluye el código y mensaje reales del servidor (p. ej. 42501 de RLS) más
// una pista cuando es un problema típico de configuración.
async function errorSupabase(response, prefijo, pista) {
    let detalle = '';
    try {
        const data = await response.json();
        if (data && typeof data === 'object') {
            const partes = [];
            if (data.code) partes.push(data.code);
            if (data.message) partes.push(data.message);
            if (partes.length) detalle = `: ${partes.join(' - ')}`;
        }
    } catch (e) {
        // El cuerpo puede no ser JSON; se ignora
    }

    let pistaTexto = pista || '';
    if (!pistaTexto && response.status === 401) {
        pistaTexto = ' Posible causa: políticas RLS que no permiten esta operación (ejecutá sql/comentarios.sql).';
    } else if (!pistaTexto && response.status === 404) {
        pistaTexto = ' Posible causa: la tabla no existe en Supabase (ejecutá sql/comentarios.sql).';
    } else if (!pistaTexto && response.status === 400) {
        pistaTexto = ' Posible causa: bucket de Storage inexistente o datos inválidos.';
    }

    return `${prefijo} (${response.status})${detalle}${pistaTexto}`;
}

// SELECT: obtener registros de una tabla
async function supabaseSelect(tabla, opciones = 'select=*') {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?${opciones}`, {
        headers: headersSupabase()
    });

    if (!response.ok) {
        throw new Error(await errorSupabase(response, `Error al consultar ${tabla}`));
    }

    return response.json();
}

// INSERT: crear un registro
async function supabaseInsert(tabla, datos) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}`, {
        method: 'POST',
        headers: headersSupabase({ 'Prefer': 'return=representation' }),
        body: JSON.stringify(datos)
    });

    if (!response.ok) {
        throw new Error(await errorSupabase(response, `Error al crear en ${tabla}`));
    }

    return response.json();
}

// UPDATE: actualizar un registro por id
async function supabaseUpdate(tabla, id, datos) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?id=eq.${id}`, {
        method: 'PATCH',
        headers: headersSupabase({ 'Prefer': 'return=representation' }),
        body: JSON.stringify(datos)
    });

    if (!response.ok) {
        throw new Error(await errorSupabase(response, `Error al actualizar ${tabla}`));
    }

    return response.json();
}

// DELETE: eliminar un registro por id
async function supabaseDelete(tabla, id) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?id=eq.${id}`, {
        method: 'DELETE',
        headers: headersSupabase()
    });

    if (!response.ok) {
        throw new Error(await errorSupabase(response, `Error al eliminar de ${tabla}`));
    }
}

/* ============================================
   NOTICIAS - CRUD
   ============================================ */

// Obtener todas las noticias: primero las destacadas, luego por fecha descendente
async function obtenerNoticias() {
    return supabaseSelect('noticias', 'select=*&order=destacado.desc,fecha_publicacion.desc');
}

// Crear una noticia nueva
async function crearNoticia(datos) {
    const noticia = {
        titulo: datos.titulo,
        subtitulo: datos.subtitulo || '',
        contenido: datos.contenido || '',
        categoria: datos.categoria,
        autor: datos.autor,
        imagen_url: datos.imagen_url || '',
        destacado: datos.destacado || false,
        fecha_publicacion: datos.fecha_publicacion || new Date().toISOString()
    };
    return supabaseInsert('noticias', noticia);
}

// Actualizar una noticia existente por id
async function actualizarNoticia(id, datos) {
    return supabaseUpdate('noticias', id, datos);
}

// Eliminar una noticia por id
async function eliminarNoticia(id) {
    return supabaseDelete('noticias', id);
}

// Obtener categorías distintas que existen en la tabla de noticias
async function obtenerCategorias() {
    const registros = await supabaseSelect('noticias', 'select=categoria');
    const categorias = [...new Set(registros.map(r => r.categoria).filter(Boolean))].sort();
    return categorias;
}

/* ============================================
   COMENTARIOS - CRUD
   ============================================ */

// Obtener los comentarios aprobados de una noticia (portada)
async function obtenerComentarios(noticiaId) {
    return supabaseSelect(
        'comentarios',
        `select=*&noticia_id=eq.${noticiaId}&aprobado=eq.true&order=fecha_comentario.asc`
    );
}

// Crear un comentario (queda pendiente de aprobación)
async function crearComentario(datos) {
    return supabaseInsert('comentarios', datos);
}

// Obtener todos los comentarios para moderar (panel admin)
async function obtenerComentariosAdmin() {
    return supabaseSelect('comentarios', 'select=*&order=fecha_comentario.desc');
}

// Aprobar (o modificar) un comentario
async function actualizarComentario(id, datos) {
    return supabaseUpdate('comentarios', id, datos);
}

// Eliminar un comentario
async function eliminarComentario(id) {
    return supabaseDelete('comentarios', id);
}

/* ============================================
   IMÁGENES - SUPABASE STORAGE
   ============================================ */

// Sube una imagen al bucket "noticias-imagenes" y devuelve su URL pública.
// Requiere que el bucket exista y tenga las políticas de escritura habilitadas
// (ver archivo sql/comentarios.sql).
async function subirImagen(file) {
    if (!file) throw new Error('No hay archivo para subir');

    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const ruta = `noticias/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;

    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/noticias-imagenes/${ruta}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${tokenActual()}`,
            'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
    });

    if (!response.ok) {
        throw new Error(await errorSupabase(
            response,
            'Error al subir la imagen',
            ' Verificá que el bucket "noticias-imagenes" exista (ejecutá sql/comentarios.sql).'
        ));
    }

    return getImagenPublicaURL(ruta);
}

// URL pública de un archivo dentro del bucket "noticias-imagenes"
function getImagenPublicaURL(ruta) {
    return `${SUPABASE_URL}/storage/v1/object/public/noticias-imagenes/${ruta}`;
}

// (Opcional) Elimina una imagen del bucket. No se llama automáticamente al
// editar una noticia para no romper URLs ya publicadas.
async function eliminarImagen(ruta) {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/noticias-imagenes/${ruta}`, {
        method: 'DELETE',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${tokenActual()}`
        }
    });

    if (!response.ok) {
        throw new Error(await errorSupabase(response, 'Error al eliminar la imagen'));
    }
}
