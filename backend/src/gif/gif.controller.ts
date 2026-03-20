import { Controller, Get, Query } from '@nestjs/common';

@Controller('gifs')
export class GifController {
  @Get('search')
  async search(@Query('q') q: string) {
    const key = process.env.GIPHY_API_KEY;
    if (!key || !q?.trim()) return { data: [] };
    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=20&rating=g`;
      const res = await fetch(url);
      const json = await res.json();
      return {
        data: (json.data ?? []).map((g: any) => ({
          id: g.id,
          preview: g.images?.fixed_height_small?.url ?? g.images?.preview_gif?.url ?? '',
          full: g.images?.downsized?.url ?? g.images?.fixed_height?.url ?? '',
        })),
      };
    } catch {
      return { data: [] };
    }
  }
}
