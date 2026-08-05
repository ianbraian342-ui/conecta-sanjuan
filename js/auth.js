// ============================================
// AUTENTICACIÓN - Supabase Auth (API REST)
// Login, registro, logout y verificación de sesión
// ============================================

// Guarda la sesión en sessionStorage tras un login exitoso
function guardarSesion(data) {
    sessionStorage.setItem('sb_access_token', data.access_token);
    sessionStorage.setItem('sb_user', JSON.stringify(data.user));
}

// Iniciar sesión con email y contraseña
async function iniciarSesion(email, password) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: headersSupabase(),
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        throw new Error('Email o contraseña incorrectos');
    }

    const data = await response.json();
    guardarSesion(data);
    return data;
}

// Registrar un nuevo usuario con nombre
async function registrarUsuario(email, password, nombre) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: headersSupabase(),
        body: JSON.stringify({
            email,
            password,
            data: { nombre }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const mensaje = (errorData && errorData.msg) ? errorData.msg : 'No se pudo registrar el usuario';
        throw new Error(mensaje);
    }

    return response.json();
}

// Cerrar sesión
function cerrarSesion() {
    sessionStorage.removeItem('sb_access_token');
    sessionStorage.removeItem('sb_user');
    window.location.href = 'admin.html';
}

// Obtener el usuario actual o null si no hay sesión
function obtenerUsuario() {
    const user = sessionStorage.getItem('sb_user');
    return user ? JSON.parse(user) : null;
}

// Verificar si hay una sesión activa
function verificarSesion() {
    const token = sessionStorage.getItem('sb_access_token');
    const user = sessionStorage.getItem('sb_user');
    return Boolean(token && user);
}

// Nombre para mostrar (del metadata de registro o fallback al email)
function nombreUsuario() {
    const usuario = obtenerUsuario();
    if (!usuario) return '';
    return (usuario.user_metadata && usuario.user_metadata.nombre) || usuario.email || 'Administrador';
}
