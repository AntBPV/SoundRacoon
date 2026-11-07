# soundracoon

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

## Identificación con AcoustID

Coloca `fpcalc.exe` en `resources/fpcalc.exe` para desarrollo y distribución, o define
`FPCALC_PATH` con una ruta alternativa. Crea un archivo `.env` en la raíz del proyecto
y configura allí `ACOUSTID_API_KEY`. En una aplicación distribuida, el archivo `.env`
debe estar en la carpeta de datos de usuario de Electron. En la tabla de pistas, el
botón `ID` calcula la huella con `fpcalc` y consulta AcoustID; esta etapa solo muestra
el resultado en la consola y todavía no escribe metadatos.

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
