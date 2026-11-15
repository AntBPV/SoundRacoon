# SoundRacoon

SoundRacoon es una aplicación de escritorio para organizar y reproducir una colección
musical almacenada localmente. Permite registrar carpetas elegidas por el usuario, escanear
archivos de audio, consultar sus metadatos, localizar archivos sin etiquetas y explorar la
colección desde un catálogo local.

## Propósito

El proyecto está dirigido a personas que conservan su música en archivos locales y necesitan
una forma sencilla de:

- Indexar y mantener sincronizada una biblioteca de música.
- Detectar archivos con metadatos incompletos o ausentes.
- Buscar, ordenar y filtrar pistas, incluyendo las que tienen errores de lectura.
- Reproducir pistas locales con controles básicos.
- Identificar archivos mediante AcoustID y revisar los resultados antes de actualizar sus
  metadatos.

SoundRacoon es una aplicación de usuario único y biblioteca local. No ofrece almacenamiento
en la nube, sincronización entre dispositivos, descarga de música, letras ni
recomendaciones o similitud entre canciones.

## Funcionalidades

### Biblioteca local

1. Selecciona una carpeta desde **Biblioteca**.
2. SoundRacoon recorre sus subcarpetas y registra los archivos compatibles.
3. La biblioteca conserva el índice, los metadatos disponibles y los errores de escaneo en
   una base de datos SQLite local.
4. Los escaneos incrementales evitan releer archivos que no han cambiado; también es posible
   solicitar un reescaneo completo.
5. Las carpetas pueden retirarse del índice sin eliminar los archivos originales del disco.

Se reconocen actualmente los formatos `.flac`, `.mp3`, `.ogg`, `.opus`, `.m4a` y `.wav`.

### Catálogo y reproducción

La vista **Pistas** permite:

- Consultar las pistas indexadas por páginas.
- Buscar por título, artista, álbum o ruta.
- Ordenar por las columnas disponibles.
- Filtrar archivos sin etiquetas y errores de escaneo.
- Seleccionar una pista para cargarla y reproducirla.

La reproducción incluye carga automática, reproducción/pausa, tiempo transcurrido, duración
y búsqueda dentro de la pista. Los controles de reproducción todavía son básicos y no
constituyen un reproductor musical completo.

### Identificación con AcoustID

Para identificar archivos sin metadatos, la aplicación puede calcular su huella mediante
`fpcalc.exe` y consultar AcoustID. Los resultados se muestran como candidatos con sus datos
de identificación y puntuación de similitud. El usuario debe revisar y confirmar un
candidato antes de que SoundRacoon intente escribir los metadatos en el archivo.

Esta función requiere:

- Una clave personal de AcoustID configurada desde **Configuración**.
- `fpcalc.exe` en `resources/fpcalc.exe`, o una ruta alternativa mediante `FPCALC_PATH`.
- Conexión de red para realizar la consulta.

La clave se almacena cifrada en el dispositivo y no se incluye en el instalador. Las
solicitudes de identificación se espacian para respetar el límite aproximado de tres
peticiones por segundo. La biblioteca local continúa disponible aunque esta integración no
esté configurada o no se encuentre disponible.

## Tecnología y arquitectura

- **Electron** para la aplicación de escritorio.
- **React** y **TypeScript** para la interfaz.
- **SQLite** mediante `better-sqlite3` para el índice local.
- **music-metadata** para leer metadatos.
- **node-taglib-sharp** para escribir metadatos confirmados.
- **AcoustID** y `fpcalc.exe` como integración opcional de identificación.

Las operaciones de archivos, base de datos, reproducción e integraciones externas se
ejecutan en el proceso principal de Electron. La interfaz accede a ellas mediante el puente
tipado de preload e IPC.

## Requisitos

- Node.js y npm compatibles con el `package-lock.json`.
- Para la identificación: `fpcalc.exe`, una clave personal de AcoustID y acceso a Internet.

## Instalación y desarrollo

Instala las dependencias:

```bash
npm install
```

Inicia la aplicación en modo desarrollo:

```bash
npm run dev
```

## Verificación

Los comandos disponibles para verificar el proyecto son:

```bash
npm run typecheck
npm run lint
npm run build
```

El repositorio no tiene actualmente un comando `npm test` ni una suite automatizada
configurada. La identificación con AcoustID y la compatibilidad de reproducción deben
validarse con archivos y servicios reales.

## Compilación

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Configuración del editor

Se recomienda usar [Visual Studio Code](https://code.visualstudio.com/) con las extensiones
de [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) y
[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).
