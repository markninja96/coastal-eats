import { apiFetch } from './api';

export type Skill = {
  id: string;
  name: string;
};

export async function listSkills() {
  const response = await apiFetch<Skill[]>('/api/skills');
  return response ?? [];
}

export async function createSkill(input: { name: string }) {
  const response = await apiFetch<Skill>('/api/skills', {
    method: 'POST',
    body: input,
  });
  if (!response) throw new Error('Empty skill response');
  return response;
}
