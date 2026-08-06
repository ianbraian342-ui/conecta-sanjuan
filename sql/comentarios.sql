-- ============================================================
-- CONECTA SAN JUAN - TABLA DE COMENTARIOS + POLÍTICAS RLS
-- Ejecutar este script en el SQL Editor de Supabase.
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin errores.
--
-- IMPORTANTE: los nombres de políticas NO llevan espacios ni comillas
-- (identificadores de una sola palabra) para que el script se pueda
-- copiar y pegar sin errores de comillas tipográficas.
-- ============================================================

-- ============================================================
-- 1) BUCKET DE IMÁGENES "noticias-imagenes"
--    (necesario para la subida de imágenes desde el panel admin)
-- ============================================================

-- Crear el bucket público (permite leer imágenes sin autenticación)
INSERT INTO storage.buckets (id, name, public)
VALUES ('noticias-imagenes', 'noticias-imagenes', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública de los objetos del bucket
DROP POLICY IF EXISTS noticias_imagenes_leer ON storage.objects;
CREATE POLICY noticias_imagenes_leer
ON storage.objects FOR SELECT
USING (bucket_id = 'noticias-imagenes');

-- Subida de imágenes (usuarios anónimos y autenticados desde el panel)
DROP POLICY IF EXISTS noticias_imagenes_subir ON storage.objects;
CREATE POLICY noticias_imagenes_subir
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'noticias-imagenes');

-- Actualizar / reemplazar imágenes
DROP POLICY IF EXISTS noticias_imagenes_actualizar ON storage.objects;
CREATE POLICY noticias_imagenes_actualizar
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'noticias-imagenes')
WITH CHECK (bucket_id = 'noticias-imagenes');

-- Eliminar imágenes (solo autenticados)
DROP POLICY IF EXISTS noticias_imagenes_eliminar ON storage.objects;
CREATE POLICY noticias_imagenes_eliminar
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'noticias-imagenes');

-- ============================================================
-- 2) TABLA DE COMENTARIOS
-- ============================================================

-- Tabla de comentarios (no se pisa si ya existe)
CREATE TABLE IF NOT EXISTS comentarios (
  id BIGSERIAL PRIMARY KEY,
  noticia_id BIGINT NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
  nombre_usuario VARCHAR(100) NOT NULL,
  email_usuario VARCHAR(255),
  comentario TEXT NOT NULL,
  fecha_comentario TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aprobado BOOLEAN DEFAULT FALSE
);

-- Índices para búsquedas rápidas
DROP INDEX IF EXISTS idx_comentarios_noticia;
CREATE INDEX idx_comentarios_noticia ON comentarios(noticia_id);

DROP INDEX IF EXISTS idx_comentarios_fecha;
CREATE INDEX idx_comentarios_fecha ON comentarios(fecha_comentario DESC);

-- ============================================================
-- 3) POLÍTICAS RLS PARA COMENTARIOS
-- ============================================================

ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

-- Permitir que todos lean comentarios aprobados
DROP POLICY IF EXISTS comentarios_ver_aprobados ON comentarios;
CREATE POLICY comentarios_ver_aprobados ON comentarios
  FOR SELECT
  USING (aprobado = true);

-- Los administradores (sesión iniciada) pueden ver todos los comentarios,
-- incluidos los pendientes, para poder moderarlos
DROP POLICY IF EXISTS comentarios_admin_ver_todos ON comentarios;
CREATE POLICY comentarios_admin_ver_todos ON comentarios
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Permitir que todos creen comentarios (quedan pendientes de aprobación)
DROP POLICY IF EXISTS comentarios_crear ON comentarios;
CREATE POLICY comentarios_crear ON comentarios
  FOR INSERT
  WITH CHECK (true);

-- Solo administradores pueden aprobar/eliminar
DROP POLICY IF EXISTS comentarios_moderar ON comentarios;
CREATE POLICY comentarios_moderar ON comentarios
  FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS comentarios_eliminar ON comentarios;
CREATE POLICY comentarios_eliminar ON comentarios
  FOR DELETE
  USING (auth.role() = 'authenticated');
