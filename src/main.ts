import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { VolumenNTFS, CONFIG_POR_DEFECTO, ConfigVolumen } from './volumen';
import { ErrorSistemaArchivos, Estrategia, ESTRATEGIAS } from './tipos';

const rl = readline.createInterface({ input, output });

// Hace una pregunta; si el usuario solo apreta Enter, devuelve el valor por defecto
async function preguntar(texto: string, porDefecto: string): Promise<string> {
  const resp = (await rl.question(`${texto} [${porDefecto}]: `)).trim();
  return resp === '' ? porDefecto : resp;
}

// Pide un número entero; repite la pregunta hasta que sea válido
async function pedirEntero(texto: string, porDefecto: number): Promise<number> {
  while (true) {
    const n = Number(await preguntar(texto, String(porDefecto)));
    if (Number.isInteger(n)) return n;
    console.log('  ✗ Tiene que ser un número entero.');
  }
}

// Pide la estrategia de asignación por número (1, 2 o 3)
async function pedirEstrategia(porDefecto: Estrategia): Promise<Estrategia> {
  console.log('Estrategias de asignación:');
  ESTRATEGIAS.forEach((e, i) => console.log(`  ${i + 1}) ${e}`));
  while (true) {
    const resp = await preguntar('Elegí una estrategia', String(ESTRATEGIAS.indexOf(porDefecto) + 1));
    const e = ESTRATEGIAS[Number(resp) - 1];
    if (e) return e;
    console.log(`  ✗ Opción inválida: elegí un número del 1 al ${ESTRATEGIAS.length}.`);
  }
}

// Parte 1: configurar el disco. Si algún parámetro es inválido, se vuelve a preguntar todo
async function configurarVolumen(): Promise<VolumenNTFS> {
  console.log('\n=== Configuración del volumen (Enter = valor por defecto) ===');
  while (true) {
    const config: ConfigVolumen = {
      totalClusters: await pedirEntero('Tamaño del disco en clusters (8 a 4096)', CONFIG_POR_DEFECTO.totalClusters),
      tamanioClusterKB: await pedirEntero('Tamaño de cada cluster en KB', CONFIG_POR_DEFECTO.tamanioClusterKB),
      clustersSistema: await pedirEntero('Clusters reservados para el sistema', CONFIG_POR_DEFECTO.clustersSistema),
      maxArchivos: await pedirEntero('Máximo de archivos en la MFT', CONFIG_POR_DEFECTO.maxArchivos),
      estrategia: await pedirEstrategia(CONFIG_POR_DEFECTO.estrategia),
    };
    try {
      return new VolumenNTFS(config); // acá se usan las validaciones del constructor
    } catch (e) {
      if (e instanceof ErrorSistemaArchivos) {
        console.log(`  ✗ ${e.message} Probá de nuevo.\n`);
      } else {
        throw e; // un error que no es del simulador: no lo escondemos
      }
    }
  }
}

// Muestra el paso a paso que devuelven crear, eliminar y desfragmentar
function mostrarPasos(pasos: string[]): void {
  for (const p of pasos) console.log(`  • ${p}`);
}

// Parte 2: el menú. Se repite hasta que el usuario elige salir
async function menu(volumen: VolumenNTFS): Promise<void> {
  while (true) {
    console.log(`\n=== Menú (estrategia actual: ${volumen.estrategia}) ===`);
    console.log('  1) Crear archivo');
    console.log('  2) Eliminar archivo');
    console.log('  3) Cambiar estrategia');
    console.log('  4) Desfragmentar');
    console.log('  0) Salir');
    const opcion = (await rl.question('Opción: ')).trim();

    try {
      switch (opcion) {
        case '1': {
          const nombre = await rl.question('Nombre del archivo: ');
          const clusters = await pedirEntero('Tamaño en clusters (0 = residente)', 1);
          mostrarPasos(volumen.crear(nombre, clusters));
          console.log('✓ Archivo creado.');
          break;
        }
        case '2': {
          const nombre = await rl.question('Nombre del archivo a eliminar: ');
          mostrarPasos(volumen.eliminar(nombre));
          console.log('✓ Archivo eliminado.');
          break;
        }
        case '3':
          volumen.estrategia = await pedirEstrategia(volumen.estrategia);
          console.log(`✓ Ahora se usa ${volumen.estrategia}.`);
          break;
        case '4':
          mostrarPasos(volumen.desfragmentar());
          console.log('✓ Disco desfragmentado.');
          break;
        case '0':
          return;
        default:
          console.log('  ✗ Opción inválida.');
      }
    } catch (e) {
      // Los errores del simulador (sin espacio, duplicado, etc.) se muestran y el programa sigue
      if (e instanceof ErrorSistemaArchivos) {
        console.log(`  ✗ Error [${e.codigo}]: ${e.message}`);
      } else {
        throw e;
      }
    }
  }
}

async function main(): Promise<void> {
  console.log('Simulador de asignación de espacio en disco — NTFS (Windows 11)');
  const volumen = await configurarVolumen();
  const m = volumen.metricas();
  console.log(`\n✓ Volumen creado: ${m.clustersTotales} clusters de ${volumen.config.tamanioClusterKB} KB ` +
    `(${m.capacidadKB} KB), ${m.clustersSistema} de sistema, estrategia ${volumen.estrategia}.`);
  await menu(volumen);
  console.log('¡Hasta luego!');
  rl.close();
}

main();