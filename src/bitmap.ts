import { Tramo } from './tipos';

//Simula el $Bitmap de NTFS: false = libre, true = ocupado 
export class Bitmap {
  private readonly bits: boolean[];

  constructor(public readonly totalClusters: number) {
    this.bits = new Array<boolean>(totalClusters).fill(false);
  }

  estaOcupado(lcn: number): boolean {
    return this.bits[lcn];
  }

  marcar(tramo: Tramo, ocupado: boolean): void {
    for (let i = tramo.inicio; i < tramo.inicio + tramo.longitud; i++) {
      this.bits[i] = ocupado;
    }
  }

  contarLibres(): number {
    return this.bits.filter((b) => !b).length;
  }

  // Devuelve los huecos: tramos de clusters libres seguidos 
  tramosLibres(): Tramo[] {
    const huecos: Tramo[] = [];
    let inicio = -1;
    for (let i = 0; i <= this.totalClusters; i++) {
      const libre = i < this.totalClusters && !this.bits[i];
      if (libre && inicio === -1) inicio = i;
      if (!libre && inicio !== -1) {
        huecos.push({ inicio, longitud: i - inicio });
        inicio = -1;
      }
    }
    return huecos;
  }

  comoTexto(): string {
    return this.bits.map((b) => (b ? '1' : '0')).join('');
  }
}