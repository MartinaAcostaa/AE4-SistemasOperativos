import { ErrorSistemaArchivos, RegistroMFT } from './tipos';

// En NTFS real los registros 0 a 15 son metarchivos del sistema
// ($MFT, $LogFile, $Bitmap, ...) y del 16 al 23 están reservados.
// Los archivos del usuario empiezan en el registro 24.
export const PRIMER_REGISTRO_USUARIO = 24;

export const METARCHIVOS = ['$MFT', '$MFTMirr', '$LogFile', '$Volume', '$AttrDef', '.', '$Bitmap', '$Boot'];

// Letras para dibujar los archivos en el mapa (sin la 'S', que es "sistema")
const SIMBOLOS = 'ABCDEFGHIJKLMNOPQRTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class MFT {
  // Map: clave = nombre en minúsculas, valor = registro
  private readonly registros = new Map<string, RegistroMFT>();

  constructor(public readonly maxRegistros: number) {}

  // Windows no distingue mayúsculas: "Foto.JPG" y "foto.jpg" son el mismo archivo
  private clave(nombre: string): string {
    return nombre.toLowerCase();
  }

  existe(nombre: string): boolean {
    return this.registros.has(this.clave(nombre));
  }

  buscar(nombre: string): RegistroMFT {
    const reg = this.registros.get(this.clave(nombre));
    if (!reg) {
      throw new ErrorSistemaArchivos('ARCHIVO_NO_ENCONTRADO', `Archivo no encontrado: "${nombre}".`);
    }
    return reg;
  }

  // Busca el número de registro libre más bajo (reutiliza los de archivos borrados)
  siguienteNumeroLibre(): number {
    const usados = new Set([...this.registros.values()].map((r) => r.numero));
    for (let n = PRIMER_REGISTRO_USUARIO; n < PRIMER_REGISTRO_USUARIO + this.maxRegistros; n++) {
      if (!usados.has(n)) return n;
    }
    throw new ErrorSistemaArchivos('MFT_LLENA', `La MFT está llena (máximo ${this.maxRegistros} archivos).`);
  }

  // Elige una letra que ningún otro archivo este usando.
  siguienteSimbolo(): string {
    const usados = new Set([...this.registros.values()].map((r) => r.simbolo));
    for (const s of SIMBOLOS) if (!usados.has(s)) return s;
    return '#';
  }

  agregar(reg: RegistroMFT): void {
    if (this.existe(reg.nombre)) {
      throw new ErrorSistemaArchivos('NOMBRE_DUPLICADO', `Nombre de archivo duplicado: ya existe "${reg.nombre}".`);
    }
    this.registros.set(this.clave(reg.nombre), reg);
  }

  eliminar(nombre: string): RegistroMFT {
    const reg = this.buscar(nombre); // si no existe, tira ARCHIVO_NO_ENCONTRADO
    this.registros.delete(this.clave(nombre));
    return reg;
  }

  // Todos los registros ordenados por número
  listar(): RegistroMFT[] {
    return [...this.registros.values()].sort((a, b) => a.numero - b.numero);
  }

  cantidad(): number {
    return this.registros.size;
  }
}