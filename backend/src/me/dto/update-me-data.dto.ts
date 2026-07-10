import type { UpdateMeData } from '@cocktailapp/shared';
import { ArrayMaxSize, IsArray, IsString, Matches } from 'class-validator';

// Values are catalog ids (slugs from buildCatalog): lowercase alphanumerics + hyphens. Bounds are
// generous vs the ~152 ingredients / ~90 cocktails in the catalog but reject abusive/junk payloads.
const SLUG = /^[a-z0-9-]{1,120}$/;

/** The client's full working copy (server-authoritative once set). */
export class UpdateMeDataDto implements UpdateMeData {
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @Matches(SLUG, { each: true, message: 'cabinet bevat een ongeldig id' })
  cabinet: string[];

  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @Matches(SLUG, { each: true, message: 'favorites bevat een ongeldig id' })
  favorites: string[];
}
