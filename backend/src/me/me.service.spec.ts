/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Types } from 'mongoose';
import { MeService } from './me.service';

function execMock(value: unknown) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('MeService', () => {
  let service: MeService;
  let model: any;
  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    model = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn().mockReturnValue(execMock(undefined)),
    };
    service = new MeService(model);
  });

  it('returns empty sets (no doc created) before the first write', async () => {
    model.findOne.mockReturnValue(execMock(null));
    await expect(service.getData(userId)).resolves.toEqual({
      cabinet: [],
      favorites: [],
      updatedAt: undefined,
    });
  });

  it('returns stored data with an ISO updatedAt', async () => {
    const updated = new Date('2021-05-01T10:00:00.000Z');
    model.findOne.mockReturnValue(
      execMock({ cabinet: ['gin'], favorites: ['negroni'], get: () => updated }),
    );
    await expect(service.getData(userId)).resolves.toEqual({
      cabinet: ['gin'],
      favorites: ['negroni'],
      updatedAt: updated.toISOString(),
    });
  });

  it('queries scoped to the user id', async () => {
    model.findOne.mockReturnValue(execMock(null));
    await service.getData(userId);
    const filter = model.findOne.mock.calls[0][0];
    expect(String(filter.userId)).toBe(userId);
  });

  it('trims, de-duplicates and drops empty ids on write, upserting', async () => {
    model.findOneAndUpdate.mockReturnValue(
      execMock({ cabinet: ['gin', 'rum'], favorites: [], get: () => new Date() }),
    );
    await service.putData(userId, {
      cabinet: [' gin ', 'gin', 'rum', ''],
      favorites: [],
    });
    const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];
    expect(String(filter.userId)).toBe(userId);
    expect(update.$set.cabinet).toEqual(['gin', 'rum']);
    expect(update.$set.favorites).toEqual([]);
    expect(options).toMatchObject({ upsert: true, new: true });
  });

  it('deletes the user data document', async () => {
    await service.deleteForUser(userId);
    const filter = model.deleteOne.mock.calls[0][0];
    expect(String(filter.userId)).toBe(userId);
  });

  it('returns empty (no query) for a malformed user id instead of throwing', async () => {
    await expect(service.getData('not-an-object-id')).resolves.toEqual({
      cabinet: [],
      favorites: [],
      updatedAt: undefined,
    });
    expect(model.findOne).not.toHaveBeenCalled();
  });
});
