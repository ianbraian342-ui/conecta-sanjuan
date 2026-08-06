// ============================================
// COMENTARIOS - RENDERIZADO Y MODERACIÓN
// Muestra comentarios en la portada y permite moderarlos desde el admin
// ============================================

// Sanitizar HTML de un comentario: escapa todo el texto y solo permite
// convertir saltos de línea en <br>. Evita inyección de scripts/HTML.
function sanitizarHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML.replace(/\n/g, '<br>');
}

// HTML del bloque de comentarios que se inyecta en el modal de detalle
function plantillaComentarios() {
    return `
        <section class="comentarios">
            <h3>💬 Comentarios</h3>
            <div id="comentarios-lista"><div class="loading">Cargando comentarios</div></div>

            <form id="form-comentario" novalidate>
                <input type="hidden" id="comentario-noticia-id">
                <div class="form-group">
                    <label for="comentario-nombre">Nombre *</label>
                    <input type="text" id="comentario-nombre" maxlength="100" placeholder="Tu nombre">
                </div>
                <div class="form-group">
                    <label for="comentario-email">Email (opcional)</label>
                    <input type="email" id="comentario-email" maxlength="255" placeholder="tucorreo@ejemplo.com">
                </div>
                <div class="form-group">
                    <label for="comentario-texto">Comentario *</label>
                    <textarea id="comentario-texto" rows="4" maxlength="2000" placeholder="Dejanos tu comentario..."></textarea>
                </div>
                <div id="comentario-mensaje" class="mensaje"></div>
                <button type="submit" class="btn btn-primario">💬 Enviar comentario</button>
            </form>
        </section>
    `;
}

// Cargar y mostrar los comentarios aprobados de una noticia + conectar el formulario
async function cargarComentariosNoticia(noticiaId) {
    const lista = document.getElementById('comentarios-lista');
    const form = document.getElementById('form-comentario');
    const campoId = document.getElementById('comentario-noticia-id');

    if (campoId) campoId.value = noticiaId;
    if (lista) lista.innerHTML = '<div class="loading">Cargando comentarios</div>';

    try {
        const comentarios = await obtenerComentarios(noticiaId);

        if (lista) {
            if (!comentarios || comentarios.length === 0) {
                lista.innerHTML = '<p class="sin-comentarios">Todavía no hay comentarios. ¡Sé el primero!</p>';
            } else {
                lista.innerHTML = comentarios.map(c => `
                    <div class="comentario">
                        <div class="comentario-cabecera">
                            <strong>${escapeHTML(c.nombre_usuario)}</strong>
                            <span>${formatearFecha(c.fecha_comentario)}</span>
                        </div>
                        <p>${sanitizarHTML(c.comentario)}</p>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error al cargar comentarios:', error);
        if (lista) lista.innerHTML = `<p class="sin-comentarios">❌ ${error.message}</p>`;
    }

    // Conectar el envío del formulario (se vuelve a crear cada vez que se abre el modal)
    if (form) {
        form.onsubmit = async function(e) {
            e.preventDefault();

            const nombre = document.getElementById('comentario-nombre').value.trim();
            const email = document.getElementById('comentario-email').value.trim();
            const texto = document.getElementById('comentario-texto').value.trim();
            const mensaje = document.getElementById('comentario-mensaje');

            if (!nombre || !texto) {
                mensaje.textContent = '❌ Completá tu nombre y tu comentario.';
                mensaje.className = 'mensaje mensaje-error visible';
                return;
            }

            try {
                await crearComentario({
                    noticia_id: Number(noticiaId),
                    nombre_usuario: nombre,
                    email_usuario: email || null,
                    comentario: texto
                });

                mensaje.textContent = '✅ Gracias por tu comentario. Se publicará una vez que un administrador lo apruebe.';
                mensaje.className = 'mensaje mensaje-exito visible';
                form.reset();
            } catch (error) {
                console.error('Error al enviar comentario:', error);
                mensaje.textContent = '❌ ' + error.message;
                mensaje.className = 'mensaje mensaje-error visible';
            }
        };
    }
}

// Cargar la tabla de moderación de comentarios en el panel admin
async function cargarComentariosAdmin() {
    const tbody = document.getElementById('tabla-comentarios');
    if (!tbody) return;

    try {
        const [comentarios, noticias] = await Promise.all([obtenerComentariosAdmin(), obtenerNoticias()]);

        // Mapa id -> titulo para mostrar a qué noticia pertenece cada comentario
        const mapaTitulos = {};
        noticias.forEach(n => { mapaTitulos[n.id] = n.titulo; });

        if (!comentarios || comentarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">📭 No hay comentarios todavía.</td></tr>';
            return;
        }

        tbody.innerHTML = comentarios.map(c => {
            const badge = c.aprobado
                ? '<span class="estado-badge estado-aprobado">✅ Aprobado</span>'
                : '<span class="estado-badge estado-pendiente">⏳ Pendiente</span>';
            const botonAprobar = c.aprobado ? '' : `<button class="acciones-boton btn-aprobar" data-id="${c.id}">✅ Aprobar</button>`;

            return `
                <tr>
                    <td class="celda-titulo">${escapeHTML(mapaTitulos[c.noticia_id] || '—')}</td>
                    <td>${escapeHTML(c.nombre_usuario)}</td>
                    <td class="celda-comentario">${sanitizarHTML(c.comentario)}</td>
                    <td>${formatearFecha(c.fecha_comentario)}</td>
                    <td>${badge}</td>
                    <td>
                        ${botonAprobar}
                        <button class="acciones-boton btn-eliminar" data-id="${c.id}">🗑️ Eliminar</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Delegación de eventos: aprobar
        tbody.querySelectorAll('.btn-aprobar').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await actualizarComentario(btn.dataset.id, { aprobado: true });
                    mostrarMensajeAdmin('Comentario aprobado ✅', 'exito');
                    cargarComentariosAdmin();
                } catch (error) {
                    mostrarMensajeAdmin('❌ ' + error.message, 'error');
                }
            });
        });

        // Delegación de eventos: eliminar
        tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Seguro que querés eliminar este comentario?')) return;
                try {
                    await eliminarComentario(btn.dataset.id);
                    mostrarMensajeAdmin('Comentario eliminado ✅', 'exito');
                    cargarComentariosAdmin();
                } catch (error) {
                    mostrarMensajeAdmin('❌ ' + error.message, 'error');
                }
            });
        });
    } catch (error) {
        console.error('Error al cargar comentarios del admin:', error);
        tbody.innerHTML = `<tr><td colspan="6">❌ ${error.message}</td></tr>`;
    }
}
