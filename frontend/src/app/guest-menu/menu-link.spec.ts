import type { Cocktail, Ingredient } from '@cocktailapp/shared';
import { describe, expect, it } from 'vitest';
import {
  MENU_TITLE_MAX,
  buildMenuUrl,
  cleanTitle,
  groupByFamily,
  menuKey,
  parseMenuKeys,
  resolveMenu,
} from './menu-link';

const ING = [
  { id: 'cachaca', name: 'Cachaça', category: 'spirit', abv: 40 },
  { id: 'vodka', name: 'Wodka', category: 'spirit', abv: 40 },
  { id: 'gin', name: 'Gin', category: 'spirit', abv: 40 },
  { id: 'lime', name: 'Limoen', category: 'fruit', abv: 0 },
  { id: 'sugar', name: 'Suiker', category: 'sweetener', abv: 0 },
  { id: 'mint', name: 'Munt', category: 'herb', abv: 0 },
  { id: 'soda', name: 'Spuitwater', category: 'mixer', abv: 0 },
] as unknown as Ingredient[];

function line(ingredientId: string, amount = 30) {
  const name = ING.find((i) => i.id === ingredientId)!.name;
  return { ingredientId, name, amount, unit: 'ml' };
}

const CAIPIRINHA = {
  id: 'caipirinha',
  name: 'Caipirinha',
  family: 'sour',
  glass: 'rocks',
  ingredients: [line('cachaca', 50), line('lime'), line('sugar', 10)],
  variations: [
    { key: 'caipiroska', name: 'Caipiroska', swaps: [{ fromId: 'cachaca', toId: 'vodka' }] },
    { key: 'prose-only', name: 'Without swaps' },
  ],
} as unknown as Cocktail;
const VIRGIN = {
  id: 'virgin-mojito',
  name: 'Virgin Mojito',
  family: 'fizz',
  ingredients: [line('lime'), line('sugar', 10), line('mint', 5), line('soda', 100)],
} as unknown as Cocktail;
const GIMLET = {
  id: 'gimlet',
  name: 'Gimlet',
  family: 'sour',
  ingredients: [line('gin', 60), line('lime', 20)],
} as unknown as Cocktail;
const NEGRONI = {
  id: 'negroni',
  name: 'Negroni',
  family: 'spirit-forward',
  ingredients: [line('gin')],
} as unknown as Cocktail;
const CATALOG = [CAIPIRINHA, VIRGIN, GIMLET, NEGRONI];

describe('parseMenuKeys', () => {
  it('reads plain ids and id~variation keys, in order', () => {
    expect(parseMenuKeys('negroni,caipirinha~caipiroska')).toEqual([
      { key: 'negroni', cocktailId: 'negroni' },
      { key: 'caipirinha~caipiroska', cocktailId: 'caipirinha', variationKey: 'caipiroska' },
    ]);
  });

  it('drops empty, duplicate and malformed entries', () => {
    const keys = parseMenuKeys(',negroni,,negroni, ,a~b~c,~x,ok~,<script>,Gimlet ');
    expect(keys.map((k) => k.key)).toEqual(['negroni', 'gimlet']);
  });

  it('gives no keys for a missing or empty m', () => {
    expect(parseMenuKeys(null)).toEqual([]);
    expect(parseMenuKeys(undefined)).toEqual([]);
    expect(parseMenuKeys('')).toEqual([]);
  });
});

describe('resolveMenu', () => {
  it('skips unknown cocktails silently', () => {
    const entries = resolveMenu(parseMenuKeys('negroni,no-such-drink,gimlet'), CATALOG, ING);
    expect(entries.map((e) => e.key)).toEqual(['negroni', 'gimlet']);
  });

  it('resolves a variation to its own recipe under the parent id', () => {
    const [e] = resolveMenu(parseMenuKeys('caipirinha~caipiroska'), CATALOG, ING);
    expect(e.cocktail.id).toBe('caipirinha');
    expect(e.cocktail.name).toBe('Caipiroska');
    expect(e.variationKey).toBe('caipiroska');
    expect(e.parentName).toBe('Caipirinha');
    expect(e.cocktail.ingredients.map((l) => l.name)).toEqual(['Wodka', 'Limoen', 'Suiker']);
  });

  it('skips a variation whose parent is unknown, or that the parent does not have', () => {
    const keys = parseMenuKeys('nope~caipiroska,caipirinha~nope,caipirinha~prose-only');
    expect(resolveMenu(keys, CATALOG, ING)).toEqual([]);
  });

  it('marks alcohol-free drinks', () => {
    const entries = resolveMenu(parseMenuKeys('virgin-mojito,gimlet'), CATALOG, ING);
    expect(entries.map((e) => [e.key, e.alcoholFree])).toEqual([
      ['virgin-mojito', true],
      ['gimlet', false],
    ]);
  });

  it('gives an empty menu for an empty link', () => {
    expect(resolveMenu(parseMenuKeys(''), CATALOG, ING)).toEqual([]);
  });
});

describe('cleanTitle', () => {
  it('falls back to null when there is nothing to show', () => {
    expect(cleanTitle(null)).toBeNull();
    expect(cleanTitle('')).toBeNull();
    expect(cleanTitle('  \n\t ')).toBeNull();
  });

  it('collapses whitespace and strips control characters', () => {
    expect(cleanTitle('  Zaterdag\u0000\n  avond ')).toBe('Zaterdag avond');
  });

  it(`truncates to ${MENU_TITLE_MAX} characters without splitting a character`, () => {
    const long = 'é'.repeat(60);
    expect(Array.from(cleanTitle(long)!)).toHaveLength(MENU_TITLE_MAX);
    const emoji = '🍸'.repeat(50);
    expect(Array.from(cleanTitle(emoji)!)).toHaveLength(MENU_TITLE_MAX);
  });

  it('keeps markup as plain text (Angular escapes it when rendered)', () => {
    expect(cleanTitle('<b>Feest</b>')).toBe('<b>Feest</b>');
  });
});

describe('buildMenuUrl', () => {
  it('writes explicit keys with literal commas and an encoded title', () => {
    const url = buildMenuUrl('http://192.168.1.100', 'Zaterdag & zo', [
      menuKey('negroni'),
      menuKey('caipirinha', 'caipiroska'),
    ]);
    expect(url).toBe(
      'http://192.168.1.100/menu?t=Zaterdag%20%26%20zo&m=negroni,caipirinha~caipiroska',
    );
  });

  it('leaves the title out when there is none', () => {
    expect(buildMenuUrl('http://x/', '  ', ['gimlet'])).toBe('http://x/menu?m=gimlet');
  });

  it('round-trips through the parser', () => {
    const url = new URL(buildMenuUrl('http://x', 'Feest', ['negroni', 'caipirinha~caipiroska']));
    expect(cleanTitle(url.searchParams.get('t'))).toBe('Feest');
    expect(parseMenuKeys(url.searchParams.get('m')).map((k) => k.key)).toEqual([
      'negroni',
      'caipirinha~caipiroska',
    ]);
  });
});

describe('groupByFamily', () => {
  it('orders sections as DRINK_FAMILIES and drinks by name, with no-family last', () => {
    const odd = { key: 'odd', cocktail: { name: 'Aaa', family: undefined } };
    const entries = [
      ...resolveMenu(
        parseMenuKeys('virgin-mojito,negroni,gimlet,caipirinha~caipiroska'),
        CATALOG,
        ING,
      ),
      odd,
    ];
    const sections = groupByFamily(entries);
    expect(sections.map((s) => s.family)).toEqual(['sour', 'spirit-forward', 'fizz', null]);
    expect(sections[0].items.map((e) => e.cocktail.name)).toEqual(['Caipiroska', 'Gimlet']);
  });

  it('gives no sections for no drinks', () => {
    expect(groupByFamily([])).toEqual([]);
  });
});
