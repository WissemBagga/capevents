export interface EventImagePreset {
  category: string;
  label: string;
  url: string;
}

export const EVENT_IMAGE_PRESETS: EventImagePreset[] = [
  { category: 'Formation', label: 'Formation', url: 'images/events/Formation.jpg' },
  { category: 'Team building', label: 'Team building', url: 'images/events/Team-building.jpg' },
  { category: 'Conférence', label: 'Conférence', url: 'images/events/Conférence.jpg' },
  { category: 'Atelier', label: 'Atelier', url: 'images/events/Atelier.jpg' },
  { category: 'Webinaire', label: 'Webinaire', url: 'images/events/Webinaire.jpg' },
  { category: 'Afterwork', label: 'Afterwork', url: 'images/events/Afterwork.jpg' },
  { category: 'Bien-être', label: 'Bien-être', url: 'images/events/Bien-être.jpg' },
  { category: 'Sport', label: 'Sport', url: 'images/events/Sport.jpg' },
  { category: 'RSE', label: 'RSE', url: 'images/events/RSE.jpg' },
  { category: 'Networking', label: 'Networking', url: 'images/events/Networking.jpg' },
  { category: 'Culture d’entreprise', label: 'Culture d’entreprise', url: 'images/events/Culture-d’entreprise.jpg' },
  { category: 'Innovation', label: 'Innovation', url: 'images/events/Innovation.jpg' },
  { category: 'Team Lease Regtech', label: 'Innovation', url: 'images/events/Team-Lease-Regtech.jpg' }
];


export function getDefaultEventImage(category: string | null | undefined): string {
  const match = EVENT_IMAGE_PRESETS.find(item => item.category === category);
  return match?.url ?? 'images/events/autre.jpg';
}