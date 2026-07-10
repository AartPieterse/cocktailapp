/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { AnalyticsService } from './analytics.service';

function execMock(value: unknown) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let model: any;

  beforeEach(() => {
    model = {
      updateOne: jest.fn().mockReturnValue(execMock(undefined)),
      find: jest.fn(),
    };
    service = new AnalyticsService(model);
  });

  it('folds a batch into a single $inc upsert on today\'s bucket', async () => {
    await service.ingest([
      { type: 'cocktail_view', cocktailId: 'negroni' },
      { type: 'cocktail_view', cocktailId: 'negroni' },
      { type: 'cabinet_add', ingredientId: 'gin' },
    ]);
    expect(model.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update, options] = model.updateOne.mock.calls[0];
    expect(filter.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(update.$inc).toEqual({
      'events.cocktail_view': 2,
      'events.cabinet_add': 1,
      'cocktails.negroni': 2,
      'ingredients.gin': 1,
    });
    expect(options).toMatchObject({ upsert: true });
  });

  it('does nothing for an empty batch', async () => {
    await service.ingest([]);
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('merges daily buckets and ranks tallies desc', async () => {
    model.find.mockReturnValue(
      execMock([
        {
          events: { cocktail_view: 3, cabinet_add: 1 },
          cocktails: { negroni: 2, mojito: 1 },
          ingredients: { gin: 1 },
        },
        {
          events: { cocktail_view: 2 },
          cocktails: { mojito: 4 },
          ingredients: { gin: 2, rum: 5 },
        },
      ]),
    );
    const summary = await service.summary(7);
    expect(summary.days).toBe(7);
    expect(summary.totals).toEqual({ cocktail_view: 5, cabinet_add: 1 });
    expect(summary.topCocktails).toEqual([
      { id: 'mojito', count: 5 },
      { id: 'negroni', count: 2 },
    ]);
    // gin: 1 + 2 = 3; rum: 5 → rum ranks first.
    expect(summary.topIngredients).toEqual([
      { id: 'rum', count: 5 },
      { id: 'gin', count: 3 },
    ]);
  });
});
