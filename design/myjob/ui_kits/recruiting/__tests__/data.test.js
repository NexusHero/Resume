/* Pure-logic tests for the data layer's dashboard/report aggregates (ADR-0023).
   These need no DOM and no React — data.js publishes the helpers with
   `Object.assign(window, …)`, so the test imports the module for its side effect
   and reads the functions off `window`. This is the cheapest, highest-ROI shape
   of frontend test: deterministic domain logic with zero rendering. */
import { describe, it, expect, beforeAll } from 'vitest';

let computeVermittlerKpis;
let deriveReportClients;

beforeAll(async () => {
  await import('../data.js'); // side effect: Object.assign(window, { … })
  computeVermittlerKpis = window.computeVermittlerKpis;
  deriveReportClients = window.deriveReportClients;
});

describe('computeVermittlerKpis', () => {
  it('ComputeKpis_LiveRecords_CountsActiveMandatesPoolAndPlacements', () => {
    const mandates = [
      { status: 'active' },
      { status: 'active' },
      { status: 'archived' },
    ];
    const talents = [{}, {}, {}, {}];
    const placements = [{ fee: '12.000 €' }, { fee: '8000' }];

    const [active, pool, placed, fees] = computeVermittlerKpis(mandates, talents, placements);

    expect(active).toMatchObject({ label: 'Active mandates', value: '2' });
    expect(pool).toMatchObject({ label: 'Talents in pool', value: '4' });
    expect(placed).toMatchObject({ label: 'Placements', value: '2' });
    // 12000 + 8000 = 20000 → compact "20 T€"
    expect(fees).toMatchObject({ label: 'Fees', value: '20 T€' });
  });

  it('ComputeKpis_FeesBelowOneThousand_FormatsInEuroNotThousands', () => {
    const [, , , fees] = computeVermittlerKpis([], [], [{ fee: '540 €' }]);
    expect(fees.value).toBe('540 €');
  });

  it('ComputeKpis_NullInputs_ReturnsZeroedKpisWithoutThrowing', () => {
    const kpis = computeVermittlerKpis(null, null, null);
    expect(kpis.map((k) => k.value)).toEqual(['0', '0', '0', '0 €']);
  });
});

describe('deriveReportClients', () => {
  it('DeriveClients_MandatesAndPlacements_UnionsAndDedupesByName', () => {
    const mandates = [{ client: 'Helio GmbH' }, { client: 'Aurora Systems' }];
    const placements = [{ client: 'Helio GmbH' }, { client: 'Nimbus AG' }];

    const clients = deriveReportClients(mandates, placements).map((c) => c.name);

    expect(clients).toEqual(['Helio GmbH', 'Aurora Systems', 'Nimbus AG']);
  });

  it('DeriveClients_RowsWithoutClient_AreIgnored', () => {
    const clients = deriveReportClients([{ client: '' }, {}, { client: 'Helio GmbH' }], null);
    expect(clients).toEqual([{ name: 'Helio GmbH' }]);
  });

  it('DeriveClients_NullInputs_ReturnsEmpty', () => {
    expect(deriveReportClients(null, null)).toEqual([]);
  });
});
