// Un run: tramo de clusters seguidos en el disco 
export interface Tramo {
  inicio: number;   // LCN del primer cluster
  longitud: number; // cuántos clusters seguidos
}

// Registro de la MFT: cumple la función del inodo de UNIX 
export interface RegistroMFT {
  numero: number;
  nombre: string;
  tamanioClusters: number; // 0 = archivo residente
  residente: boolean;
  tramos: Tramo[];         // lista de runs
  simbolo: string;         // letra para dibujarlo en el mapa
}

export type Estrategia = 'first-fit' | 'best-fit' | 'worst-fit';
export const ESTRATEGIAS: Estrategia[] = ['first-fit', 'best-fit', 'worst-fit'];

export type CodigoError =
  | 'ESPACIO_INSUFICIENTE'
  | 'ARCHIVO_NO_ENCONTRADO'
  | 'NOMBRE_DUPLICADO'
  | 'NOMBRE_INVALIDO'
  | 'TAMANIO_INVALIDO'
  | 'MFT_LLENA'
  | 'PARAMETRO_INVALIDO';

export class ErrorSistemaArchivos extends Error {
  constructor(public readonly codigo: CodigoError, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorSistemaArchivos';
  }
}