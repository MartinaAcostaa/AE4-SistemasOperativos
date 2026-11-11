import { describe, it, expect } from 'vitest';
import { MFT, PRIMER_REGISTRO_USUARIO } from '../src/mft';
import { RegistroMFT } from '../src/tipos';

// Función auxiliar para crear un registro de prueba
function registro(mft: MFT, nombre: string): RegistroMFT {
  return {
    numero: mft.siguienteNumeroLibre(),
    nombre,
    tamanioClusters: 1,
    residente: false,
    tramos: [],
    simbolo: mft.siguienteSimbolo(),
  };
}

describe('MFT', () => {
  it('el primer archivo usa el registro 24', () => {
    const mft = new MFT(10);
    mft.agregar(registro(mft, 'a.txt'));
    expect(mft.buscar('a.txt').numero).toBe(PRIMER_REGISTRO_USUARIO);
  });

  it('no distingue mayúsculas y rechaza duplicados', () => {
    const mft = new MFT(10);
    mft.agregar(registro(mft, 'Foto.JPG'));
    expect(mft.existe('foto.jpg')).toBe(true);
    expect(() => mft.agregar(registro(mft, 'FOTO.jpg'))).toThrow('duplicado');
  });

  it('buscar o eliminar un archivo que no existe da error', () => {
    const mft = new MFT(10);
    expect(() => mft.buscar('nada.txt')).toThrow('no encontrado');
    expect(() => mft.eliminar('nada.txt')).toThrow('no encontrado');
  });

  it('reutiliza el número de registro de un archivo borrado', () => {
    const mft = new MFT(10);
    mft.agregar(registro(mft, 'a'));
    mft.agregar(registro(mft, 'b'));
    mft.eliminar('a');                 // libera el registro 24
    mft.agregar(registro(mft, 'c'));
    expect(mft.buscar('c').numero).toBe(24);
  });

  it('da error cuando la MFT está llena', () => {
    const mft = new MFT(2);
    mft.agregar(registro(mft, 'a'));
    mft.agregar(registro(mft, 'b'));
    expect(() => mft.siguienteNumeroLibre()).toThrow('llena');
  });
});