# Panel privado de catálogo

La ruta del panel es `/#/admin`. La tienda no muestra un botón público hacia ella,
pero su seguridad depende de Supabase Auth y las políticas RLS, no de la URL.

## Activar el acceso

1. En Supabase Dashboard > **Authentication > Users**, crea una cuenta para el
   correo administrador y confirma su email. Configura una contraseña en el
   Dashboard o completa la invitación recibida por correo. No uses la contraseña
   del proyecto PostgreSQL ni compartas la clave secreta.
2. Después de que exista el usuario, ejecuta en **SQL Editor** este comando,
   sustituyendo el correo de ejemplo por el correo administrador:

   ```sql
   insert into public.app_admins (user_id)
   select id from auth.users where lower(email) = lower('tu-correo@ejemplo.com')
   on conflict (user_id) do nothing;
   ```

3. Comprueba que se creó exactamente una fila:

   ```sql
   select u.email, a.created_at
   from public.app_admins a
   join auth.users u on u.id = a.user_id;
   ```

4. Ejecuta `supabase/migrations/20260920010000_catalog_images.sql` en SQL
   Editor. Crea el bucket público `catalog-images`; solo las cuentas registradas
   en `app_admins` pueden subir o listar archivos. Las imágenes son accesibles
   públicamente mediante su URL.
5. Entra en `/#/admin` con el correo y contraseña de la cuenta de **Auth**.

Si la consulta del paso 3 no devuelve el correo esperado, revisa el paso 1 antes
de usar el panel. El sitio no permite registrar administradores desde la web.

## Uso

- Una ficha nueva se guarda oculta. Añade al menos un color activo y luego
  publícala para que aparezca en la tienda.
- El campo de existencias vacío significa inventario sin definir. `0` muestra
  el color como agotado.
- Las imágenes existentes en `public/images` siguen disponibles. El botón
  **Subir imagen** acepta JPG, PNG o WebP de hasta 5 MB. Guardar la imagen
  subida en la ficha es un paso separado.
- Eliminar una ficha elimina sus variantes. Las cotizaciones que se guarden en
  una fase futura conservarán sus nombres y precios históricos.
- Por ahora el panel no administra cotizaciones ni elimina archivos antiguos del
  bucket cuando se reemplaza una foto.

La clave publicable puede estar en el navegador; la autorización depende de
RLS. Nunca pongas una secret key ni `service_role` en variables `VITE_`.
