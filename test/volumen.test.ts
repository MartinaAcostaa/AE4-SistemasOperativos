import { describe, it, expect } from 'vitest';
import { VolumenNTFS, CONFIG_POR_DEFECTO } from '../src/volumen';

// Disco chico: 20 clusters, 2 de sistema, 18 libres
const nuevo = () => new VolumenNTFS({ ...CONFIG_POR_DEFECTO, totalClusters: 20, clustersSistema: 2 });

// Deja el disco con huecos de 4 y 4 (8 libres en total), sin uno de 7 
function discoFragmentado() {
  const v = nuevo();
  v.crear('a', 4); // 2-5
  v.crear('b', 4); // 6-9
  v.crear('c', 4); // 10-13
  v.crear('d', 6); // 14-19 disco lleno
  v.eliminar('a');
  v.eliminar('c');
  return v;
}

describe('VolumenNTFS', () => {
  it('crear ocupa clusters después del área de sistema', () => {
    const v = nuevo();
    v.crear('a.txt', 5);
    expect(v.mft.buscar('a.txt').tramos).toEqual([{ inicio: 2, longitud: 5 }]);
    expect(v.metricas().clustersLibres).toBe(13);
  });

  it('eliminar libera los clusters', () => {
    const v = nuevo();
    v.crear('a.txt', 5);
    v.eliminar('a.txt');
    expect(v.metricas().clustersLibres).toBe(18);
    expect(v.mft.cantidad()).toBe(0);
  });

  it('archivo de 0 clusters es residente', () => {
    const v = nuevo();
    v.crear('nota.txt', 0);
    expect(v.mft.buscar('nota.txt').residente).toBe(true);
    expect(v.metricas().clustersLibres).toBe(18);
  });

  it('se fragmenta cuando ningún hueco alcanza', () => {
    const v = discoFragmentado();
    v.crear('e', 7);
    expect(v.mft.buscar('e').tramos.length).toBe(2);
    expect(v.metricas().archivosFragmentados).toBe(1);
  });

  it('calcula la fragmentación externa', () => {
    const v = discoFragmentado(); // 8 libres, mayor hueco 4
    const m = v.metricas();
    expect(m.cantidadHuecos).toBe(2);
    expect(m.mayorHueco).toBe(4);
    expect(m.fragmentacionExterna).toBe(50);
  });

  it('desfragmentar deja todo contiguo', () => {
    const v = discoFragmentado();
    v.crear('e', 7);
    v.eliminar('b');
    v.desfragmentar();
    const m = v.metricas();
    expect(m.archivosFragmentados).toBe(0);
    expect(m.fragmentacionExterna).toBe(0);
  });

  it('errores: duplicado, inexistente, sin espacio, nombre y tamaño inválidos', () => {
    const v = nuevo();
    v.crear('a.txt', 1);
    expect(() => v.crear('A.TXT', 1)).toThrow('duplicado');
    expect(() => v.eliminar('zzz')).toThrow('no encontrado');
    expect(() => v.crear('grande', 100)).toThrow('insuficiente');
    expect(() => v.crear('mal:nombre', 1)).toThrow('inválido');
    expect(() => v.crear('neg', -2)).toThrow('entero');
    expect(() => v.crear('dec', 1.5)).toThrow('entero');
  });

  it('un error no deja clusters ocupados', () => {
    const v = nuevo();
    expect(() => v.crear('grande', 100)).toThrow();
    expect(v.metricas().clustersLibres).toBe(18);
    expect(v.mft.cantidad()).toBe(0);
  });

  it('rechaza discos de tamaño inválido', () => {
    expect(() => new VolumenNTFS({ ...CONFIG_POR_DEFECTO, totalClusters: 2 })).toThrow('entre 8 y 4096');
  });

  it('rechaza clusters de sistema o MFT inválidos', () => {
    expect(() => new VolumenNTFS({ ...CONFIG_POR_DEFECTO, clustersSistema: 64 })).toThrow('clusters de sistema');
    expect(() => new VolumenNTFS({ ...CONFIG_POR_DEFECTO, clustersSistema: -1 })).toThrow('clusters de sistema');
    expect(() => new VolumenNTFS({ ...CONFIG_POR_DEFECTO, maxArchivos: 0 })).toThrow('al menos 1 archivo');
  });

});