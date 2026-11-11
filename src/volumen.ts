import { Bitmap } from './bitmap';
import { MFT } from './mft';
import { calcularAsignacion, fmtTramo } from './asignador';
import { ErrorSistemaArchivos, Estrategia, RegistroMFT, Tramo } from './tipos';

export interface ConfigVolumen {
  totalClusters: number;    // tamaño del disco en clusters
  tamanioClusterKB: number; // 4 KB, como la mayoría de los volúmenes NTFS
  clustersSistema: number;  // clusters reservados al inicio ($Boot, $MFT, $Bitmap)
  estrategia: Estrategia;
  maxArchivos: number;      // registros disponibles en la MFT
}

export const CONFIG_POR_DEFECTO: ConfigVolumen = {
  totalClusters: 64,
  tamanioClusterKB: 4,
  clustersSistema: 4,
  estrategia: 'best-fit',
  maxArchivos: 60,
};

export interface Metricas {
  clustersTotales: number;
  clustersSistema: number;
  clustersUsados: number;
  clustersLibres: number;
  porcentajeOcupacion: number;
  capacidadKB: number;
  libreKB: number;
  cantidadHuecos: number;
  mayorHueco: number;
  fragmentacionExterna: number; // % del espacio libre que NO está en el hueco más grande
  cantidadArchivos: number;
  archivosResidentes: number;
  archivosFragmentados: number;
  promedioTramosPorArchivo: number;
}

// Caracteres que Windows no permite en nombres de archivo
const NOMBRE_VALIDO = /^[^\\/:*?"<>|]{1,64}$/;

// Volumen NTFS simulado: une el $Bitmap, la MFT y el asignador
export class VolumenNTFS {
  readonly bitmap: Bitmap;
  readonly mft: MFT;
  readonly config: ConfigVolumen;

  constructor(config: ConfigVolumen = CONFIG_POR_DEFECTO) {
    this.config = { ...config }; // copia, para no modificar la configuración original
    if (!Number.isInteger(config.totalClusters) || config.totalClusters < 8 || config.totalClusters > 4096) {
      throw new ErrorSistemaArchivos('PARAMETRO_INVALIDO', 'El disco debe tener entre 8 y 4096 clusters.');
    }
    this.bitmap = new Bitmap(config.totalClusters);
    this.mft = new MFT(config.maxArchivos);
    // Los primeros clusters los ocupa el propio sistema de archivos
    if (config.clustersSistema > 0) {
      this.bitmap.marcar({ inicio: 0, longitud: config.clustersSistema }, true);
    }
  }

  get estrategia(): Estrategia {
    return this.config.estrategia;
  }
  set estrategia(e: Estrategia) {
    this.config.estrategia = e;
  }

  // Crea un archivo. Si clusters = 0, es RESIDENTE: 
  // sus datos se guardan dentro del registro de la MFT y no ocupa clusters
// Devuelve el paso a paso de lo que hizo 
  crear(nombre: string, clusters: number): string[] {
    const pasos: string[] = [];
    nombre = nombre.trim();

    //Validaciones ANTES de tocar el disco
    if (!NOMBRE_VALIDO.test(nombre)) {
      throw new ErrorSistemaArchivos('NOMBRE_INVALIDO',
        `Nombre inválido: "${nombre}". No puede estar vacío ni tener \\ / : * ? " < > |`);
    }
    if (!Number.isInteger(clusters) || clusters < 0) {
      throw new ErrorSistemaArchivos('TAMANIO_INVALIDO', 'El tamaño debe ser un número entero de clusters (0 o más).');
    }
    if (this.mft.existe(nombre)) {
      throw new ErrorSistemaArchivos('NOMBRE_DUPLICADO', `Nombre de archivo duplicado: ya existe "${nombre}".`);
    }

    // Reservar registro en la MFT
    const numero = this.mft.siguienteNumeroLibre();
    pasos.push(`Se reserva el registro #${numero} de la MFT para "${nombre}".`);

    // Asignar clusters
    let tramos: Tramo[] = [];
    if (clusters === 0) {
      pasos.push('Tamaño 0 → archivo RESIDENTE: los datos van dentro del registro MFT, no usa clusters.');
    } else {
      const asignacion = calcularAsignacion(this.bitmap, clusters, this.config.estrategia);
      pasos.push(...asignacion.pasos);
      tramos = asignacion.tramos;
      for (const t of tramos) this.bitmap.marcar(t, true);
      pasos.push(`Se marcan como ocupados en el $Bitmap: ${tramos.map(fmtTramo).join(', ')}.`);
    }

    // Guardar el registro
    const registro: RegistroMFT = {
      numero,
      nombre,
      tamanioClusters: clusters,
      residente: clusters === 0,
      tramos,
      simbolo: this.mft.siguienteSimbolo(),
    };
    this.mft.agregar(registro);
    if (!registro.residente) {
      pasos.push(`Lista de runs guardada en el registro: ${describirRuns(tramos)}.`);
    }
    if (tramos.length > 1) pasos.push(`⚠ El archivo quedó FRAGMENTADO en ${tramos.length} runs.`);
    return pasos;
  }

  // Elimina un archivo: libera sus clusters y su registro
  eliminar(nombre: string): string[] {
    const pasos: string[] = [];
    const reg = this.mft.eliminar(nombre.trim()); // si no existe, ARCHIVO_NO_ENCONTRADO
    pasos.push(`Se busca "${reg.nombre}" en la MFT → registro #${reg.numero}.`);
    if (reg.residente) {
      pasos.push('Era residente: no tenía clusters para liberar.');
    } else {
      for (const t of reg.tramos) this.bitmap.marcar(t, false);
      pasos.push(`Se liberan en el $Bitmap: ${reg.tramos.map(fmtTramo).join(', ')}.`);
    }
    pasos.push(`El registro #${reg.numero} queda libre para reutilizarse.`);
    return pasos;
  }

  // Como "Desfragmentar y optimizar unidades": cada archivo queda en 1 run, uno detrás del otro 
  desfragmentar(): string[] {
    const pasos: string[] = [];
    const archivos = this.mft
      .listar()
      .filter((r) => !r.residente)
      .sort((a, b) => a.tramos[0].inicio - b.tramos[0].inicio);

    // liberar todo y volver a ubicar en orden
    for (const r of archivos) for (const t of r.tramos) this.bitmap.marcar(t, false);

    let cursor = this.config.clustersSistema;
    for (const r of archivos) {
      const antes = r.tramos.length;
      const nuevo: Tramo = { inicio: cursor, longitud: r.tamanioClusters };
      r.tramos = [nuevo];
      this.bitmap.marcar(nuevo, true);
      cursor += r.tamanioClusters;
      pasos.push(`"${r.nombre}": ${antes} run(s) → 1 run ${fmtTramo(nuevo)}`);
    }
    if (archivos.length === 0) pasos.push('No hay archivos para mover.');
    pasos.push('Todo el espacio libre quedó junto al final del disco.');
    return pasos;
  }

  // Para cada cluster: qué archivo lo ocupa, 'sistema' o null si está libre.
  duenioDeCluster(): (RegistroMFT | 'sistema' | null)[] {
    const mapa: (RegistroMFT | 'sistema' | null)[] = new Array(this.config.totalClusters).fill(null);
    for (let i = 0; i < this.config.clustersSistema; i++) mapa[i] = 'sistema';
    for (const r of this.mft.listar()) {
      for (const t of r.tramos) {
        for (let i = t.inicio; i < t.inicio + t.longitud; i++) mapa[i] = r;
      }
    }
    return mapa;
  }

  metricas(): Metricas {
    const total = this.config.totalClusters;
    const sistema = this.config.clustersSistema;
    const libres = this.bitmap.contarLibres();
    const huecos = this.bitmap.tramosLibres();
    const mayorHueco = huecos.reduce((m, h) => Math.max(m, h.longitud), 0);
    const archivos = this.mft.listar();
    const noResidentes = archivos.filter((a) => !a.residente);
    const totalTramos = noResidentes.reduce((s, a) => s + a.tramos.length, 0);

    return {
      clustersTotales: total,
      clustersSistema: sistema,
      clustersUsados: total - sistema - libres,
      clustersLibres: libres,
      porcentajeOcupacion: ((total - libres) / total) * 100,
      capacidadKB: total * this.config.tamanioClusterKB,
      libreKB: libres * this.config.tamanioClusterKB,
      cantidadHuecos: huecos.length,
      mayorHueco,
      fragmentacionExterna: libres === 0 ? 0 : (1 - mayorHueco / libres) * 100,
      cantidadArchivos: archivos.length,
      archivosResidentes: archivos.length - noResidentes.length,
      archivosFragmentados: noResidentes.filter((a) => a.tramos.length > 1).length,
      promedioTramosPorArchivo: noResidentes.length === 0 ? 0 : totalTramos / noResidentes.length,
    };
  }
}

//Muestra los runs como VCN → LCN (posición en el archivo → posición en el disco)
export function describirRuns(tramos: Tramo[]): string {
  let vcn = 0;
  return tramos
    .map((t) => {
      const s = `VCN ${vcn}-${vcn + t.longitud - 1} → LCN ${t.inicio}-${t.inicio + t.longitud - 1}`;
      vcn += t.longitud;
      return s;
    })
    .join(' | ');
}