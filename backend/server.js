import express from 'express';
import pg from 'pg';

const PORT = Number(process.env.PORT ?? 4000);
const DIFICULTADES = ['facil', 'media', 'dificil'];

// pg lee automáticamente PGHOST, PGPORT, PGUSER, PGPASSWORD y PGDATABASE.
const pool = new pg.Pool({ connectionTimeoutMillis: 5000 });
const app = express();

app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok', postgres: 'conectado' });
  } catch {
    res.status(503).json({ estado: 'error', postgres: 'sin conexion' });
  }
});

app.get('/api/recetas', async (req, res) => {
  const { dificultad } = req.query;
  const { rows } = dificultad
    ? await pool.query('SELECT * FROM recetas WHERE dificultad = $1 ORDER BY id', [dificultad])
    : await pool.query('SELECT * FROM recetas ORDER BY id');
  res.json(rows);
});

app.get('/api/recetas/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM recetas WHERE id = $1', [Number(req.params.id) || 0]);
  if (!rows.length) return res.status(404).json({ error: 'Receta no encontrada' });
  res.json(rows[0]);
});

app.post('/api/recetas', async (req, res) => {
  const { nombre, descripcion = '', ingredientes = [], minutos, dificultad } = req.body ?? {};
  const errores = [];
  if (!String(nombre ?? '').trim()) errores.push('"nombre" es obligatorio');
  if (!Number.isInteger(minutos) || minutos <= 0) errores.push('"minutos" debe ser un entero positivo');
  if (!DIFICULTADES.includes(dificultad)) errores.push(`"dificultad" debe ser una de: ${DIFICULTADES.join(', ')}`);
  if (!Array.isArray(ingredientes)) errores.push('"ingredientes" debe ser una lista');
  if (errores.length) return res.status(400).json({ errores });

  const { rows } = await pool.query(
    `INSERT INTO recetas (nombre, descripcion, ingredientes, minutos, dificultad)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [nombre.trim(), String(descripcion), ingredientes.map(String), minutos, dificultad],
  );
  res.status(201).json(rows[0]);
});

app.delete('/api/recetas/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM recetas WHERE id = $1', [Number(req.params.id) || 0]);
  if (!rowCount) return res.status(404).json({ error: 'Receta no encontrada' });
  res.status(204).end();
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno', detalle: err.message });
});

const servidor = app.listen(PORT, () => console.log(`API del recetario en el puerto ${PORT}`));

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    console.log(`Recibida ${senal}, cerrando...`);
    servidor.close(() => pool.end().then(() => process.exit(0)));
  });
}
