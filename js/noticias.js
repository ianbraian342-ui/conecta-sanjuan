// ============================================
// NOTICIAS - RENDERIZADO Y GESTIÓN DE INTERFAZ
// Funciones para mostrar noticias en la portada y en el panel admin
// ============================================

// Lista completa de noticias (se usa para los filtros por categoría)
window.noticiasTodas = [];
// Categoría actualmente seleccionada en el menú de filtros
window.categoriaActual = '';
// URL actual de la imagen en el formulario del admin (al editar)
window.imagenUrlActual = '';
// Archivo de imagen seleccionado para subir (null si no hay archivo nuevo)
window.imagenArchivo = null;

// Escapar texto para insertarlo en HTML sin riesgo de XSS
function escapeHTML(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Formatear fecha ISO a formato legible en español
function formatearFecha(fechaISO) {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Generar el HTML de una tarjeta de noticia para la portada
function tarjetaNoticiaHTML(noticia) {
    const imagenUrl = noticia.imagen_url || 'https://via.placeholder.com/600x400/e9ecef/6c757d?text=Sin+imagen';
    const fechaFormateada = formatearFecha(noticia.fecha_publicacion);
    const claseDestacado = noticia.destacado ? 'destacado' : '';
    const badgeDestacado = noticia.destacado ? '<span class="noticia-badge-destacado">⭐ Destacada</span>' : '';

    return `
        <div class="noticia-card ${claseDestacado}" data-id="${noticia.id}">
            <img class="noticia-imagen" src="${escapeHTML(imagenUrl)}" alt="${escapeHTML(noticia.titulo)}" onerror="this.src='https://via.placeholder.com/600x400/e9ecef/6c757d?text=Sin+imagen'">
            <div class="noticia-contenido">
                <span class="noticia-categoria">${escapeHTML(noticia.categoria)}</span>
                ${badgeDestacado}
                <h2 class="noticia-titulo">${escapeHTML(noticia.titulo)}</h2>
                ${noticia.subtitulo ? `<p class="noticia-subtitulo">${escapeHTML(noticia.subtitulo)}</p>` : ''}
                <div class="noticia-metadata">
                    <span class="noticia-autor">✍️ ${escapeHTML(noticia.autor)}</span>
                    <span class="noticia-fecha">📅 ${fechaFormateada}</span>
                </div>
            </div>
        </div>
    `;
}

// Mostrar noticias en la portada (grid de tarjetas) y habilitar clic para detalle
function mostrarNoticias(noticias, contenedorId = 'noticias-container') {
    const container = document.getElementById(contenedorId);

    if (!noticias || noticias.length === 0) {
        container.innerHTML = '<div class="sin-noticias">📭 No hay noticias disponibles por el momento.</div>';
        return;
    }

    let html = '<div class="noticias-grid">';
    noticias.forEach(noticia => {
        html += tarjetaNoticiaHTML(noticia);
    });
    html += '</div>';

    container.innerHTML = html;

    // Al hacer clic en una tarjeta se abre el modal de detalle con comentarios
    container.querySelectorAll('.noticia-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const noticia = window.noticiasTodas.find(n => String(n.id) === String(id));
            if (noticia) abrirDetalleNoticia(noticia);
        });
    });
}

// Abrir el modal con el detalle completo de la noticia (contenido con formato + comentarios)
function abrirDetalleNoticia(noticia) {
    const cuerpo = document.getElementById('modal-cuerpo');
    const badgeDestacado = noticia.destacado ? '<span class="noticia-badge-destacado">⭐ Destacada</span>' : '';
    const fechaFormateada = formatearFecha(noticia.fecha_publicacion);

    // El contenido se inyecta con innerHTML porque guarda HTML formateado (Quill)
    cuerpo.innerHTML = `
        <article class="detalle">
            ${noticia.imagen_url ? `<img class="detalle-imagen" src="${escapeHTML(noticia.imagen_url)}" alt="${escapeHTML(noticia.titulo)}" onerror="this.style.display='none'">` : ''}
            <span class="noticia-categoria">${escapeHTML(noticia.categoria)}</span>
            ${badgeDestacado}
            <h2>${escapeHTML(noticia.titulo)}</h2>
            ${noticia.subtitulo ? `<p class="detalle-subtitulo">${escapeHTML(noticia.subtitulo)}</p>` : ''}
            <div class="detalle-metadata">
                <span class="noticia-autor">✍️ ${escapeHTML(noticia.autor)}</span>
                <span class="noticia-fecha">📅 ${fechaFormateada}</span>
            </div>
            <div class="detalle-contenido">${noticia.contenido || '<p>Sin contenido.</p>'}</div>
        </article>
        ${plantillaComentarios()}
    `;

    document.getElementById('modal-noticia').style.display = 'flex';
    document.getElementById('modal-noticia').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Cargar comentarios aprobados y conectar el formulario
    cargarComentariosNoticia(noticia.id);
}

// Cerrar el modal de detalle
function cerrarDetalleNoticia() {
    const modal = document.getElementById('modal-noticia');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

// Cargar y mostrar las noticias en la portada (index.html)
async function cargarNoticiasPortada(contenedorId = 'noticias-container') {
    const container = document.getElementById(contenedorId);

    try {
        container.innerHTML = '<div class="loading">Cargando noticias</div>';

        const noticias = await obtenerNoticias();
        window.noticiasTodas = noticias;

        // Si hay un filtro activo se vuelve a aplicar, si no se muestra todo
        if (window.categoriaActual) {
            filtrarPorCategoria(window.categoriaActual);
        } else {
            mostrarNoticias(noticias, contenedorId);
        }

    } catch (error) {
        console.error('Error al cargar noticias:', error);
        container.innerHTML = `
            <div class="error">
                ❌ Error al cargar las noticias: ${escapeHTML(error.message)}
                <br><br>
                <small>Verifica que la URL y la clave de Supabase sean correctas.</small>
            </div>
        `;
    }
}

// Filtrar las noticias de la portada por categoría ('' muestra todas)
function filtrarPorCategoria(categoria) {
    window.categoriaActual = categoria || '';
    const container = document.getElementById('noticias-container');
    if (!container) return;

    if (!window.categoriaActual) {
        mostrarNoticias(window.noticiasTodas);
        return;
    }

    const filtradas = window.noticiasTodas.filter(n => n.categoria === window.categoriaActual);
    mostrarNoticias(filtradas);
}

// Cargar el menú de categorías (botones píldora) en la portada
async function cargarCategorias(contenedorId = 'categorias-menu') {
    const menu = document.getElementById(contenedorId);
    if (!menu) return;

    try {
        const categorias = await obtenerCategorias();

        let html = '<button class="btn-pill activo" data-categoria="">Todas</button>';
        categorias.forEach(cat => {
            html += `<button class="btn-pill" data-categoria="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`;
        });
        menu.innerHTML = html;
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        menu.innerHTML = '<button class="btn-pill activo" data-categoria="">Todas</button>';
    }
}

// Generar la tabla de noticias para el panel admin
function mostrarListaAdmin(noticias, tablaBodyId = 'tabla-body') {
    const tbody = document.getElementById(tablaBodyId);

    if (!noticias || noticias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">📭 No hay noticias cargadas.</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    noticias.forEach(noticia => {
        const fila = document.createElement('tr');
        const destacadoBadge = noticia.destacado ? '⭐' : '';

        fila.innerHTML = `
            <td class="celda-titulo">${escapeHTML(noticia.titulo)} ${destacadoBadge}</td>
            <td>${escapeHTML(noticia.categoria)}</td>
            <td>${escapeHTML(noticia.autor)}</td>
            <td>${formatearFecha(noticia.fecha_publicacion)}</td>
            <td>
                <button class="acciones-boton btn-editar" data-id="${noticia.id}">✏️ Editar</button>
                <button class="acciones-boton btn-eliminar" data-id="${noticia.id}">🗑️ Eliminar</button>
            </td>
        `;

        tbody.appendChild(fila);
    });

    // Delegación de eventos para editar y eliminar
    tbody.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => {
            const noticia = noticias.find(n => n.id == btn.dataset.id);
            llenarFormularioEdicion(noticia);
        });
    });

    tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('¿Seguro que querés eliminar esta noticia?')) return;
            try {
                await eliminarNoticia(btn.dataset.id);
                mostrarMensajeAdmin('Noticia eliminada correctamente ✅', 'exito');
                await cargarNoticiasAdmin();
            } catch (error) {
                mostrarMensajeAdmin('❌ ' + error.message, 'error');
            }
        });
    });
}

// Cargar y mostrar las noticias en el panel admin
async function cargarNoticiasAdmin() {
    try {
        const noticias = await obtenerNoticias();
        mostrarListaAdmin(noticias);
    } catch (error) {
        const tbody = document.getElementById('tabla-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6">❌ ${escapeHTML(error.message)}</td></tr>`;
        }
    }
}

// Llenar el formulario del admin con los datos de una noticia para editarla
function llenarFormularioEdicion(noticia) {
    document.getElementById('form-titulo').textContent = 'Editar noticia';

    document.getElementById('noticia-id').value = noticia.id || '';
    document.getElementById('noticia-titulo').value = noticia.titulo || '';
    document.getElementById('noticia-subtitulo').value = noticia.subtitulo || '';
    setContenidoEditor(noticia.contenido || '');
    document.getElementById('noticia-categoria').value = noticia.categoria || '';
    document.getElementById('noticia-autor').value = noticia.autor || '';
    document.getElementById('noticia-destacado').checked = Boolean(noticia.destacado);

    // Imagen: se mantiene la URL actual y no se elimina la imagen antigua al editar
    window.imagenUrlActual = noticia.imagen_url || '';
    window.imagenArchivo = null;
    setVistaPrevia(window.imagenUrlActual);

    const inputFile = document.getElementById('noticia-imagen');
    if (inputFile) inputFile.value = '';

    document.getElementById('form-noticia-wrap').style.display = 'block';
    document.getElementById('noticia-titulo').focus();
}

// Limpiar el formulario para crear una noticia nueva
function limpiarFormularioNoticia() {
    document.getElementById('form-titulo').textContent = 'Nueva noticia';

    document.getElementById('noticia-id').value = '';
    document.getElementById('noticia-titulo').value = '';
    document.getElementById('noticia-subtitulo').value = '';
    setContenidoEditor('');
    document.getElementById('noticia-categoria').value = '';
    document.getElementById('noticia-autor').value = '';
    document.getElementById('noticia-destacado').checked = false;

    window.imagenUrlActual = '';
    window.imagenArchivo = null;
    setVistaPrevia('');

    const inputFile = document.getElementById('noticia-imagen');
    if (inputFile) inputFile.value = '';
}

/* ============================================
   HELPERS DEL FORMULARIO ADMIN
   ============================================ */

// Escribir contenido en el editor (Quill si está disponible, si no en textarea)
function setContenidoEditor(html) {
    if (window.quillEditor) {
        window.quillEditor.root.innerHTML = html || '';
    } else {
        const textarea = document.getElementById('noticia-contenido');
        if (textarea) textarea.value = html || '';
    }
}

// Leer el contenido del editor (Quill devuelve el HTML formateado)
function getContenidoEditor() {
    if (window.quillEditor) {
        return window.quillEditor.root.innerHTML;
    }
    const textarea = document.getElementById('noticia-contenido');
    return textarea ? textarea.value : '';
}

// Mostrar u ocultar la vista previa de la imagen del formulario
function setVistaPrevia(url) {
    const wrap = document.getElementById('imagen-preview-wrap');
    const img = document.getElementById('imagen-preview');
    if (!wrap || !img) return;

    if (url) {
        img.src = url;
        wrap.classList.add('visible');
    } else {
        wrap.classList.remove('visible');
        img.removeAttribute('src');
    }
}
