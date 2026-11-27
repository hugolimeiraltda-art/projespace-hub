import { describe, it, expect } from 'bun:test';
import { empresaPorFilial, disponivelPara, precosEmpresa, somaPrecosKit, kitDisponivel, catalogoEmpresa, itemNoCatalogo } from './catalog-company.ts';

describe('Catálogo Emive/Graber', () => {
  it('Graber atende SPO e Emive as demais praças', () => {
    expect(empresaPorFilial('SPO')).toBe('graber');
    for (const filial of ['BHZ', 'VIX', 'RJO']) expect(empresaPorFilial(filial)).toBe('emive');
  });
  it('disponibilidade exclusiva não aparece na outra empresa', () => {
    expect(disponivelPara({ disponibilidade: 'emive' }, 'graber')).toBe(false);
    expect(disponivelPara({ disponibilidade: 'graber' }, 'emive')).toBe(false);
    expect(disponivelPara({ disponibilidade: 'ambas' }, 'graber')).toBe(true);
    expect(disponivelPara({ disponibilidade: 'ambas' }, 'emive')).toBe(true);
  });
  it('seleciona preço e código do ERP da empresa', () => {
    const item = { disponibilidade: 'ambas', codigo: 'SK1', codigo_srv: 'SRV1', preco_unitario: 100, valor_locacao: 5, valor_instalacao: 10, valor_venda_graber: 200, valor_locacao_graber: 8 };
    expect(precosEmpresa(item, 'emive').venda).toBe(100);
    expect(precosEmpresa(item, 'emive').codigo).toBe('SK1');
    expect(precosEmpresa(item, 'graber').venda).toBe(200);
    expect(precosEmpresa(item, 'graber').locacao).toBe(8);
    expect(precosEmpresa(item, 'graber', 12).instalacao).toBe(24);
    expect(precosEmpresa(item, 'graber').codigo).toBe('SRV1');
  });
  it('não copia preço Emive quando preço Graber está pendente', () => {
    const price = precosEmpresa({ disponibilidade: 'ambas', preco_unitario: 100 }, 'graber');
    expect(price.venda).toBeNull();
    expect(price.completo).toBe(false);
  });
  it('soma preços do kit por empresa e quantidade', () => {
    const totals = somaPrecosKit([{ quantidade: 3, produto: { preco_unitario: 100, valor_locacao: 5, valor_venda_graber: 200, valor_locacao_graber: 8 } }]);
    expect(totals.preco_kit).toBe(300);
    expect(totals.valor_venda_graber).toBe(600);
    expect(totals.valor_locacao_graber).toBe(24);
  });
  it('kit não pode ofertar componente exclusivo da outra empresa', () => {
    expect(kitDisponivel({ disponibilidade: 'ambas' }, [{ disponibilidade: 'emive' }], 'graber')).toBe(false);
  });
});
describe('Preços pendentes', () => {
  it('kit mantém pendência quando algum componente não tem preço Graber', () => {
    const totals = somaPrecosKit([{ quantidade: 2, produto: { preco_unitario: 50, valor_venda_graber: null, valor_locacao_graber: 5 } }]);
    expect(totals.valor_venda_graber).toBeNull();
    expect(totals.valor_locacao_graber).toBe(10);
  });
});


describe('Propostas por empresa', () => {
  it('não oferece item sem preço ou de outra empresa', () => {
    const items = catalogoEmpresa([
      { nome: 'Sem preço', disponibilidade: 'ambas', preco_unitario: 500 },
      { nome: 'Só Emive', disponibilidade: 'emive', valor_venda_graber: 100, valor_locacao_graber: 5 },
      { nome: 'Graber', disponibilidade: 'ambas', codigo_srv: 'SRV1', valor_venda_graber: 200, valor_locacao_graber: 10 },
    ], 'graber');
    expect(items.length).toBe(1);
    expect(items[0].preco_unitario).toBe(200);
    expect(items[0].codigo).toBe('SRV1');
    expect(itemNoCatalogo({ nome: 'Só Emive' }, items)).toBeUndefined();
  });
});
