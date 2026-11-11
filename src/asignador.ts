import { Bitmap } from './bitmap';
import { ErrorSistemaArchivos, Estrategia, Tramo } from './tipos';

// Formato para mostrar un tramo: [inicio-fin](longitud) 
export function fmtTramo(t: Tramo): string {
  return `[${t.inicio}-${t.inicio + t.longitud - 1}](${t.longitud})`;
}

//Elige, según la estrategia, un hueco donde entren `n` clusters.
// Devuelve undefined si no hay ningún hueco suficientemente grande.
export function elegirHueco(huecos: Tramo[], n: number, estrategia: Estrategia): Tramo | undefined {
  const candidatos = huecos.filter((h) => h.longitud >= n);
  if (candidatos.length === 0) return undefined;

  if (estrategia === 'first-fit') {
    // el que está más a la izquierda en el disco
    return candidatos.reduce((a, b) => (b.inicio < a.inicio ? b : a));
  }
  if (estrategia === 'best-fit') {
    // el más chico donde entra
    return candidatos.reduce((a, b) => (b.longitud < a.longitud ? b : a));
  }
  // worst-fit: el más grande
  return candidatos.reduce((a, b) => (b.longitud > a.longitud ? b : a));
}

// Calcula qué tramos (runs) usar para un archivo de clusters.
// NO modifica el bitmap: solo decide. Devuelve los tramos y el paso a paso.
export function calcularAsignacion(
  bitmap: Bitmap,
  clusters: number,
  estrategia: Estrategia,
): { tramos: Tramo[]; pasos: string[] } {
  const pasos: string[] = [];
  const huecos = bitmap.tramosLibres();
  const totalLibre = huecos.reduce((suma, h) => suma + h.longitud, 0);

  pasos.push(`Huecos libres en el $Bitmap: ${huecos.length === 0 ? 'ninguno' : huecos.map(fmtTramo).join(', ')}`);
  pasos.push(`Clusters libres: ${totalLibre}. Clusters pedidos: ${clusters}.`);

  // ¿Alcanza el espacio total?
  if (clusters > totalLibre) {
    throw new ErrorSistemaArchivos(
      'ESPACIO_INSUFICIENTE',
      `Espacio en disco insuficiente: se piden ${clusters} clusters y solo hay ${totalLibre} libres.`,
    );
  }

  // ¿Entra entero en un solo hueco? 1 run, sin fragmentar
  const elegido = elegirHueco(huecos, clusters, estrategia);
  if (elegido) {
    pasos.push(`El archivo entra completo. Con ${estrategia} se elige el hueco ${fmtTramo(elegido)}.`);
    return { tramos: [{ inicio: elegido.inicio, longitud: clusters }], pasos };
  }

  // No entra en ninguno, se fragmenta en varios runs
  pasos.push('Ningún hueco alcanza solo: el archivo se va a FRAGMENTAR.');
  const disponibles = [...huecos];
  const tramos: Tramo[] = [];
  let restantes = clusters;

  while (restantes > 0) {
    // si lo que falta ya entra en un hueco, se usa la estrategia, si no, el hueco más grande
    let hueco = elegirHueco(disponibles, restantes, estrategia);
    if (!hueco) hueco = disponibles.reduce((a, b) => (b.longitud > a.longitud ? b : a));

    const tomar = Math.min(hueco.longitud, restantes);
    tramos.push({ inicio: hueco.inicio, longitud: tomar });
    pasos.push(`  Se toman ${tomar} cluster(s) del hueco ${fmtTramo(hueco)}. Faltan ${restantes - tomar}.`);
    restantes -= tomar;
    disponibles.splice(disponibles.indexOf(hueco), 1); // ese hueco ya se usó
  }
  return { tramos, pasos };
}