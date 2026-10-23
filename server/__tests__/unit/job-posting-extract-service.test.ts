import { JobPostingExtractService } from '../../src/services/job-posting-extract-service.js';
import { LlmFeatureRunner } from '../../src/services/llm-feature-runner.js';
import { AiNotConfiguredError, UpstreamProviderError } from '../../src/domain/errors.js';
import {
  FakePageFetcher,
  FixedClock,
  InMemoryUsageMeter,
  InMemoryUserRepository,
  fakeLlmService,
  noopLogger,
} from '../support/fakes.js';

function makeService(opts: {
  available?: boolean;
  reply?: string | string[];
  failWith?: Error;
  pageFetcher?: FakePageFetcher;
}) {
  const { service: llmService, provider } = fakeLlmService({
    available: opts.available ?? true,
    reply:
      opts.reply ??
      '{"company":"Acme","title":"Engineer","location":"Berlin","country":"DE","requirements":["Rust"]}',
  });
  if (opts.failWith) provider.failWith = opts.failWith;
  const runner = new LlmFeatureRunner({
    llmService,
    userRepository: new InMemoryUserRepository(),
    usageMeter: new InMemoryUsageMeter(),
    clock: new FixedClock(),
    logger: noopLogger,
  });
  const service = new JobPostingExtractService({
    llmFeatureRunner: runner,
    pageFetcher: opts.pageFetcher ?? new FakePageFetcher({ text: 'Page text from URL.' }),
  });
  return { service, provider };
}

describe('JobPostingExtractService', () => {
  it('NoProvider_ThrowsAiNotConfiguredAndMakesNoCall', async () => {
    const { service, provider } = makeService({ available: false });
    await expect(service.fromText('user1', 'We hire C++ engineers.')).rejects.toBeInstanceOf(
      AiNotConfiguredError,
    );
    expect(provider.calls).toBe(0);
  });

  it('ProviderFails_ThrowsUpstreamProviderError', async () => {
    const { service } = makeService({ failWith: new Error('upstream down') });
    await expect(service.fromText('user1', 'We hire C++ engineers.')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('ReplyUnusableOrEmpty_ThrowsUpstreamProviderError', async () => {
    const { service } = makeService({
      reply: '{"company":"","title":"","location":"","country":"","requirements":[]}',
    });
    await expect(service.fromText('user1', 'We hire C++ engineers.')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('ValidText_ReturnsDraftFieldsWithDescription', async () => {
    const { service } = makeService({});
    const draft = await service.fromText('user1', 'We hire C++ engineers in Berlin.');
    expect(draft).toMatchObject({
      company: 'Acme',
      title: 'Engineer',
      location: 'Berlin',
      country: 'DE',
      requirements: ['Rust'],
      description: 'We hire C++ engineers in Berlin.',
      source: 'text',
    });
    // note #1: the draft's `url` key is omitted for text, never ''.
    expect('url' in draft).toBe(false);
  });

  it('FromUrl_FetchesPageThenExtracts', async () => {
    const { service } = makeService({
      pageFetcher: new FakePageFetcher({
        text: 'Page text from URL.',
        finalUrl: 'https://x.test/job',
      }),
    });
    const draft = await service.fromUrl('user1', 'https://x.test/');
    expect(draft).toMatchObject({
      company: 'Acme',
      title: 'Engineer',
      description: 'Page text from URL.',
      source: 'url',
      url: 'https://x.test/job',
    });
  });

  it('FromUrl_PageWithoutText_ThrowsNoText', async () => {
    const { service } = makeService({ pageFetcher: FakePageFetcher.noText() });
    await expect(service.fromUrl('user1', 'https://x.test/')).rejects.toMatchObject({
      type: 'no-text',
    });
  });

  it('FromUrl_SsrfBlocked_ThrowsSsrfBlocked', async () => {
    const { service } = makeService({ pageFetcher: FakePageFetcher.blocked() });
    await expect(service.fromUrl('user1', 'http://127.0.0.1/')).rejects.toMatchObject({
      type: 'ssrf-blocked',
    });
  });
});
