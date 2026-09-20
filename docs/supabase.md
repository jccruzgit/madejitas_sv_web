# Supabase para MadejitasSV

El proyecto puede comenzar en Supabase Free. Las imágenes del catálogo inicial
siguen en `public/images`, por lo que no se necesita Storage para esta fase.

## Activar el catálogo

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard). No hace falta
   compartir contraseñas ni claves secretas.
2. En **SQL Editor**, ejecuta el contenido de
   `supabase/migrations/20260920000000_catalog_and_quotes.sql`.
3. Ejecuta `supabase/seed.sql`. La carga inicial contiene los ocho productos
   existentes y es repetible: no sobrescribe cambios hechos después.
4. Copia `.env.example` a `.env.local`; la **Project URL** ya está configurada.
   Reemplaza el valor de **publishable key** con el del panel **Connect** o
   **Settings > API Keys**.
   `.env.local` está ignorado por Git. Nunca uses `service_role`, una secret key
   ni la contraseña de PostgreSQL en variables `VITE_`.
5. Ejecuta `npm install` y `npm run dev`. Reinicia Vite después de cambiar
   `.env.local`.

Si no hay variables configuradas, la web usa el catálogo local para poder
desarrollar y probar el diseño. Con variables configuradas, usa exclusivamente
Supabase. Una tabla vacía se muestra vacía; un error de conexión se muestra como
error con botón de reintento.

## Datos y permisos

- `products`: ficha, precio y publicación.
- `product_variants`: colores y existencias por variante. `stock_quantity = NULL`
  significa que aún no se ha cargado inventario; `0` significa agotado.
- `app_admins`: identidades autorizadas para editar el catálogo. Esta tabla
  permanece vacía hasta configurar el panel administrativo. Sigue los pasos de
  [docs/admin.md](admin.md) para activarlo.
- `quotes` y `quote_items`: estructura privada para la siguiente fase. Ningún
  visitante puede leer o escribir cotizaciones directamente.

El público solo puede leer productos publicados y variantes activas. Las
cotizaciones todavía se preparan localmente y se envían mediante un enlace de
WhatsApp; **no quedan guardadas en Supabase**. Para guardarlas hay que añadir
una función de servidor que recalcule precios y cantidades, genere el número
definitivo y limite solicitudes abusivas. El costo de envío mostrado sigue
siendo estimado.

## Verificación

```powershell
npm run test
npm run build
npm run check:catalog
```

Para validar la conexión real, abre el catálogo y comprueba que aparecen los
ocho productos. Después cambia `is_published` a `false` en un producto desde
SQL Editor y verifica que ya no aparece para visitantes. Vuelve a publicarlo
cuando termines.

Supabase Free no incluye respaldos automáticos y puede pausar proyectos con
poca actividad. Antes de recibir cotizaciones reales, programa exportaciones
periódicas fuera del servicio y documenta cómo restaurarlas.
