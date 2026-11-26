/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { CocktailsService } from './cocktails.service';

/**
 * A Mongoose-doc stand-in whose `toJSON()` returns the shared Cocktail shape — exactly what the
 * service feeds into the SINGLE shared `computeMakeable` engine (the same one the clients use).
 */
function doc(json: any) {
  return { toJSON: () => json };
}

const GIN_TONIC = {
  id: 'gin-tonic',
  name: 'Gin & Tonic',
  ingredients: [
    { ingredientId: 'gin', name: 'Gin', amount: 5, unit: 'cl' },
    { ingredientId: 'tonic', name: 'Tonic', amount: 10, unit: 'cl' },
    { ingredientId: 'lime', name: 'Lime', unit: 'wedge', role: 'garnish' },
  ],
};

const OLD_FASHIONED = {
  id: 'old-fashioned',
  name: 'Old Fashioned',
  ingredients: [
    {
      ingredientId: 'bourbon',
      name: 'Bourbon',
      call: 'Bourbon or Rye Whiskey',
      amount: 45,
      unit: 'ml',
      alternativeIds: ['rye-whiskey'],
    },
    { ingredientId: 'sugar', name: 'Sugar', amount: 1, unit: 'cube' },
    { ingredientId: 'angostura-bitters', name: 'Angostura Bitters', unit: 'dash', optional: true },
  ],
};

const BLOODY = {
  id: 'bloody-mary',
  name: 'Bloody Mary',
  ingredients: [
    { ingredientId: 'vodka', name: 'Vodka', amount: 45, unit: 'ml' },
    { ingredientId: 'tomato-juice', name: 'Tomato Juice', amount: 90, unit: 'ml' },
    { ingredientId: 'tabasco', name: 'Tabasco', unit: 'dash', role: 'seasoning' },
  ],
};

const KIR = {
  id: 'kir',
  name: 'KIR',
  ingredients: [
    { ingredientId: 'white-wine', name: 'Dry White Wine', amount: 90, unit: 'ml' },
    { ingredientId: 'creme-de-cassis', name: 'Crème de Cassis', amount: 10, unit: 'ml' },
  ],
  variations: [
    {
      key: 'kir-royal',
      name: 'Kir Royal',
      swaps: [{ fromId: 'white-wine', toId: 'sparkling-wine' }],
    },
  ],
};

describe('CocktailsService', () => {
  let service: CocktailsService;
  let model: any;
  let ingredientsService: any;

  /** Make `find(...)` support both `.sort().exec()` (findAll) and `.exec()` (makeable). */
  function mockFind(docs: any[]) {
    model.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
      exec: jest.fn().mockResolvedValue(docs),
    });
  }

  beforeEach(() => {
    model = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };
    ingredientsService = { findAll: jest.fn().mockResolvedValue([]) };
    service = new CocktailsService(model, ingredientsService);
  });

  describe('findAll', () => {
    it('escapes regex metacharacters in the query so "(" cannot crash the DB', async () => {
      await service.findAll('(');
      const filter = model.find.mock.calls[0][0];
      expect(filter.name.$regex).toBe('\\(');
      expect(filter.name.$options).toBe('i');
    });

    it('does not add a name filter for an empty query', async () => {
      await service.findAll('   ');
      expect(model.find).toHaveBeenCalledWith({});
    });

    it('filters by tag when given', async () => {
      await service.findAll(undefined, 'zomer');
      expect(model.find).toHaveBeenCalledWith({ tags: 'zomer' });
    });
  });

  describe('makeable (shared engine, slug id space)', () => {
    it('returns fully-makeable cocktails for a matching cabinet; garnish lines never block', async () => {
      mockFind([doc(GIN_TONIC)]);
      const result = await service.makeable({
        availableIngredientIds: ['gin', 'tonic'], // no lime — but lime is a garnish
        maxMissing: 0,
      });
      expect(result).toHaveLength(1);
      expect(result[0].cocktail.id).toBe('gin-tonic');
      expect(result[0].missingCount).toBe(0);
    });

    it('treats optional lines as non-blocking and honours "X or Y" alternativeIds', async () => {
      mockFind([doc(OLD_FASHIONED)]);
      // Only rye + sugar in the cabinet: the bourbon line is satisfied via alternativeIds, and the
      // Angostura line is optional.
      const result = await service.makeable({
        availableIngredientIds: ['rye-whiskey', 'sugar'],
        maxMissing: 0,
      });
      expect(result).toHaveLength(1);
      expect(result[0].cocktail.id).toBe('old-fashioned');
    });

    it('never counts seasoning lines as missing', async () => {
      mockFind([doc(BLOODY)]);
      const result = await service.makeable({
        availableIngredientIds: ['vodka', 'tomato-juice'], // no tabasco (seasoning)
        maxMissing: 0,
      });
      expect(result.map((r) => r.cocktail.id)).toContain('bloody-mary');
    });

    it('surfaces "almost makeable" with the missing base id + name up to maxMissing', async () => {
      mockFind([doc(GIN_TONIC), doc(OLD_FASHIONED)]);
      const result = await service.makeable({
        availableIngredientIds: ['gin'], // Gin & Tonic missing tonic (1); Old Fashioned missing more
        maxMissing: 1,
      });
      const gt = result.find((r) => r.cocktail.id === 'gin-tonic')!;
      expect(gt.missingCount).toBe(1);
      expect(gt.missing).toEqual([{ ingredientId: 'tonic', name: 'Tonic' }]);
      // Old Fashioned is missing bourbon+sugar (2) > maxMissing, so it is excluded.
      expect(result.find((r) => r.cocktail.id === 'old-fashioned')).toBeUndefined();
    });

    it('returns a makeable variation as its own result, named from the ingredient list', async () => {
      mockFind([doc(KIR)]);
      ingredientsService.findAll.mockResolvedValue([
        doc({ id: 'sparkling-wine', name: 'Sparkling Wine' }),
      ]);
      const result = await service.makeable({
        availableIngredientIds: ['sparkling-wine', 'creme-de-cassis'],
        maxMissing: 0,
      });
      // The bubbles make the Kir Royal — and only that: the still Kir is not makeable from them.
      expect(result.map((r) => [r.cocktail.name, r.variation?.key])).toEqual([
        ['Kir Royal', 'kir-royal'],
      ]);
      expect(result[0].cocktail.id).toBe('kir');
      expect(result[0].cocktail.ingredients[0].name).toBe('Sparkling Wine');
    });
  });
});
