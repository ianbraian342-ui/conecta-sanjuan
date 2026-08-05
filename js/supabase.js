// ============================================
// SUPABASE - CLIENTE Y OPERACIONES DE NOTICIAS
// Usa la API REST de Supabase (PostgREST) directamente con fetch
// ============================================

// Cabeceras básicas necesarias para autenticarse contra Supabase
function headersSupabase(extraHeaders = {}) {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...extraHeaders
    };
}

// SELECT: obtener registros de una tabla
async function supabaseSelect(tabla, opciones = 'select=*') {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?${opciones}`, {
        headers: headersSupabase()
    });

    if (!response.ok) {
        throw new Error(`Error al consultar ${tabla} (${response.status})`);
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
        throw new Error(`Error al crear en ${tabla} (${response.status})`);
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
        throw new Error(`Error al actualizar ${tabla} (${response.status})`);
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
        throw new Error(`Error al eliminar de ${tabla} (${response.status})`);
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
