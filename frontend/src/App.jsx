import { useEffect, useState } from 'react';

// Las variables VITE_* se incrustan en el JavaScript en el momento del build.
const TITULO = import.meta.env.VITE_APP_TITULO ?? 'Recetario';
const DIFICULTADES = ['facil', 'media', 'dificil'];
const FORMULARIO_VACIO = { nombre: '', descripcion: '', ingredientes: '', minutos: 15, dificultad: 'facil' };

export default function App() {
  const [recetas, setRecetas] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const respuesta = await fetch(`/api/recetas${filtro ? `?dificultad=${filtro}` : ''}`);
      if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);
      setRecetas(await respuesta.json());
      setError('');
    } catch (e) {
      setError(`No se pudo contactar con la API: ${e.message}`);
    }
  }

  useEffect(() => {
    cargar();
  }, [filtro]);

  async function guardar(evento) {
    evento.preventDefault();
    const respuesta = await fetch('/api/recetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formulario,
        minutos: Number(formulario.minutos),
        ingredientes: formulario.ingredientes.split(',').map((i) => i.trim()).filter(Boolean),
      }),
    });
    if (!respuesta.ok) {
      const { errores } = await respuesta.json();
      return setError(errores?.join('. ') ?? 'Error al guardar');
    }
    setFormulario(FORMULARIO_VACIO);
    cargar();
  }

  async function borrar(id) {
    await fetch(`/api/recetas/${id}`, { method: 'DELETE' });
    cargar();
  }

  const cambiar = (campo) => (e) => setFormulario({ ...formulario, [campo]: e.target.value });

  return (
    <div className="contenedor">
      <header>
        <h1>🍲 {TITULO}</h1>
        <div className="filtros">
          {['', ...DIFICULTADES].map((d) => (
            <button key={d} className={filtro === d ? 'activo' : ''} onClick={() => setFiltro(d)}>
              {d || 'todas'}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="rejilla">
        {recetas.map((r) => (
          <article key={r.id} className="tarjeta">
            <h3>{r.nombre}</h3>
            <p>{r.descripcion}</p>
            <p className="meta">
              ⏱ {r.minutos} min · {r.dificultad}
            </p>
            <ul>
              {r.ingredientes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <button onClick={() => borrar(r.id)}>Borrar</button>
          </article>
        ))}
      </section>

      <h2>Nueva receta</h2>
      <form onSubmit={guardar}>
        <input placeholder="Nombre" value={formulario.nombre} onChange={cambiar('nombre')} required />
        <textarea placeholder="Descripción" value={formulario.descripcion} onChange={cambiar('descripcion')} />
        <input
          placeholder="Ingredientes separados por comas"
          value={formulario.ingredientes}
          onChange={cambiar('ingredientes')}
        />
        <input type="number" min="1" value={formulario.minutos} onChange={cambiar('minutos')} />
        <select value={formulario.dificultad} onChange={cambiar('dificultad')}>
          {DIFICULTADES.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <button>Guardar</button>
      </form>
      <p className="version">Construido en modo {import.meta.env.MODE}</p>
    </div>
  );
}
