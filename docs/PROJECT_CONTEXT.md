# 1. Informacion General
- Nombre del proyecto: SoundRacoon
- Propósito: Crear una forma sencilla de recolectar metadatos y reproducción de archivos de música locales
- Problema que resuelve: Archivos sin metadatos, datos incorrectos e imposibles de catalogar de forma local y sencilla.
- Publico Objetivo: Nicho de personas que desean tener su música de forma local en archivos.
- Alcance del sistema: Leer archivos, reproducir musica, leer y reescribir metadatos, consultar base de datos de AcoustID.
# 2. Funcionalidades implementadas
## Modulo 1: Lectura de archivos
- Descripción: Destinado a leer los archivos y sus metadatos de carpetas especificadas por el usuario.
- Funcionalidad: En un entorno de una carpeta seleccionada de manera explicita por un usuario el modulo debe leer los archivos de música y extraer sus metadatos, aquellos archivos que no contengan metadatos deben ser marcados para el conocimiento del usuario.
- Flujo de trabajo: Seleccionar una carpeta, El sistema recorre los archivos, comprueba archivos sin metadatos y los marca dentro del sistema, guarda en una base de datos la ultima fecha de modificación de los archivos junto con la última verificación del sistema, si la fecha de modificación de los archivos es mas reciente que la ultima verificación del sistema al intentar realizar un reescaneo lo realiza completamente verificando todos los archivos, de otra manera, ignora los archivos que ya ha escaneado.
## Modulo 2: Metadatos y Consultas
- Descripción: Destinado a cambiar los metadatos de archivos por los encontrados en AcoustID
- Funcionalidad: Los archivos que no contienen metadatos pasan a consulta de AcoustID para obtener los metadatos correctos y reescribirlos hacia al archivo.
- Flujo de trabajo: Seleccionar una carpeta, El sistema recorre los archivos, comprueba archivos sin metadatos y los marca dentro del sistema, aquellos archivos sin metadatos pasan por fpcalc.exe para obtener su respectivo fingerprint y duration (datos necesarios para consultar en el api de AcoustID), con los datos se integran en una cola de maximo 3 peticiones por segundo hacia el API de AcoustID, el API de AcoustID retorna ciertos datos y tags junto con score de similitud entre el fingerprint del archivo con el fingerprint guardado en AcoustID, aquellos candidatos retornados por el API más aptos o similares usarlos para reescribir los metadatos de los archivos sin metadatos, confirmar por parte del usuario para reescribir metadatos.
## Modulo 3: Reproducción
- Descripción: Destinado a reproducir los archivos locales del usuario
- Funcionalidad: Reproduce los archivos que se encuentran en una carpeta, como un reproductor corriente.
- Flujo de trabajo: Seleccionar una carpeta, El sistema recorre los archivos, comprueba archivos sin metadatos y los marca dentro del sistema, todos los archivos se muestran en un catalogo tipo biblioteca indicando sus metadatos y tags obtenidas, se permite buscar y ordenar, al reproducir se permiten controles básicos de reproducción.
# Arquitectura del sistema
- Arquitectura en Capas
- Integracion externa con fpcalc.exe y el API de AcoustID
La arquitectura puede haber sido mal implementada o confusa debido a que fue realizada por medio de VibeCoding.
# Tecnologías
- Lenguaje: Typescript / Javascript.
- Framework: Electron
- Base de datos: sqlite local
- Herramientas de desarrollo: Visual Studio Code
# Estado actual
La mayoría de funcionalidades descritas en este documento ya se encuentran implementadas en la aplicación. Indicando una funcionalidad parcial en la sección de reproducción en donde no existen todos los controles que se deseaban integrar en el aplicativo.
Hay ciertos elementos fuera del alcance del aplicativo como reestructuraciones del frontend de la aplicación, descargas de archivos, consulta de letras de canciones y parecidos.