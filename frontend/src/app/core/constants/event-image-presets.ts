export interface EventImagePreset {
  category: string;
  label: string;
  url: string;
}

export const EVENT_IMAGE_PRESETS: EventImagePreset[] = [
  { category: 'Formation', label: 'Formation', url: 'events/Formation.jpg' },
  { category: 'Team building', label: 'Team building', url: 'events/Team-building.jpg' },
  { category: 'Conférence', label: 'Conférence', url: 'events/Conférence.jpg' },
  { category: 'Atelier', label: 'Atelier', url: 'events/Atelier.jpg' },
  { category: 'Webinaire', label: 'Webinaire', url: 'events/Webinaire.jpg' },
  { category: 'Afterwork', label: 'Afterwork', url: 'events/Afterwork.jpg' },
  { category: 'Bien-être', label: 'Bien-être', url: 'events/Bien-être.jpg' },
  { category: 'Sport', label: 'Sport', url: 'events/Sport.jpg' },
  { category: 'RSE', label: 'RSE', url: 'events/RSE.jpg' },
  { category: 'Networking', label: 'Networking', url: 'events/Networking.jpg' },
  { category: 'Culture d’entreprise', label: 'Culture d’entreprise', url: 'events/Culture-d’entreprise.jpg' },
  { category: 'Innovation', label: 'Innovation', url: 'events/Innovation.jpg' },
  { category: 'Team Lease Regtech', label: 'Innovation', url: 'events/Team-Lease-Regtech.jpg' }
];


export function getDefaultEventImage(category: string | null | undefined): string {
  const match = EVENT_IMAGE_PRESETS.find(item => item.category === category);
  return match?.url ?? 'events/autre.jpg';
}