import { describe, it, expect } from 'vitest';
import { Bitmap } from '../src/bitmap';
import { calcularAsignacion } from '../src/asignador';

//Disco de prueba de 20 clusters con 3 huecos: 0-5 libre (6) | 6-7 ocup | 8-10 libre (3) | 11-15 ocup | 16-19 libre (4)

function discoConHuecos(): Bitmap {
  const b = new Bitmap(20);
  b.marcar({ inicio: 6, longitud: 2 }, true);
  b.marcar({ inicio: 11, longitud: 5 }, true);
  return b;
}

describe('Asignador', () => {
  it('en un disco vacío asigna un solo run desde el principio', () => {
    const { tramos } = calcularAsignacion(new Bitmap(10), 4, 'first-fit');
    expect(tramos).toEqual([{ inicio: 0, longitud: 4 }]);
  });

  it('first-fit elige el primer hueco donde entra', () => {
    const { tramos } = calcularAsignacion(discoConHuecos(), 3, 'first-fit');
    expect(tramos).toEqual([{ inicio: 0, longitud: 3 }]);
  });

  it('best-fit elige el hueco más chico donde entra', () => {
    const { tramos } = calcularAsignacion(discoConHuecos(), 3, 'best-fit');
    expect(tramos).toEqual([{ inicio: 8, longitud: 3 }]);
  });

  it('worst-fit elige el hueco más grande', () => {
    const { tramos } = calcularAsignacion(discoConHuecos(), 3, 'worst-fit');
    expect(tramos).toEqual([{ inicio: 0, longitud: 3 }]);
  });

  it('fragmenta cuando ningún hueco alcanza', () => {
    // 9 clusters: el hueco más grande es 6, faltan 3, best-fit usa el de 3 exacto
    const { tramos } = calcularAsignacion(discoConHuecos(), 9, 'best-fit');
    expect(tramos).toEqual([
      { inicio: 0, longitud: 6 },
      { inicio: 8, longitud: 3 },
    ]);
  });

  it('da error si no hay espacio suficiente', () => {
    expect(() => calcularAsignacion(discoConHuecos(), 50, 'best-fit')).toThrow('insuficiente');
  });

  it('no modifica el bitmap (solo calcula)', () => {
    const b = discoConHuecos();
    calcularAsignacion(b, 4, 'best-fit');
    expect(b.contarLibres()).toBe(13);
  });
});