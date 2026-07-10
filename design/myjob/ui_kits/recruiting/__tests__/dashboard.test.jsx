/* The Übersicht dashboard is an agency view: it summarises the desk's pipeline,
   not the recruiter's own job hunt. Regression guard against the jobseeker
   framing ("your own applications (me)") that leaked in from the personal app. */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

let Dashboard;

beforeAll(async () => {
  await import('../use-viewport.jsx');
  await import('../Workspace.jsx');
  Dashboard = window.Dashboard;
});

const me = { id: 'me', name: 'Nora Kessler' };
const vkpis = [{ label: 'Active mandates', value: '1', icon: 'briefcase' }];
const apps = [
  { id: 'a1', company: 'Aurora Systems', role: 'C++ Engineer', talentName: 'Mara Vogel', status: 'interview' },
  { id: 'a2', company: 'Helio', role: 'Backend', talentName: 'Jonas Ott', status: 'new' },
];
const mandates = [{ id: 'm1', client: 'Aurora Systems', role: 'C++ Engineer', status: 'active' }];

describe('Dashboard — agency framing', () => {
  it('NextSteps_ShowsDeskInterviewOfferApps_NotOwnApplications', () => {
    render(
      <Dashboard me={me} apps={apps} vkpis={vkpis} clients={[]} mandates={mandates} onOpenTalent={() => {}} onOpenPipeline={() => {}} onOpenMandate={() => {}} />,
    );
    // The design-system stub renders a Card's title as a host `title` attribute.
    expect(screen.getByTitle('Applications to progress')).toBeInTheDocument();
    expect(screen.getByText('Mara Vogel')).toBeInTheDocument(); // interview-stage candidate, not "me"
    // The jobseeker framing must be gone.
    expect(screen.queryByTitle(/Own applications/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/your own applications/i)).not.toBeInTheDocument();
  });

  it('Greeting_CountsInterviewAndOfferApps', () => {
    render(
      <Dashboard me={me} apps={apps} vkpis={vkpis} clients={[]} mandates={mandates} onOpenTalent={() => {}} onOpenPipeline={() => {}} onOpenMandate={() => {}} />,
    );
    // 1 app is in interview, none in offer → "1 application in interview or offer".
    expect(screen.getByText(/1 application in interview or offer/)).toBeInTheDocument();
  });

  it('EmptyDesk_ShowsOnboardingWithFirstActions', () => {
    const onNav = vi.fn();
    render(
      <Dashboard me={me} apps={[]} vkpis={vkpis} clients={[]} mandates={[]} talentCount={0} onNav={onNav} onOpenTalent={() => {}} onOpenPipeline={() => {}} onOpenMandate={() => {}} />,
    );
    expect(screen.getByText('Get your desk started')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Create a mandate'));
    expect(onNav).toHaveBeenCalledWith('mandate');
  });

  it('DeskWithData_HidesOnboarding', () => {
    render(
      <Dashboard me={me} apps={apps} vkpis={vkpis} clients={[]} mandates={mandates} talentCount={2} onNav={() => {}} onOpenTalent={() => {}} onOpenPipeline={() => {}} onOpenMandate={() => {}} />,
    );
    expect(screen.queryByText('Get your desk started')).toBeNull();
  });
});
