-- Initial catalog from src/data.js. Re-running this file does not overwrite edits.
insert into public.products
  (id, name, detail, category, brand, thickness, price, image_url,
   hero_image_url, badge, description, is_published, sort_order)
values
  ('hilo-amigurumi', 'Hilo Amigurumi', 'Círculo 125 g', 'Amigurumi',
   'Círculo', 'Fino', 4.50, '/images/hilo-amigurumi.jpg', null,
   'Más vendido', null, true, 0),
  ('chenille-amigurumi', 'Chenille Amigurumi', '100 g · Hebra 3 mm', 'Chenille',
   'Círculo', 'Grueso', 6.00, '/images/chenille.jpg',
   '/images/chenille-detalle.jpg', 'Nuevo',
   'Chenille 100% poliéster de alta calidad. Suave, esponjosa y perfecta para amigurumis, mantas, cojines y proyectos de bebé.',
   true, 1),
  ('trapillo-premium', 'Trapillo Premium', '500 g · Colores lisos', 'Trapillo',
   'Pantera', 'Grueso', 4.25, '/images/trapillo.jpg', null, null, null, true, 2),
  ('algodon-mercerizado', 'Algodón Mercerizado', '100 g · Brillante', 'Algodón',
   'Alize', 'Súper fino', 2.75, '/images/algodon.jpg', null, null, null, true, 3),
  ('crochet-soft', 'Crochet Soft', '100 g · Algodón mate', 'Algodón',
   'Alize', 'Medio', 3.85, '/images/hilo-amigurumi.jpg', null, null, null, true, 4),
  ('chenille-bebe', 'Chenille Bebé', '100 g · Extra suave', 'Chenille',
   'Pantera', 'Grueso', 5.50, '/images/chenille-rosa.jpg', null, null, null, true, 5),
  ('kit-agujas', 'Kit de agujas ergonómicas', '6 medidas', 'Herramientas',
   'Madejitas', 'Accesorio', 12.50, '/images/herramientas.jpg', null, null, null, true, 6),
  ('ojitos-seguridad', 'Ojitos de seguridad', 'Set de 30 piezas', 'Accesorios',
   'Madejitas', 'Accesorio', 3.25, '/images/accesorios.jpg', null, null, null, true, 7)
on conflict (id) do nothing;

-- Stock is intentionally NULL: availability has not been provided yet.
insert into public.product_variants
  (product_id, name, code, hex_color, image_url, stock_quantity, sort_order)
values
  ('hilo-amigurumi', 'Chantilly', '7563', '#ead8ca', '/images/hilo-amigurumi.jpg', null, 0),
  ('hilo-amigurumi', 'Rosa suave', '3526', '#f3a7bb', '/images/chenille-rosa.jpg', null, 1),
  ('hilo-amigurumi', 'Menta', '5745', '#83c8b4', '/images/chenille-menta.jpg', null, 2),
  ('chenille-amigurumi', 'Chantilly', '7563', '#c9a9df', '/images/chenille.jpg', null, 0),
  ('chenille-amigurumi', 'Lila Candy', '6000', '#d68ec0', '/images/chenille-rosa.jpg', null, 1),
  ('chenille-amigurumi', 'Neo Mint', '5745', '#80c9b1', '/images/chenille-menta.jpg', null, 2),
  ('chenille-amigurumi', 'Azul Bic', '2829', '#52a6cf', '/images/chenille-azul.jpg', null, 3),
  ('chenille-amigurumi', 'Vainilla', '1114', '#f1df9a', '/images/chenille-vainilla.jpg', null, 4),
  ('trapillo-premium', 'Mostaza', 'TP08', '#d7a623', '/images/trapillo.jpg', null, 0),
  ('trapillo-premium', 'Rosa Pastel', 'TP12', '#dfa5ad', '/images/chenille-rosa.jpg', null, 1),
  ('algodon-mercerizado', 'Turquesa', 'AM21', '#11abc7', '/images/algodon.jpg', null, 0),
  ('algodon-mercerizado', 'Coral', 'AM14', '#ef7d53', '/images/algodon.jpg', null, 1),
  ('crochet-soft', 'Natural', 'CS01', '#d9c3a9', '/images/hilo-amigurumi.jpg', null, 0),
  ('chenille-bebe', 'Rosa', 'CB04', '#e3a1be', '/images/chenille-rosa.jpg', null, 0),
  ('kit-agujas', 'Pastel', 'KIT06', '#c9a7db', '/images/herramientas.jpg', null, 0),
  ('ojitos-seguridad', 'Negro', 'OS30', '#252126', '/images/accesorios.jpg', null, 0)
on conflict (product_id, code) do nothing;
