import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Catalog } from '@cocktailapp/shared';
import { CatalogService } from './catalog.service';
import { LanguageService } from '../core/language.service';

/**
 * `catalog$` re-emits whenever the language changes — deliberately, so lists and detail views
 * re-render in the new locale. Every read on this service inherits that, and for most of them it
 * is exactly right. For `randomCocktail` it was not: the caller navigates to whatever it emits, so
 * a language switch re-rolled the dice and threw the user at a different recipe.
 */
const CATALOG = {
  version: 'test',
  schemaVersion: 1,
  locale: 'en',
  counts: {},
  ingredients: [],
  cocktails: Array.from({ length: 40 }, (_, i) => ({
    id: 'c' + i,
    name: 'Cocktail ' + i,
    ingredients: [],
  })),
} as unknown as Catalog;

describe('CatalogService.randomCocktail', () => {
  let locale: ReturnType<typeof signal<'nl' | 'en'>>;

  beforeEach(() => {
    locale = signal<'nl' | 'en'>('en');
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: { get: () => of(CATALOG) } },
        {
          provide: LanguageService,
          useValue: { locale, t: () => ({ errors: { noCocktails: 'none' } }) },
        },
      ],
    });
  });

  it('emits once and completes — it is a request, not a stream', async () => {
    const service = TestBed.inject(CatalogService);
    const seen: string[] = [];
    let completed = false;

    await new Promise<void>((resolve) => {
      service.randomCocktail().subscribe({
        next: (c) => seen.push(c.id),
        complete: () => {
          completed = true;
          resolve();
        },
      });
    });

    expect(seen).toHaveLength(1);
    expect(completed).toBe(true);
  });

  it('does not emit again when the language changes', async () => {
    const service = TestBed.inject(CatalogService);
    const seen: string[] = [];

    await new Promise<void>((resolve) => {
      service.randomCocktail().subscribe({ next: (c) => seen.push(c.id), complete: () => resolve() });
    });
    expect(seen).toHaveLength(1);

    // The exact bug: "Surprise me" sends you to a drink, you switch language, and the still-live
    // subscription navigates you to a different one.
    locale.set('nl');
    await new Promise((r) => setTimeout(r, 0));
    locale.set('en');
    await new Promise((r) => setTimeout(r, 0));

    expect(seen, 'a language switch must not produce a second random cocktail').toHaveLength(1);
  });

  it('a list, by contrast, DOES re-emit on a language change', async () => {
    // The counterpart assertion, so a future "fix" cannot make take(1) the house style and
    // silently stop the catalog from re-translating.
    const service = TestBed.inject(CatalogService);
    let emissions = 0;
    const sub = service.listCocktails().subscribe(() => emissions++);
    await new Promise((r) => setTimeout(r, 0));
    expect(emissions).toBe(1);

    locale.set('nl');
    await new Promise((r) => setTimeout(r, 0));
    expect(emissions, 'lists must re-render in the new locale').toBe(2);
    sub.unsubscribe();
  });
});
