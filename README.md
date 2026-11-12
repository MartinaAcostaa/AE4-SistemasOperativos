# AE4-SistemasOperativos
Simulador de asignación de espacio en disco de NTFS (Windows 11).

Integrantes: Acosta Martina y Azcona Valentina.

Descripción:
El simulador muestra cómo NTFS usa el $Bitmap y la MFT para guardar archivos en el disco. Cada archivo se guarda en uno o varios runs (tramos de clusters seguidos). Si no hay un hueco libre lo bastante grande, el archivo se fragmenta.

Permite:
-Crear y eliminar archivos.
-Elegir la estrategia de asignación: first-fit, best-fit o worst-fit.
-Ver el mapa del disco, la MFT y las métricas de fragmentación.
-Desfragmentar el disco.

Requisitos: Node.js 18 o superior

Instalación:
- git clone al repositorio del trabajo:  https://github.com/MartinaAcostaa/AE4-SistemasOperativos.git
cd AE4-SistemasOperativos
- npm install

Ejecución: npm start
Tests: npm test

Funcionamiento:

-Configuración inicial

Al iniciar, el programa pide los datos del disco. Para usar el valor por defecto, que aparece entre corchetes, se aprieta Enter sin escribir nada.

Tamaño del disco en clusters (8 a 4096) [64]:
Tamaño de cada cluster en KB [4]:
Clusters reservados para el sistema [4]:
Máximo de archivos en la MFT [60]:
Elegí una estrategia [2]:

¿Qué significan?
Tamaño del disco: cantidad total de clusters del volumen.
Tamaño de cada cluster: se usa para mostrar la capacidad en KB. 4 KB es el tamaño habitual en NTFS.
Clusters reservados para el sistema: se ocupan al principio del disco y representan los metarchivos de NTFS ($MFT, $Boot, $Bitmap, etc.).
Máximo de archivos en la MFT: cantidad de registros disponibles para archivos del usuario.
Estrategia: cómo se elige el hueco libre donde se guarda cada archivo.
first-fit: el primer hueco donde entra el archivo.
best-fit: el hueco más chico donde entra.
worst-fit: el hueco más grande.

Si algún valor no es válido, por ejemplo más clusters de sistema que el tamaño del disco, el programa muestra el error y vuelve a pedir la configuración.

-Menú

Después aparece el menú. Se escribe el número de la opción y se aprieta Enter.

=== Menú (estrategia actual: best-fit) ===
  1) Crear archivo
  2) Eliminar archivo
  3) Cambiar estrategia
  4) Desfragmentar
  5) Ver mapa del disco
  6) Ver MFT
  7) Ver métricas
  0) Salir

-Crear archivo: pide el nombre y el tamaño en clusters. El programa reserva un registro en la MFT, busca un hueco libre en el $Bitmap según la estrategia y marca esos clusters como ocupados. Si ningún hueco alcanza, el archivo se divide en varios runs. Si el tamaño es 0, el archivo es residente: sus datos se guardan dentro del registro de la MFT y no ocupa clusters.

-Eliminar archivo: pide el nombre, libera sus clusters en el $Bitmap y deja su registro de la MFT libre para otro archivo.

-Cambiar estrategia: permite elegir otra estrategia sin reiniciar el programa. Se aplica a los archivos que se creen a partir de ese momento.

-Desfragmentar: mueve los archivos para que cada uno quede en un solo run, uno detrás del otro, y todo el espacio libre quede junto al final del disco.

-Ver mapa del disco: muestra cada cluster con un caracter. S es el sistema, . es un cluster libre y cada letra es un archivo. El número de la izquierda es el primer cluster de la fila.
 
-Ver métricas: muestra la ocupación del disco, la cantidad de huecos libres, el hueco más grande, la fragmentación externa (qué parte del espacio libre está separada del hueco más grande), la cantidad de archivos fragmentados y el promedio de runs por archivo.
Salir: termina el programa.

-Errores
Los errores se muestran en pantalla y el programa sigue funcionando:

Espacio insuficiente: el archivo pide más clusters de los que hay libres.

Archivo no encontrado: se intenta eliminar un archivo que no existe.

Nombre duplicado: ya existe un archivo con ese nombre. Igual que en Windows, no se distinguen mayúsculas, así que a.txt y A.TXT son el mismo archivo.

Nombre inválido: el nombre está vacío o tiene alguno de estos caracteres: \ / : * ? " < > |

Tamaño inválido: el tamaño no es un número entero mayor o igual a 0.

MFT llena: se alcanzó el máximo de archivos.

-Ejemplo: cómo se fragmenta un archivo

Crear a.txt, b.txt y c.txt de 10 clusters cada uno.
Eliminar b.txt. Queda un hueco de 10 clusters entre a.txt y c.txt.
Crear grande.iso de 35 clusters. No entra en ningún hueco solo, así que se guarda en 2 runs: 30 clusters al final del disco y 5 en el hueco que dejó b.txt.
Ver el mapa (opción 5) y la MFT (opción 6) para ver los dos runs.
Desfragmentar (opción 4) y volver a ver el mapa: grande.iso queda en un solo run.