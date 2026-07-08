/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Types } from 'mongoose';
import { CocktailsService } from './cocktails.service';

describe('CocktailsService', () => {
  let service: CocktailsService;
  let model: any;

  beforeEach(() => {
    model = {
      find: jest.fn().mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
      aggregate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    const ingredientsService = {} as any;
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

  describe('makeable', () => {
    it('maps aggregation docs into MakeableResult shape with string ids', async () => {
      const cid = new Types.ObjectId();
      const ingId = new Types.ObjectId();
      model.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: cid,
            name: 'Test',
            ingredients: [
              { ingredientId: ingId, name: 'Gin', amount: 5, unit: 'cl' },
            ],
            missing: [{ ingredientId: ingId, name: 'Gin' }],
            missingCount: 1,
            servings: 1,
          },
        ]),
      });

      const result = await service.makeable({
        availableIngredientIds: [],
        maxMissing: 1,
      });
      expect(result).toHaveLength(1);
      expect(result[0].cocktail.id).toBe(cid.toString());
      expect(result[0].cocktail.ingredients[0].ingredientId).toBe(
        ingId.toString(),
      );
      expect(result[0].missing).toEqual([
        { ingredientId: ingId.toString(), name: 'Gin' },
      ]);
      expect(result[0].missingCount).toBe(1);
    });

    it('ignores invalid ObjectIds in the available set', async () => {
      await service.makeable({
        availableIngredientIds: ['not-an-id'],
        maxMissing: 0,
      });
      expect(model.aggregate).toHaveBeenCalled();
    });
  });
});
