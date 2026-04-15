import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '../components/page-header';
import { Card, CardBody, CardHeader } from '../components/card';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { TimezoneSelect } from '../components/timezone-select';
import { useAuth } from '../lib/auth';
import { createLocation, listLocations } from '../lib/locations';
import { formatTimezoneDisplay } from '../lib/timezones';
import { createSkill, listSkills } from '../lib/skills';
import type { CityData } from 'city-timezones';
import * as cityTimezones from 'city-timezones';
import { Country } from 'country-state-city';

export const Route = createFileRoute('/admin')({
  component: AdminRoute,
});

export function AdminRoute() {
  const { session, status } = useAuth();
  const canFetch = status === 'ready';
  const queryClient = useQueryClient();
  const [newLocation, setNewLocation] = useState({
    name: '',
    city: '',
    region: '',
    country: '',
    timezone: '',
  });
  const [locationQuery, setLocationQuery] = useState('');
  const [showLocationMatches, setShowLocationMatches] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const formatRegion = (entry: CityData) =>
    entry.state_ansi || entry.exactProvince || entry.province || '';
  const formatCountry = (entry: CityData) => {
    if (entry.iso2) {
      const match = Country.getCountryByCode(entry.iso2);
      if (match?.name) return match.name;
    }
    return entry.country;
  };
  const formatLabel = (entry: CityData) => {
    const region = formatRegion(entry);
    return `${entry.city}${region ? `, ${region}` : ''}, ${formatCountry(entry)}`;
  };
  const locationMatches = useMemo(() => {
    const query = locationQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return cityTimezones
      .findFromCityStateProvince(query)
      .sort((a, b) => b.pop - a.pop)
      .slice(0, 12);
  }, [locationQuery]);
  const exactMatch = useMemo(
    () =>
      locationMatches.find(
        (entry) =>
          formatLabel(entry).toLowerCase() === locationQuery.toLowerCase(),
      ) ?? null,
    [locationMatches, locationQuery],
  );

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: ({ signal }) => listLocations({ signal }),
    enabled: canFetch,
  });
  const skillsQuery = useQuery({
    queryKey: ['skills'],
    queryFn: ({ signal }) => listSkills({ signal }),
    enabled: canFetch,
  });

  const createLocationMutation = useMutation({
    mutationFn: (input: {
      name: string;
      city?: string;
      region?: string;
      country?: string;
      timezone: string;
    }) => createLocation(input),
    onSuccess: () => {
      setNewLocation({
        name: '',
        city: '',
        region: '',
        country: '',
        timezone: '',
      });
      setLocationQuery('');
      void queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (error) => {
      console.error('Failed to create location', error);
      toast.error('Failed to create location');
    },
  });

  const createSkillMutation = useMutation({
    mutationFn: (input: { name: string }) => createSkill(input),
    onSuccess: () => {
      setNewSkill('');
      void queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: (error) => {
      console.error('Failed to create skill', error);
      toast.error('Failed to create skill');
    },
  });

  if (session?.user?.role !== 'admin') {
    return (
      <Card>
        <CardBody className="text-sm text-ink/60">
          Admin access required.
        </CardBody>
      </Card>
    );
  }

  const locations = locationsQuery.data ?? [];
  const skills = skillsQuery.data ?? [];
  const locationNameId = 'admin-location-name';
  const locationLibraryId = 'admin-location-library';
  const locationCityId = 'admin-location-city';
  const locationRegionId = 'admin-location-region';
  const locationCountryId = 'admin-location-country';
  const locationTimezoneId = 'admin-location-timezone';
  const skillNameId = 'admin-skill-name';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Location and skill setup"
        subtitle="Create and manage the scheduling catalogue used by managers."
      />

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Locations</h2>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-ink/70"
              >
                <p className="font-semibold text-ink">{location.name}</p>
                <p>{formatTimezoneDisplay(location.timezone)}</p>
                {location.city || location.country ? (
                  <p className="text-xs text-ink/50">
                    {[location.city, location.region, location.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label
                htmlFor={locationNameId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                Location name
              </label>
              <Input
                id={locationNameId}
                value={newLocation.name}
                onChange={(event) =>
                  setNewLocation((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Location name"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor={locationLibraryId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                Location library
              </label>
              <div className="relative">
                <Input
                  id={locationLibraryId}
                  value={locationQuery}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setLocationQuery(nextValue);
                    const normalizedQuery = nextValue.trim().toLowerCase();
                    const nextMatches =
                      normalizedQuery.length < 2
                        ? []
                        : cityTimezones
                            .findFromCityStateProvince(normalizedQuery)
                            .sort((a, b) => b.pop - a.pop)
                            .slice(0, 12);
                    const nextMatch = nextMatches.find(
                      (entry) =>
                        formatLabel(entry).toLowerCase() === normalizedQuery,
                    );
                    if (nextMatch) {
                      setNewLocation((prev) => ({
                        ...prev,
                        city: nextMatch.city,
                        region: formatRegion(nextMatch),
                        country: formatCountry(nextMatch),
                        timezone: nextMatch.timezone,
                      }));
                    } else {
                      setNewLocation((prev) => ({
                        ...prev,
                        city: '',
                        region: '',
                        country: '',
                        timezone: '',
                      }));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || !exactMatch) return;
                    event.preventDefault();
                    setLocationQuery(formatLabel(exactMatch));
                    setNewLocation((prev) => ({
                      ...prev,
                      city: exactMatch.city,
                      region: formatRegion(exactMatch),
                      country: formatCountry(exactMatch),
                      timezone: exactMatch.timezone,
                    }));
                    setShowLocationMatches(false);
                  }}
                  onFocus={() => setShowLocationMatches(true)}
                  onBlur={() => {
                    window.setTimeout(() => setShowLocationMatches(false), 120);
                  }}
                  placeholder="Location library (city, region, country)"
                  autoComplete="off"
                />
                {showLocationMatches && locationMatches.length ? (
                  <div className="absolute z-10 mt-2 w-full rounded-2xl border border-white/10 bg-sand p-2 shadow-soft">
                    {locationMatches.slice(0, 8).map((entry) => {
                      const label = formatLabel(entry);
                      return (
                        <button
                          key={`${entry.city}-${entry.iso2}-${entry.province}-${entry.timezone}`}
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-ink hover:bg-white/30"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setLocationQuery(label);
                            setNewLocation((prev) => ({
                              ...prev,
                              city: entry.city,
                              region: formatRegion(entry),
                              country: formatCountry(entry),
                              timezone: entry.timezone,
                            }));
                            setShowLocationMatches(false);
                          }}
                        >
                          <span>{label}</span>
                          <span className="text-xs text-ink/50">
                            {formatTimezoneDisplay(entry.timezone)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                City, region, country
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label htmlFor={locationCityId} className="sr-only">
                  City
                </label>
                <Input
                  id={locationCityId}
                  value={newLocation.city}
                  onChange={(event) =>
                    setNewLocation((prev) => ({
                      ...prev,
                      city: event.target.value,
                    }))
                  }
                  placeholder="City"
                  disabled
                  className="cursor-not-allowed"
                />
                <label htmlFor={locationRegionId} className="sr-only">
                  Region
                </label>
                <Input
                  id={locationRegionId}
                  value={newLocation.region}
                  onChange={(event) =>
                    setNewLocation((prev) => ({
                      ...prev,
                      region: event.target.value,
                    }))
                  }
                  placeholder="Region / State"
                  disabled
                  className="cursor-not-allowed"
                />
                <label htmlFor={locationCountryId} className="sr-only">
                  Country
                </label>
                <Input
                  id={locationCountryId}
                  value={newLocation.country}
                  onChange={(event) =>
                    setNewLocation((prev) => ({
                      ...prev,
                      country: event.target.value,
                    }))
                  }
                  placeholder="Country"
                  disabled
                  className="cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-xs text-ink/50">
              Filled from the location library selection.
            </p>
            <div className="space-y-2">
              <label
                htmlFor={locationTimezoneId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                Timezone
              </label>
              <TimezoneSelect
                id={locationTimezoneId}
                value={newLocation.timezone}
                onChange={(value) => {
                  const nextValue =
                    typeof value === 'string' ? value : value.target.value;
                  setNewLocation((prev) => ({
                    ...prev,
                    timezone: nextValue,
                  }));
                }}
              />
            </div>
            <Button
              onClick={() =>
                createLocationMutation.mutate({
                  name: newLocation.name.trim(),
                  city: newLocation.city || undefined,
                  region: newLocation.region || undefined,
                  country: newLocation.country || undefined,
                  timezone: newLocation.timezone,
                })
              }
              disabled={
                createLocationMutation.isPending ||
                !(newLocation.name || '').trim() ||
                !newLocation.timezone
              }
            >
              Add location
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Skills</h2>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="flex flex-wrap items-start gap-2">
            {skills.map((skill) => (
              <span
                key={skill.id}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink/70"
              >
                {skill.name}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label
                htmlFor={skillNameId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                Skill name
              </label>
              <Input
                id={skillNameId}
                value={newSkill}
                onChange={(event) => setNewSkill(event.target.value)}
                placeholder="Skill name"
              />
            </div>
            <Button
              onClick={() =>
                createSkillMutation.mutate({ name: newSkill.trim() })
              }
              disabled={
                createSkillMutation.isPending || !(newSkill || '').trim()
              }
            >
              Add skill
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
