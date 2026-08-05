// ============================================
// NOTICIAS - RENDERIZADO Y GESTIÓN DE INTERFAZ
// Funciones para mostrar noticias en la portada y en el panel admin
// ============================================

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
        <div class="noticia-card ${claseDestacado}">
            <img class="noticia-imagen" src="${imagenUrl}" alt="${noticia.titulo}" onerror="this.src='https://via.placeholder.com/600x400/e9ecef/6c757d?text=Sin+imagen'">
            <div class="noticia-contenido">
                <span class="noticia-categoria">${noticia.categoria}</span>
                ${badgeDestacado}
                <h2 class="noticia-titulo">${noticia.titulo}</h2>
                ${noticia.subtitulo ? `<p class="noticia-subtitulo">${noticia.subtitulo}</p>` : ''}
                <div class="noticia-metadata">
                    <span class="noticia-autor">✍️ ${noticia.autor}</span>
                    <span class="noticia-fecha">📅 ${fechaFormateada}</span>
                </div>
            </div>
        </div>
    `;
}

// Mostrar noticias en la portada (grid de tarjetas)
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
            <td class="celda-titulo">${noticia.titulo} ${destacadoBadge}</td>
            <td>${noticia.categoria}</td>
            <td>${noticia.autor}</td>
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

// Cargar y mostrar las noticias en la portada (index.html)
async function cargarNoticiasPortada(contenedorId = 'noticias-container') {
    const container = document.getElementById(contenedorId);

    try {
        container.innerHTML = '<div class="loading">Cargando noticias</div>';

        const noticias = await obtenerNoticias();

        mostrarNoticias(noticias, contenedorId);

    } catch (error) {
        console.error('Error al cargar noticias:', error);
        container.innerHTML = `
            <div class="error">
                ❌ Error al cargar las noticias: ${error.message}
                <br><br>
                <small>Verifica que la URL y la clave de Supabase sean correctas.</small>
            </div>
        `;
    }
}

// Cargar y mostrar las noticias en el panel admin
async function cargarNoticiasAdmin() {
    try {
        const noticias = await obtenerNoticias();
        mostrarListaAdmin(noticias);
    } catch (error) {
        const tbody = document.getElementById('tabla-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6">❌ ${error.message}</td></tr>`;
        }
    }
}

// Llenar el formulario del admin con los datos de una noticia para editarla
function llenarFormularioEdicion(noticia) {
    document.getElementById('form-titulo').textContent = 'Editar noticia';

    document.getElementById('noticia-id').value = noticia.id || '';
    document.getElementById('noticia-titulo').value = noticia.titulo || '';
    document.getElementById('noticia-subtitulo').value = noticia.subtitulo || '';
    document.getElementById('noticia-contenido').value = noticia.contenido || '';
    document.getElementById('noticia-categoria').value = noticia.categoria || '';
    document.getElementById('noticia-autor').value = noticia.autor || '';
    document.getElementById('noticia-imagen').value = noticia.imagen_url || '';
    document.getElementById('noticia-destacado').checked = Boolean(noticia.destacado);

    document.getElementById('form-noticia-wrap').style.display = 'block';
    document.getElementById('noticia-titulo').focus();
}

// Limpiar el formulario para crear una noticia nueva
function limpiarFormularioNoticia() {
    document.getElementById('form-titulo').textContent = 'Nueva noticia';

    document.getElementById('noticia-id').value = '';
    document.getElementById('noticia-titulo').value = '';
    document.getElementById('noticia-subtitulo').value = '';
    document.getElementById('noticia-contenido').value = '';
    document.getElementById('noticia-categoria').value = '';
    document.getElementById('noticia-autor').value = '';
    document.getElementById('noticia-imagen').value = '';
    document.getElementById('noticia-destacado').checked = false;
}
