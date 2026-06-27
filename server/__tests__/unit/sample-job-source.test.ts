import { SampleJobSource } from '../../src/adapters/sample-job-source';
import { jobQuerySchema } from '../../src/domain/job';

const source = new SampleJobSource();

describe('SampleJobSource.search', () => {
  it('Search_NoFilters_ReturnsAll', async () => {
    const jobs = await source.search(jobQuerySchema.parse({}));
    expect(jobs.length).toBeGreaterThan(5);
  });

  it('Search_AllCountriesSentinel_DoesNotFilter', async () => {
    const jobs = await source.search(jobQuerySchema.parse({ country: 'Alle Länder' }));
    expect(jobs.length).toBeGreaterThan(5);
  });

  it('Search_ByCountry_FiltersExact', async () => {
    const jobs = await source.search(jobQuerySchema.parse({ country: 'Schweiz' }));
    expect(jobs.every((j) => j.country === 'Schweiz')).toBe(true);
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('Search_ByCity_FiltersCaseInsensitive', async () => {
    const jobs = await source.search(jobQuerySchema.parse({ city: 'berlin' }));
    expect(jobs.every((j) => j.city.toLowerCase().includes('berlin'))).toBe(true);
  });

  it('Search_ByKeyword_MatchesRoleCompanyOrSkill', async () => {
    const jobs = await source.search(jobQuerySchema.parse({ q: 'kubernetes' }));
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((j) => j.skills.map((s) => s.toLowerCase()).includes('kubernetes'))).toBe(
      true,
    );
  });
});
