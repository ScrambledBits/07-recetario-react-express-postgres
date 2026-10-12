-- Esquema y datos de ejemplo del recetario.
-- Este script NO lo ejecuta la API: debe correrlo PostgreSQL al inicializar la base.

CREATE TABLE IF NOT EXISTS recetas (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(120) NOT NULL,
    descripcion  TEXT         NOT NULL DEFAULT '',
    ingredientes TEXT[]       NOT NULL DEFAULT '{}',
    minutos      INTEGER      NOT NULL CHECK (minutos > 0),
    dificultad   VARCHAR(10)  NOT NULL CHECK (dificultad IN ('facil', 'media', 'dificil')),
    creada_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO recetas (nombre, descripcion, ingredientes, minutos, dificultad) VALUES
  ('Guacamole', 'Aguacate machacado con limón, cebolla y cilantro.',
   ARRAY['2 aguacates', '1 limón', '1/4 de cebolla', 'cilantro', 'sal'], 10, 'facil'),
  ('Tortilla de patatas', 'Clásico de huevo y patata, con o sin cebolla.',
   ARRAY['4 patatas', '5 huevos', '1 cebolla', 'aceite de oliva', 'sal'], 45, 'media'),
  ('Ceviche', 'Pescado blanco marinado en jugo de limón con cebolla morada y ají.',
   ARRAY['500 g de pescado blanco', '8 limones', '1 cebolla morada', 'ají', 'cilantro', 'sal'], 30, 'media'),
  ('Arepas', 'Masa de harina de maíz precocida, asada a la plancha.',
   ARRAY['2 tazas de harina de maíz precocida', '2 1/2 tazas de agua', 'sal'], 25, 'facil');
