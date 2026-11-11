import { describe, it, expect } from 'vitest';
import { Bitmap } from '../src/bitmap';

describe('Bitmap', () => {
  it('empieza con todos los clusters libres', () => {
    const b = new Bitmap(10);
    expect(b.contarLibres()).toBe(10);
    expect(b.tramosLibres()).toEqual([{ inicio: 0, longitud: 10 }]);
  });

  it('marcar ocupa y libera clusters', () => {
    const b = new Bitmap(10);
    b.marcar({ inicio: 2, longitud: 3 }, true);
    expect(b.comoTexto()).toBe('0011100000');
    b.marcar({ inicio: 2, longitud: 3 }, false);
    expect(b.contarLibres()).toBe(10);
  });

  it('encuentra los huecos separados', () => {
    const b = new Bitmap(10);
    b.marcar({ inicio: 2, longitud: 3 }, true);
    b.marcar({ inicio: 7, longitud: 1 }, true);
    expect(b.tramosLibres()).toEqual([
      { inicio: 0, longitud: 2 },
      { inicio: 5, longitud: 2 },
      { inicio: 8, longitud: 2 },
    ]);
  });
});