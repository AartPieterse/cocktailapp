import { Controller, Get, Header, Headers, HttpCode, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * The whole catalog in one response, tagged with a strong ETag = the content version. Clients
   * cache it and send `If-None-Match`; an unchanged catalog returns 304 with no body, so a routine
   * refresh costs almost nothing. `Cache-Control` lets the browser/PWA revalidate.
   */
  @Get()
  @Header('Cache-Control', 'public, max-age=0, must-revalidate')
  @HttpCode(200)
  async getCatalog(
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = await this.catalogService.getCatalog();
    const etag = `"${payload.version}"`;

    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304);
      res.setHeader('ETag', etag);
      return undefined; // 304 Not Modified — no body.
    }

    res.setHeader('ETag', etag);
    return payload;
  }
}
