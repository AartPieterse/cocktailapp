import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Cocktail, Ingredient } from '@cocktailapp/shared';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../app.routes';
import { CocktailService } from '../services/cocktail.service';
import { IngredientService } from '../services/ingredient.service';

const ING = [
  { id: 'gin', name: 'Gin', category: 'spirit', abv: 40 },
  { id: 'lime', name: 'Limoen', category: 'fruit', abv: 0 },
  { id: 'soda', name: 'Spuitwater', category: 'mixer', abv: 0 },
] as unknown as Ingredient[];

const COCKTAILS = [
  {
    id: 'gimlet',
    name: 'Gimlet',
    family: 'sour',
    ingredients: [
      { ingredientId: 'gin', name: 'Gin', amount: 60, unit: 'ml' },
      { ingredientId: 'lime', name: 'Limoen', amount: 20, unit: 'ml' },
    ],
  },
  {
    id: 'lime-fizz',
    name: 'Lime Fizz',
    family: 'fizz',
    ingredients: [
      { ingredientId: 'lime', name: 'Limoen', amount: 30, unit: 'ml' },
      { ingredientId: 'soda', name: 'Spuitwater', amount: 100, unit: 'ml' },
    ],
  },
  {
    id: 'martini',
    name: 'Martini',
    family: 'spirit-forward',
    ingredients: [{ ingredientId: 'gin', name: 'Gin', amount: 60, unit: 'ml' }],
  },
] as unknown as Cocktail[];

/** Every key the app persists for the person using it; none may appear for a guest. */
const PERSONAL_KEYS = [
  'barkaart.cabinet',
  'barkaart.wizardDone',
  'barkaart.wizardDraft',
  'barkaart.favorites',
  'barkaart.staplesApplied',
  'barkaart.substitutes',
  'barkaart.sync',
  'barkaart.auth',
  'barkaart.theme',
  'barkaart.units',
  'barkaart.analyticsOptOut',
  'barkaart.install.dismissed',
];

/** A Map-backed Storage that reports every write. */
class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  constructor(private readonly onWrite: (key: string) => void) {}
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  /** Put a value in place as if a previous visit had left it, without reporting a write. */
  seed(key: string, value: string): void {
    this.data.set(key, value);
  }
  setItem(key: string, value: string): void {
    this.onWrite(key);
    this.data.set(key, String(value));
  }
}

async function visit(url: string) {
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await harness.fixture.whenStable();
  harness.detectChanges();
  return harness;
}

describe('GuestMenu (/menu)', () => {
  let written: string[];
  let storage: MemoryStorage;
  let original: PropertyDescriptor | undefined;

  beforeEach(() => {
    // A fresh, observable localStorage per test. Installed explicitly rather than relying on the
    // test environment's own: newer Node versions shadow jsdom's with an inert global.
    written = [];
    storage = new MemoryStorage((key) => written.push(key));
    original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
    // The Dutch UI, as a Dutch guest would get it (the expectations below read Dutch strings).
    storage.seed('barkaart.locale', 'nl');
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({
      providers: [
        // The real route table: /menu must resolve outside Layout on its own.
        provideRouter(routes, withComponentInputBinding()),
        { provide: CocktailService, useValue: { getAll: () => of(COCKTAILS) } },
        { provide: IngredientService, useValue: { getAll: () => of(ING) } },
      ],
    });
  });

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('writes no cabinet, wizard or other personal key to localStorage', async () => {
    const harness = await visit('/menu?t=Zaterdag&m=gimlet,lime-fizz');
    expect(harness.routeNativeElement?.textContent).toContain('Gimlet');

    expect(storage.getItem('barkaart.cabinet')).toBeNull();
    expect(storage.getItem('barkaart.wizardDone')).toBeNull();
    for (const key of PERSONAL_KEYS) expect(storage.getItem(key)).toBeNull();
    // Only the language preference (LanguageService) may be stamped; nothing else.
    expect(written.filter((k) => k !== 'barkaart.locale')).toEqual([]);
  });

  it('renders outside Layout: no navbar, bottom nav or footer', async () => {
    const harness = await visit('/menu?m=gimlet');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-guest-menu')).not.toBeNull();
    expect(root.querySelector('app-layout')).toBeNull();
    expect(root.querySelector('app-navbar')).toBeNull();
    expect(root.querySelector('app-bottom-nav')).toBeNull();
  });

  it('lists sections in DRINK_FAMILIES order with names and ingredients, no amounts', async () => {
    const harness = await visit('/menu?m=lime-fizz,martini,gimlet,unknown-drink');
    const el = harness.routeNativeElement!;
    const sections = [...el.querySelectorAll('h2.fam')].map((h) => h.id);
    expect(sections).toEqual(['fam-sour', 'fam-spirit-forward', 'fam-fizz']);
    const names = [...el.querySelectorAll('.row .name')].map((n) => n.textContent?.trim());
    expect(names).toEqual(['Gimlet', 'Martini', 'Lime Fizz']);
    expect(el.querySelector('.row .ings')?.textContent).toBe('Gin, Limoen');
    expect(el.textContent).not.toMatch(/\d+\s*ml/);
  });

  it('shows the title as text, escaped and cut to 40 characters', async () => {
    const evil = encodeURIComponent('<img src=x onerror=alert(1)>' + 'x'.repeat(40));
    const harness = await visit(`/menu?t=${evil}&m=gimlet`);
    const el = harness.routeNativeElement!;
    expect(el.querySelector('img')).toBeNull();
    const h1 = el.querySelector('h1')!.textContent!;
    expect(h1.startsWith('<img src=x')).toBe(true);
    expect(Array.from(h1)).toHaveLength(40);
  });

  it('gives a tidy empty menu for an empty m', async () => {
    const harness = await visit('/menu?m=');
    const el = harness.routeNativeElement!;
    expect(el.querySelector('h1')?.textContent).toBe('Menukaart');
    expect(el.querySelector('.empty')).not.toBeNull();
    expect(el.querySelectorAll('.row')).toHaveLength(0);
  });

  it('filters to alcohol-free drinks with one chip', async () => {
    const harness = await visit('/menu?m=gimlet,lime-fizz');
    const el = harness.routeNativeElement!;
    expect(el.querySelectorAll('.row mat-icon.af')).toHaveLength(1);
    (el.querySelector('.chip') as HTMLButtonElement).click();
    harness.detectChanges();
    const names = [...el.querySelectorAll('.row .name')].map((n) => n.textContent?.trim());
    expect(names).toEqual(['Lime Fizz']);
  });

  it('opens the order card in the URL, so back closes it', async () => {
    const harness = await visit('/menu?m=gimlet');
    const root = harness.fixture.nativeElement as HTMLElement;
    (root.querySelector('.row') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.querySelector('.order .order-name')?.textContent).toBe('Gimlet');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/menu?m=gimlet&d=gimlet');
  });
});
