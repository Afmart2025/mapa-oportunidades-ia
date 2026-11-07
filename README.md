# 💡 Mapa de Oportunidades con IA

Una aplicación web pública, simple, bonita y colaborativa para detectar, publicar y evaluar oportunidades de negocio basadas en Inteligencia Artificial en ciudades de todo el mundo.

---

## 🚀 Características Principales

- **Totalmente Pública y Centralizada**: Cualquier persona puede consultar y publicar oportunidades. Todo se guarda directamente en la nube en **Supabase** (nada queda aislado en el navegador local).
- **Campos Completos por Oportunidad**:
  - `Nombre`: Nombre de la oportunidad detectada.
  - `Ciudad`: Ciudad donde se detectó el problema.
  - `País`: País de localización.
  - `Problema`: Dolor real detectado en la comunidad o mercado.
  - `Solución con IA`: Propuesta técnica/funcional con Inteligencia Artificial.
  - `Categoría`: Sector (Fintech, Sostenibilidad, Agrotech, Salud, Turismo, etc.).
  - `Potencial`: Evaluación del impacto (Alto, Medio, Escalable Global).
  - `Likes`: Sistema de apoyo comunitario en tiempo real.
  - `created_at`: Fecha y hora de publicación.
- **Filtros Dinámicos**:
  - Búsqueda en texto libre por palabra clave.
  - Filtro por país (se alimenta automáticamente de los países existentes).
  - Filtro por ciudad (se adapta según el país seleccionado).
  - Filtro por categoría de negocio.
  - Ordenamiento por más recientes, más votadas o alfabético.
- **Sincronización en Tiempo Real (Supabase Realtime)**: Cuando otra persona publica o da like desde otro lugar, tu pantalla se actualiza en vivo.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5 semántico, CSS3 moderno (con variables CSS, glassmorphism y diseño responsivo para móviles y escritorio) y Vanilla JavaScript.
- **Base de Datos & Backend**: **Supabase** (PostgreSQL) con Row Level Security (RLS) público y canal de WebSockets en tiempo real.
- **Librería de Conexión**: `@supabase/supabase-js` v2 cargado vía CDN oficial.

---

## 📁 Estructura del Proyecto

```text
mapa-oportunidades-ia/
├── index.html     # Interfaz principal, modal y controles
├── styles.css     # Estilos modernos, diseño responsivo y efectos visuales
├── app.js         # Lógica de conexión a Supabase, inserciones, likes y filtros
└── README.md      # Documentación y guía de pruebas
```

---

## 💻 Cómo Ejecutar la Aplicación

Puedes abrir la aplicación de cualquiera de las siguientes formas:

### Opción 1: Con Python (Recomendado)
Abre una terminal en esta carpeta y ejecuta:
```bash
python -m http.server 3000
```
Luego abre tu navegador en: [http://localhost:3000](http://localhost:3000)

### Opción 2: Con Node.js / npx
```bash
npx serve .
```

### Opción 3: Abrir directamente el archivo
Haz doble clic en `index.html` para abrirlo en Chrome, Edge o tu navegador preferido.

---

## 🧪 Cómo Probar que una Oportunidad Publicada por una Persona Aparece para Otra Persona

Sigue estos sencillos pasos:

1. **Abre dos ventanas diferentes**:
   - **Ventana A**: Abre la aplicación en tu navegador normal (representando a la **Persona 1**).
   - **Ventana B**: Abre una ventana de **Navegación Privada / Incógnito** o usa otro navegador (ej. Firefox, Edge o Chrome) con el mismo enlace (representando a la **Persona 2**). También puedes abrirlo desde tu teléfono si estás en la misma red local.

2. **Publicar desde la Ventana A (Persona 1)**:
   - Haz clic en el botón `+ Publicar Oportunidad`.
   - Llena los datos con una nueva idea, por ejemplo:
     - **Nombre**: *"Optimización de Semáforos con Visión Computacional"*
     - **Ciudad**: *"Santiago"*
     - **País**: *"Chile"*
     - **Categoría**: *"Movilidad"*
     - **Potencial**: *"Alto"*
     - **Problema**: *"Congestión vehicular severa en horas punta por tiempos fijos en semáforos."*
     - **Solución con IA**: *"Cámaras en cruces que analizan el tráfico en tiempo real y ajustan los ciclos de luz verde automáticamente."*
   - Haz clic en **Guardar en Supabase**.

3. **Verificación inmediata en la Ventana B (Persona 2)**:
   - Mira la **Ventana B**: gracias al canal **Realtime de Supabase**, la nueva oportunidad aparecerá automáticamente en pantalla sin necesidad de refrescar (o puedes hacer clic en **Recargar**).
   - Ahora, desde la **Ventana B (Persona 2)**, haz clic en el botón de corazón (**Like**) en esa nueva tarjeta.
   - Observa cómo en la **Ventana A (Persona 1)** el contador de likes se actualiza instantáneamente reflejando el voto de la otra persona.
   - Esto demuestra fehacientemente que:
     - Los datos **no** residen en la memoria local del navegador.
     - Toda la información viaja a la nube en **Supabase** y es compartida públicamente con todos los usuarios en el mundo.
