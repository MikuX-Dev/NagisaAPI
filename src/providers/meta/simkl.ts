import type { KyInstance } from "ky";
import { MetaBase } from "../base/meta";
import ky from "ky";
import type { AnilistMediaFormat, FribbAnime, ProviderEpisode, ProviderInfo } from "../../types/provider";
import { load } from "cheerio";
import type { RelationType } from "../../types/anime";

class Simkl extends MetaBase {
  override name: string = 'smikl';
  override url: string = 'https://simkl.com';

  public override client: KyInstance = ky.create({
    prefixUrl: this.url,
  });

  private parseDate(date: string | undefined) {
    if (!date) return { day: null, month: null, year: null, string: null };

    const [m, d, y] = date.split('/').map(Number);
    return {
      month: m ?? null,
      day: d ?? null,
      year: y ?? null,
      string: date,
    };
  }

  override async getInfo(anime: FribbAnime): Promise<ProviderInfo | undefined> {
    const smiklId = anime.simkl_id;

    if (!smiklId) return undefined;

    const data = await this.client.get(`anime/${smiklId.toString()}`).text();
    const $ = load(data);

    const title = $('h1.headDetail').text().trim()
    const coverImage =
      $('img#detailPosterImg').attr('src')
      && new URL($('img#detailPosterImg').attr('src')!, 'https://simkl.com')
      .href;

    let airDateText: string = '';
    $('td.SimklTVAboutTabsDetails table tbody tr').each((_, row) => {
      const label = $(row).find('td').first().text().replace(/\s+/g, ' ').trim();

      if (label.startsWith('Air Date')) {
        airDateText = $(row).find('td').eq(1).text().replace(/\s+/g, ' ').trim();
      }
    });
    const [startRaw, endRaw] = airDateText.split('-').map(s => s.trim());

    const descTd = $('td.SimklTVAboutDetailsText[itemprop="description"]').clone();
    descTd.find('#adDescText, #moreDescButton').remove();
    const more = descTd.find('#moreDesc').text();
    descTd.find('#moreDesc').remove();
    const base = descTd.text();
    const description = `${base} ${more}`
      .replace(/\s+/g, ' ')
      .trim() ?? null;

    return {
      titles: [
        {
          languageCode: 'english',
          title: title ?? null
        }
      ],
      coverImage: coverImage ?? null,
      studio: $('a.ajCompany')
        .map((_, el) => ({
          id: 0,
          name: $(el).text().trim() ?? null,
        }))
        .get(),
      ageRating: $('td[itemprop="contentRating"]').text().trim() ?? null,
      tags: $('a.tag.ajList')
        .map((_, el) => ({
          id: 0,
          name: $(el).text().trim() ?? null,
        }))
        .get(),
        airDate: {
          start: this.parseDate(startRaw),
          end: this.parseDate(endRaw)
        },
      synonyms: $('td[itemprop="alternateName"]')
        .text()
        .split(',')
        .map(s => s.trim())
        .filter(Boolean) ?? null,
      description,
      genres: $('td.SimklTVAboutGenre span.TagGenre')
        .map((_, el) => ({
          id: 0,
          name: $(el).text().trim(),
        }))
        .get(),
      countryOfOrigin: $('td.SimklTVAboutTabsDetails table tbody tr')
        .toArray()
        .map(tr => {
          const tds = $(tr).find('td');
          return tds.first().text().includes('Country')
            ? tds.eq(1).text().trim()
            : null;
        })
        .find(Boolean) ?? null,
      relations: $('div.tvdetailrelationsitems a')
        .map((_, el) => ({
          id: Number($(el).attr('href')?.match(/\/(\d+)\//)?.[1]) || 0,
          relationType: ([
            'PREQUEL',
            'SEQUEL',
            'ALTERNATIVE',
            'SIDE_STORY',
            'PARENT',
            'SPIN_OFF',
            'OTHER',
          ] as const).includes(
            $(el)
              .find('.tvdetailrelationsitemrighttype')
              .text()
              .trim()
              .toUpperCase()
              .replace(/\s+/g, '_') as RelationType
          )
            ? ($(el)
                .find('.tvdetailrelationsitemrighttype')
                .text()
                .trim()
                .toUpperCase()
                .replace(/\s+/g, '_') as RelationType)
            : null,
          titles: [{
              languageCode: 'english',
              title: $(el)
                .find('.tvdetailrelationsitemrighttitle')
                .text()
                .trim()
          }],
          format: $(el)
            .find('.tvdetailrelationsitemrightdetails div')
            .text()
            .split(',')[0]
            ?.trim()
            .toUpperCase() as AnilistMediaFormat
            ?? null,
          type: null
        }))
        .get(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  public async getEpisodes(
    anime: FribbAnime
  ): Promise<ProviderEpisode[] | undefined> {
    const smiklId = anime.simkl_id;
    if (!smiklId) return undefined;

    const finalUrl = await this.client
      .get(`anime/${smiklId}`)
      .then(res => res.url);

    const data = await this.client.get(`${finalUrl}/episodes`).text();
    const $ = load(data);

    const episodes: ProviderEpisode[] = $('div.SimklTVAboutTabsDetailsDiv')
      .map((index, el) => {
        const epNumber = index + 1;
        const titleText = $(el).find('.SimklTVEpisodesEpTitle').text().trim();
        const imgSrc = $(el).find('img').attr('data-original') || $(el).find('img').attr('src');
        const thumbnailImage = imgSrc ? new URL(imgSrc, 'https://simkl.com').href : null;

        return {
          id: `episode-${epNumber}`,
          titles: [{
            languageCode: 'english',
            title: titleText || ''
          }],
          thumbnailImage,
          number: epNumber,

          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      })
      .get();

    return episodes;
  }
}

export default Simkl;